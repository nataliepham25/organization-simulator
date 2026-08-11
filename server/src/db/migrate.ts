import { db } from "./connection.js";
import { SCHEMA_SQL } from "./schema.js";

// Importing connection.js already applies SCHEMA_SQL (see the comment
// there), so calling this is normally redundant — it's here as an explicit,
// nameable step for cases that want to apply schema without booting the
// rest of the app, e.g. `npm run db:migrate` in CI or a fresh deploy.
export function migrate(): void {
  db.exec(SCHEMA_SQL);
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  migrate();
  console.log("Migration complete.");
}
