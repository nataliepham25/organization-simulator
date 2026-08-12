import express from "express";
import type { HealthCheckResponse } from "../../shared/src/types.js";
import { db } from "./db/connection.js";
import { handleGenerateTick, handleGetEvents } from "./routes/events.js";
import { handleGetOrgState } from "./routes/orgState.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  // Touch the db connection so the health check also verifies SQLite is reachable.
  db.prepare("SELECT 1").get();

  const body: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});

app.get("/api/events", handleGetEvents);
app.post("/api/events/generate-tick", handleGenerateTick);
app.get("/api/org-state", handleGetOrgState);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
