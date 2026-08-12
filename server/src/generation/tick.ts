import { randomUUID } from "node:crypto";
import type { NewEvent, Organization } from "../../../shared/src/types.js";
import { addMonths, monthsBetween } from "../replay/dates.js";
import { activePeople, applyEvent, type OrgState, type PersonState } from "../replay/state.js";
import {
  DEPARTURE_PROBABILITY_PER_PERSON_PER_MONTH,
  DEPARTURE_REASONS,
  EMPLOYMENT_TYPE_WEIGHTS,
  EXTRA_HIRE_PROBABILITY,
  FIRST_NAMES,
  HIRE_BASE_PROBABILITY,
  HIRE_GROWTH_MIDPOINT_MONTHS,
  HIRE_GROWTH_STEEPNESS,
  HIRE_MAX_PROBABILITY,
  LAST_NAMES,
  MAX_HIRES_PER_MONTH,
  MIN_MONTHS_IN_ROLE_BEFORE_PROMOTION,
  PROMOTION_LADDER,
  PROMOTION_PROBABILITY_PER_PERSON_PER_MONTH,
  TEAM_HIRE_WEIGHTS,
  TEAM_ROLE_CATALOG,
  TRANSFER_PROBABILITY_PER_PERSON_PER_MONTH,
  UNIQUE_ROLES,
} from "./constants.js";
import { chance, pick, pickWeighted, type Rng } from "./rng.js";

// A role is available if it isn't a unique role at all, or no currently
// active person holds it. This is a generation-time guardrail (the replay
// module doesn't need to know "unique role" is a concept), checked before
// every hire.
function isRoleAvailable(state: OrgState, role: string): boolean {
  if (!UNIQUE_ROLES.has(role)) return true;
  for (const person of state.people.values()) {
    if (person.status === "active" && person.role === role) return false;
  }
  return true;
}

export interface MonthContext {
  orgId: string;
  // The date generated events in this month get stamped with.
  occurredAt: string;
  monthsSinceFounding: number;
}

// Logistic growth curve — see constants.ts for what each term means.
function hireProbabilityForMonth(monthsSinceFounding: number): number {
  const logistic =
    1 /
    (1 +
      Math.exp(
        -HIRE_GROWTH_STEEPNESS *
          (monthsSinceFounding - HIRE_GROWTH_MIDPOINT_MONTHS),
      ));
  return (
    HIRE_BASE_PROBABILITY +
    (HIRE_MAX_PROBABILITY - HIRE_BASE_PROBABILITY) * logistic
  );
}

function randomName(rng: Rng): string {
  return `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`;
}

// Guardrail: only picks among teams that already exist in state, and only
// roles not currently locked by the unique-role guardrail.
function generateHire(
  state: OrgState,
  orgId: string,
  occurredAt: string,
  rng: Rng,
): NewEvent | null {
  const existingTeams = [...state.teams.values()];
  const weightedTeams = existingTeams
    .map((team) => ({ value: team, weight: TEAM_HIRE_WEIGHTS[team.name] ?? 0 }))
    .filter((entry) => entry.weight > 0);
  if (weightedTeams.length === 0) return null;

  const team = pickWeighted(weightedTeams, rng);
  const roles = TEAM_ROLE_CATALOG[team.name] ?? [];
  const availableRoles = roles.filter((role) => isRoleAvailable(state, role));
  if (availableRoles.length === 0) return null;

  const role = pick(availableRoles, rng);
  const employmentType = pickWeighted(EMPLOYMENT_TYPE_WEIGHTS, rng);

  return {
    org_id: orgId,
    type: "PersonJoined",
    occurred_at: occurredAt,
    payload: {
      person_id: randomUUID(),
      name: randomName(rng),
      role,
      team_id: team.id,
      employment_type: employmentType,
    },
  };
}

function generateDeparture(
  person: PersonState,
  orgId: string,
  occurredAt: string,
  rng: Rng,
): NewEvent {
  return {
    org_id: orgId,
    type: "PersonLeft",
    occurred_at: occurredAt,
    payload: { person_id: person.id, reason: pick(DEPARTURE_REASONS, rng) },
  };
}

// Guardrail: a role with no ladder entry has topped out and is never
// promoted further.
function generatePromotion(
  person: PersonState,
  orgId: string,
  occurredAt: string,
): NewEvent | null {
  const nextRole = PROMOTION_LADDER[person.role];
  if (!nextRole) return null;
  return {
    org_id: orgId,
    type: "PersonPromoted",
    occurred_at: occurredAt,
    payload: {
      person_id: person.id,
      old_role: person.role,
      new_role: nextRole,
    },
  };
}

function generateTransfer(
  person: PersonState,
  state: OrgState,
  orgId: string,
  occurredAt: string,
  rng: Rng,
): NewEvent | null {
  const otherTeams = [...state.teams.values()].filter(
    (team) => team.id !== person.team_id,
  );
  if (otherTeams.length === 0) return null;
  const destination = pick(otherTeams, rng);
  return {
    org_id: orgId,
    type: "TeamTransferred",
    occurred_at: occurredAt,
    payload: {
      person_id: person.id,
      from_team_id: person.team_id,
      to_team_id: destination.id,
    },
  };
}

// Advances one simulated month: rolls the growth-curve hire check, then one
// independent roll per active person for departure/promotion/transfer.
// Pure — does not mutate `state`; returns the events that would occur. The
// caller is expected to persist them and fold them into its own state via
// applyEvent, same as this function does internally to stay consistent
// within the month (e.g. so a departure this month excludes that person from
// also being promoted this month).
export function generateEventsForMonth(
  state: OrgState,
  ctx: MonthContext,
  rng: Rng,
): NewEvent[] {
  const events: NewEvent[] = [];
  let workingState = state;

  function record(event: NewEvent): void {
    events.push(event);
    workingState = applyEvent(workingState, event);
  }

  const hireProbability = hireProbabilityForMonth(ctx.monthsSinceFounding);
  if (chance(hireProbability, rng)) {
    let hiresThisMonth = 0;
    do {
      const hire = generateHire(workingState, ctx.orgId, ctx.occurredAt, rng);
      if (!hire) break; // guardrail: no eligible team/role to hire into
      record(hire);
      hiresThisMonth += 1;
    } while (
      hiresThisMonth < MAX_HIRES_PER_MONTH &&
      chance(EXTRA_HIRE_PROBABILITY, rng)
    );
  }

  for (const person of activePeople(workingState)) {
    if (chance(DEPARTURE_PROBABILITY_PER_PERSON_PER_MONTH, rng)) {
      record(generateDeparture(person, ctx.orgId, ctx.occurredAt, rng));
      continue; // guardrail: don't also promote/transfer someone who just left
    }

    const monthsInRole = ctx.monthsSinceFounding - person.role_since_month;
    if (
      monthsInRole >= MIN_MONTHS_IN_ROLE_BEFORE_PROMOTION &&
      chance(PROMOTION_PROBABILITY_PER_PERSON_PER_MONTH, rng)
    ) {
      const promotion = generatePromotion(person, ctx.orgId, ctx.occurredAt);
      if (promotion) record(promotion);
    } else if (chance(TRANSFER_PROBABILITY_PER_PERSON_PER_MONTH, rng)) {
      const transfer = generateTransfer(
        person,
        workingState,
        ctx.orgId,
        ctx.occurredAt,
        rng,
      );
      if (transfer) record(transfer);
    }
  }

  return events;
}
