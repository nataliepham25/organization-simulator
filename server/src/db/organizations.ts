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
