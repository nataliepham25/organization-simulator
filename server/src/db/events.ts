import type { NewEvent, OrgEvent } from "../../../shared/src/types.js";
import { db } from "./connection.js";

// This module is the only place that touches the `events` table. The event
// log is append-only and replay-driven (see CLAUDE.md) — every other part of
// the server should go through insertEvent/getEvents rather than writing SQL
// against `events` directly, so there is exactly one place that knows how a
// row gets written or read, and one place to enforce append-only-ness.

interface EventRow {
  id: number;
  org_id: string;
  sequence: number;
  type: string;
  occurred_at: string;
  payload: string;
}

function rowToEvent(row: EventRow): OrgEvent {
  return {
    id: row.id,
    org_id: row.org_id,
    sequence: row.sequence,
    type: row.type,
    occurred_at: row.occurred_at,
    payload: JSON.parse(row.payload),
  } as OrgEvent;
}

// `sequence` is computed in the same statement as the insert (MAX + 1,
// scoped to org_id) rather than in a separate SELECT beforehand. better-sqlite3
// is synchronous, so this one statement is the entire atomic unit — nothing
// else can interleave a write between reading the max and inserting. The
// UNIQUE(org_id, sequence) constraint in the schema is the backstop: if this
// query were ever wrong, the insert fails loudly instead of corrupting order.
const insertStmt = db.prepare(`
  INSERT INTO events (org_id, sequence, type, occurred_at, payload)
  VALUES (
    @org_id,
    COALESCE((SELECT MAX(sequence) FROM events WHERE org_id = @org_id), 0) + 1,
    @type,
    @occurred_at,
    @payload
  )
`);

const selectByRowIdStmt = db.prepare(`SELECT * FROM events WHERE id = ?`);

const selectByOrgStmt = db.prepare(
  `SELECT * FROM events WHERE org_id = ? ORDER BY sequence ASC`,
);

const selectByOrgUpToStmt = db.prepare(
  `SELECT * FROM events WHERE org_id = ? AND sequence <= ? ORDER BY sequence ASC`,
);

export function insertEvent(event: NewEvent): OrgEvent {
  const result = insertStmt.run({
    org_id: event.org_id,
    type: event.type,
    occurred_at: event.occurred_at,
    payload: JSON.stringify(event.payload),
  });
  const row = selectByRowIdStmt.get(result.lastInsertRowid) as EventRow;
  return rowToEvent(row);
}

// Reads back an org's event log in sequence order, optionally truncated to
// events up through a given sequence — the primitive computeState(events,
// upToSequence) will replay over in a later phase.
export function getEvents(orgId: string, upToSequence?: number): OrgEvent[] {
  const rows = (
    upToSequence === undefined
      ? selectByOrgStmt.all(orgId)
      : selectByOrgUpToStmt.all(orgId, upToSequence)
  ) as EventRow[];
  return rows.map(rowToEvent);
}
