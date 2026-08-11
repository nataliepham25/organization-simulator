import type { Request, Response } from "express";
import { getEventsSince } from "../db/events.js";
import { getSingleOrganization } from "../db/organizations.js";

const SEQUENCE_PATTERN = /^\d+$/;

// GET /api/events?since=<sequence> — events with sequence greater than
// `since`, ordered by sequence. Omitting `since` returns the whole log.
export function handleGetEvents(req: Request, res: Response): void {
  const org = getSingleOrganization();
  if (!org) {
    res.status(404).json({ error: "No organization exists yet — run the seed script first." });
    return;
  }

  const sinceParam = req.query.since;
  let since: number | undefined;
  if (sinceParam !== undefined) {
    if (typeof sinceParam !== "string" || !SEQUENCE_PATTERN.test(sinceParam)) {
      res
        .status(400)
        .json({ error: "`since` must be a non-negative integer sequence number." });
      return;
    }
    since = Number(sinceParam);
  }

  const events = getEventsSince(org.id, since);
  res.json({ events });
}
