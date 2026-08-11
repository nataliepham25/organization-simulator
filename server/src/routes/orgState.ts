import type { Request, Response } from "express";
import { getEvents } from "../db/events.js";
import { getSingleOrganization } from "../db/organizations.js";
import { projectOrgState } from "../replay/projection.js";

// GET /api/org-state?asOf=<date> — org info, teams, and each team's
// currently-active people, replayed as of the given date. Omitting `asOf`
// returns current state (replays the full log). The actual replay/shaping
// logic lives in replay/projection.ts — this handler just resolves "which
// org" and "which events", and translates bad input into a 400.
export function handleGetOrgState(req: Request, res: Response): void {
  const org = getSingleOrganization();
  if (!org) {
    res.status(404).json({ error: "No organization exists yet — run the seed script first." });
    return;
  }

  const asOfParam = req.query.asOf;
  if (asOfParam !== undefined && typeof asOfParam !== "string") {
    res.status(400).json({ error: "`asOf` must be a single date string." });
    return;
  }

  const events = getEvents(org.id);

  try {
    const projection = projectOrgState(org, events, asOfParam);
    res.json(projection);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
