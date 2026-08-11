import type {
  EmploymentType,
  NewEvent,
  Organization,
} from "../../../shared/src/types.js";
import { monthsBetween } from "./dates.js";
import { UNIQUE_ROLES } from "./constants.js";

export interface TeamState {
  id: string;
  name: string;
  parent_team_id: string | null;
}

export interface PersonState {
  id: string;
  name: string;
  role: string;
  team_id: string;
  employment_type: EmploymentType;
  manager_id: string | null;
  status: "active" | "left";
  // Months-since-founding when they took their current role — drives the
  // promotion-eligibility guardrail (MIN_MONTHS_IN_ROLE_BEFORE_PROMOTION).
  role_since_month: number;
}

export interface OrgState {
  org: Organization;
  location: string;
  teams: Map<string, TeamState>;
  people: Map<string, PersonState>;
}

export function initialState(org: Organization): OrgState {
  return {
    org,
    location: org.location,
    teams: new Map(),
    people: new Map(),
  };
}

// The single reducer that advances state by one event. Never mutates its
// input — always returns a new OrgState — so a caller can hold onto a prior
// snapshot (e.g. "state as of last month") without it changing underneath
// them. computeState() below is just this folded over a log; the tick
// generator uses the exact same function to keep its own working state in
// sync as it decides what to generate next.
export function applyEvent(state: OrgState, event: NewEvent): OrgState {
  const monthsSinceFounding = monthsBetween(
    state.org.founded_at,
    event.occurred_at,
  );

  switch (event.type) {
    case "OrgFounded":
      return { ...state, location: event.payload.location };

    case "OrgRelocated":
      return { ...state, location: event.payload.to };

    case "TeamCreated": {
      const teams = new Map(state.teams);
      teams.set(event.payload.team_id, {
        id: event.payload.team_id,
        name: event.payload.name,
        parent_team_id: event.payload.parent_team_id ?? null,
      });
      return { ...state, teams };
    }

    case "PersonJoined": {
      const people = new Map(state.people);
      people.set(event.payload.person_id, {
        id: event.payload.person_id,
        name: event.payload.name,
        role: event.payload.role,
        team_id: event.payload.team_id,
        employment_type: event.payload.employment_type,
        manager_id: null,
        status: "active",
        role_since_month: monthsSinceFounding,
      });
      return { ...state, people };
    }

    case "PersonLeft": {
      const existing = state.people.get(event.payload.person_id);
      if (!existing) return state;
      const people = new Map(state.people);
      people.set(existing.id, { ...existing, status: "left" });
      return { ...state, people };
    }

    case "PersonPromoted": {
      const existing = state.people.get(event.payload.person_id);
      if (!existing) return state;
      const people = new Map(state.people);
      people.set(existing.id, {
        ...existing,
        role: event.payload.new_role,
        role_since_month: monthsSinceFounding,
      });
      return { ...state, people };
    }

    case "TeamTransferred": {
      const existing = state.people.get(event.payload.person_id);
      if (!existing) return state;
      const people = new Map(state.people);
      people.set(existing.id, {
        ...existing,
        team_id: event.payload.to_team_id,
      });
      return { ...state, people };
    }

    case "ManagerChanged": {
      const existing = state.people.get(event.payload.person_id);
      if (!existing) return state;
      const people = new Map(state.people);
      people.set(existing.id, {
        ...existing,
        manager_id: event.payload.new_manager_id,
      });
      return { ...state, people };
    }
  }
}

export function computeState(
  org: Organization,
  events: readonly NewEvent[],
): OrgState {
  return events.reduce(applyEvent, initialState(org));
}

export function activePeople(state: OrgState): PersonState[] {
  return [...state.people.values()].filter((p) => p.status === "active");
}

// A role is available if it isn't a unique role at all, or no currently
// active person holds it. Checked before every hire and promotion.
export function isRoleAvailable(state: OrgState, role: string): boolean {
  if (!UNIQUE_ROLES.has(role)) return true;
  for (const person of state.people.values()) {
    if (person.status === "active" && person.role === role) return false;
  }
  return true;
}
