import { randomUUID } from "node:crypto";
import type { Organization } from "../../../shared/src/types.js";
import { db } from "./connection.js";

// organizations is a small anchor table, not derived from events — an org
// needs to exist before any event referencing it (events.org_id has a FK to
// this table) can be written, including the org's own OrgFounded event.

const insertStmt = db.prepare(`
  INSERT INTO organizations (id, name, founded_at, location)
  VALUES (@id, @name, @founded_at, @location)
`);

const selectByIdStmt = db.prepare(`SELECT * FROM organizations WHERE id = ?`);
const selectFirstStmt = db.prepare(
  `SELECT * FROM organizations ORDER BY rowid ASC LIMIT 1`,
);

export function createOrganization(input: {
  id?: string;
  name: string;
  founded_at: string;
  location: string;
}): Organization {
  const organization: Organization = {
    id: input.id ?? randomUUID(),
    name: input.name,
    founded_at: input.founded_at,
    location: input.location,
  };
  insertStmt.run(organization);
  return organization;
}

export function getOrganization(id: string): Organization | undefined {
  return selectByIdStmt.get(id) as Organization | undefined;
}

// This app deliberately has no multi-org support (see CLAUDE.md) — routes
// that need "the" org call this instead of taking an org_id from the
// request. Returns whichever org was created first if more than one
// somehow exists; in normal use there's exactly one.
export function getSingleOrganization(): Organization | undefined {
  return selectFirstStmt.get() as Organization | undefined;
}
