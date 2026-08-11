import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_SQL } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "..", "data");
const dbPath = join(dataDir, "org-sim.sqlite");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Applied here, not left to callers to remember: other db/*.ts modules run
// `db.prepare(...)` on their own top-level statements at import time (before
// any application code like main() gets to run), so the schema has to exist
// the moment this module finishes loading, not just "eventually, once
// someone calls migrate()".
db.exec(SCHEMA_SQL);
