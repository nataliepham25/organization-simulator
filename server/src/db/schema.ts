// Plain CREATE TABLE IF NOT EXISTS statements, not a versioned migration
// chain — the schema is small enough that idempotent DDL applied on every
// connection is simpler than tracking migration files, and safe to re-run.
// No imports here on purpose: connection.ts applies this directly, and
// migrate.ts (the standalone CLI entry point) also reads it — if this file
// imported connection.ts, that would be a circular dependency.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  founded_at TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  UNIQUE (org_id, sequence)
);
`;
