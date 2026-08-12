import type {
  Organization,
  OrgEvent,
  OrgStateProjection,
  OrgStateTeam,
} from "../../../shared/src/types.js";
import { computeState } from "./state.js";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Resolves an `asOf` value into an inclusive cutoff, in epoch ms. A
// date-only string ("2026-01-01") is treated as the END of that day, so
// "state as of Jan 1" includes everything that happened during Jan 1, not
// just up to the instant midnight begins. Throws on unparseable input —
// the caller (the route handler) is responsible for turning that into a
// 400, keeping this function pure.
export function resolveAsOfCutoff(asOf: string): number {
  const iso = DATE_ONLY_PATTERN.test(asOf) ? `${asOf}T23:59:59.999Z` : asOf;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) {
    throw new RangeError(`"${asOf}" is not a valid date`);
  }
  return ms;
}

export interface ProjectOrgStateOptions {
  // Exact cutoff — replays events with sequence <= this value. Use this
  // whenever the caller already knows a specific event (e.g. a UI scrubber
  // bound to real log entries): unlike asOf, it can't be ambiguous, since
  // sequence is unique per event and asOf's underlying date isn't (several
  // events can share a date). Wins over asOf if both are given.
  upToSequence?: number;
  // Date-based cutoff — replays events with occurred_at <= end of this day.
  asOf?: string;
}

// Pure projection: replays an org's event log up to a cutoff (by sequence or
// by date — see ProjectOrgStateOptions) and shapes the result for API
// consumption — org info, teams, and each team's currently-active people.
// No HTTP, no database access; takes events as plain data so it can be unit
// tested or reused (e.g. by the frontend, if events are ever fetched once
// and projected client-side) without a network round trip per projection.
export function projectOrgState(
  org: Organization,
  events: readonly OrgEvent[],
  options: ProjectOrgStateOptions = {},
): OrgStateProjection {
  let relevantEvents: readonly OrgEvent[] = events;
  if (options.upToSequence !== undefined) {
    const upToSequence = options.upToSequence;
    relevantEvents = events.filter((event) => event.sequence <= upToSequence);
  } else if (options.asOf !== undefined) {
    const cutoffMs = resolveAsOfCutoff(options.asOf);
    relevantEvents = events.filter(
      (event) => new Date(event.occurred_at).getTime() <= cutoffMs,
    );
  }

  const state = computeState(org, relevantEvents);

  const teams: OrgStateTeam[] = [...state.teams.values()].map((team) => ({
    id: team.id,
    name: team.name,
    parent_team_id: team.parent_team_id,
    people: [...state.people.values()]
      .filter((person) => person.status === "active" && person.team_id === team.id)
      .map((person) => ({
        id: person.id,
        name: person.name,
        role: person.role,
        employment_type: person.employment_type,
        manager_id: person.manager_id,
      })),
  }));

  const lastIncludedEvent = relevantEvents[relevantEvents.length - 1];
  const as_of = options.asOf ?? lastIncludedEvent?.occurred_at ?? new Date().toISOString();

  return {
    org: {
      id: org.id,
      name: org.name,
      founded_at: org.founded_at,
      location: state.location,
    },
    as_of,
    teams,
  };
}
