import type {
  EmploymentType,
  NewEvent,
  Organization,
} from "../../../shared/src/types.js";
import { monthsBetween } from "./dates.js";

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
  // Months-since-founding when they took their current role — used by the
  // generator's promotion-eligibility guardrail.
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

// The single reducer that advances state by one event — the "single source
// of truth" CLAUDE.md calls for, used for current state, state as of a past
// date, and (in the generator) in-progress simulated state, all the same
// way. Never mutates its input — always returns a new OrgState — so a
// caller can hold onto a prior snapshot without it changing underneath them.
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
