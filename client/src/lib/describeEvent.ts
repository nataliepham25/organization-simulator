import type { OrgEvent } from "../../../shared/src/types.js";

export type EventCategory = "join" | "leave" | "change";

const CATEGORY_BY_TYPE: Record<OrgEvent["type"], EventCategory> = {
  OrgFounded: "join",
  TeamCreated: "join",
  PersonJoined: "join",
  PersonLeft: "leave",
  PersonPromoted: "change",
  OrgRelocated: "change",
  TeamTransferred: "change",
  ManagerChanged: "change",
};

export const CATEGORY_SYMBOL: Record<EventCategory, string> = {
  join: "+",
  leave: "–",
  change: "~",
};

export function categoryFor(event: OrgEvent): EventCategory {
  return CATEGORY_BY_TYPE[event.type];
}

export interface EventContext {
  personName(id: string): string;
  teamName(id: string): string;
}

// Event payloads reference people/teams by id, not name (that's what keeps
// the log small and normalized) — so turning an event into a readable
// sentence needs a name lookup. This builds that lookup from the same
// event array being displayed; it's a label for the log, not a
// recomputation of org state (who's currently active/on which team), so it
// doesn't cross the "don't re-derive state client-side" line.
export function buildEventContext(events: readonly OrgEvent[]): EventContext {
  const personNames = new Map<string, string>();
  const teamNames = new Map<string, string>();
  for (const event of events) {
    if (event.type === "PersonJoined") {
      personNames.set(event.payload.person_id, event.payload.name);
    }
    if (event.type === "TeamCreated") {
      teamNames.set(event.payload.team_id, event.payload.name);
    }
  }
  return {
    personName: (id) => personNames.get(id) ?? id,
    teamName: (id) => teamNames.get(id) ?? id,
  };
}

function employmentSuffix(type: string): string {
  return type === "full_time" ? "" : ` (${type.replace("_", "-")})`;
}

export function describeEvent(event: OrgEvent, ctx: EventContext): string {
  switch (event.type) {
    case "OrgFounded":
      return `${event.payload.founder_name} founded the company in ${event.payload.location}`;
    case "TeamCreated":
      return `${event.payload.name} team created`;
    case "PersonJoined":
      return `${event.payload.name} joined ${ctx.teamName(event.payload.team_id)} as ${event.payload.role}${employmentSuffix(event.payload.employment_type)}`;
    case "PersonLeft":
      return `${ctx.personName(event.payload.person_id)} left the company${event.payload.reason ? ` — ${event.payload.reason}` : ""}`;
    case "PersonPromoted":
      return `${ctx.personName(event.payload.person_id)} promoted: ${event.payload.old_role} → ${event.payload.new_role}`;
    case "OrgRelocated":
      return `Company relocated from ${event.payload.from} to ${event.payload.to}`;
    case "TeamTransferred":
      return `${ctx.personName(event.payload.person_id)} transferred from ${ctx.teamName(event.payload.from_team_id)} to ${ctx.teamName(event.payload.to_team_id)}`;
    case "ManagerChanged": {
      const newManager = event.payload.new_manager_id
        ? ctx.personName(event.payload.new_manager_id)
        : "no manager";
      return `${ctx.personName(event.payload.person_id)}'s manager changed to ${newManager}`;
    }
  }
}
