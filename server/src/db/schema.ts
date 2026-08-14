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
  location TEXT NOT NULL,
  -- Scheduler bookkeeping for POST /api/events/generate-tick: which
  -- simulated month to generate next. NOT part of the org domain model
  -- (see CLAUDE.md) — it never feeds computeState() and holds no org fact,
  -- just "where the generator left off," so a month that rolls zero events
  -- still advances it instead of the next click re-rolling the same month.
  next_tick_month TEXT
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
