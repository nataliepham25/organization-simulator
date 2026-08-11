// Types shared between server and client.

export interface HealthCheckResponse {
  status: "ok";
  timestamp: string;
}

export interface Organization {
  id: string;
  name: string;
  founded_at: string;
  location: string;
}

export type EmploymentType = "full_time" | "part_time" | "contractor";

// One interface per event type's payload shape, matching CLAUDE.md's data model.
export interface OrgFoundedPayload {
  founder_name: string;
  location: string;
}

export interface OrgRelocatedPayload {
  from: string;
  to: string;
}

export interface TeamCreatedPayload {
  team_id: string;
  name: string;
  parent_team_id?: string;
}

export interface PersonJoinedPayload {
  person_id: string;
  name: string;
  role: string;
  team_id: string;
  employment_type: EmploymentType;
}

export interface PersonLeftPayload {
  person_id: string;
  reason?: string;
}

export interface PersonPromotedPayload {
  person_id: string;
  old_role: string;
  new_role: string;
}

export interface TeamTransferredPayload {
  person_id: string;
  from_team_id: string;
  to_team_id: string;
}

export interface ManagerChangedPayload {
  person_id: string;
  old_manager_id: string | null;
  new_manager_id: string | null;
}

// Maps each event type name to its payload shape. Adding a new event type
// later means adding one payload interface and one entry here — everything
// downstream (NewEvent, OrgEvent, insertEvent's overload) follows from it.
export interface EventPayloadMap {
  OrgFounded: OrgFoundedPayload;
  OrgRelocated: OrgRelocatedPayload;
  TeamCreated: TeamCreatedPayload;
  PersonJoined: PersonJoinedPayload;
  PersonLeft: PersonLeftPayload;
  PersonPromoted: PersonPromotedPayload;
  TeamTransferred: TeamTransferredPayload;
  ManagerChanged: ManagerChangedPayload;
}

export type EventType = keyof EventPayloadMap;

// A row as it exists in the database: has an id and a sequence assigned.
// Discriminated on `type`, so narrowing on `type` narrows `payload` too.
export type OrgEvent = {
  [K in EventType]: {
    id: number;
    org_id: string;
    sequence: number;
    type: K;
    occurred_at: string;
    payload: EventPayloadMap[K];
  };
}[EventType];

// What callers provide to insert a new event — no id/sequence, since the
// database assigns both.
export type NewEvent = {
  [K in EventType]: {
    org_id: string;
    type: K;
    occurred_at: string;
    payload: EventPayloadMap[K];
  };
}[EventType];
