import type { Request, Response } from "express";
import { getEvents } from "../db/events.js";
import { getSingleOrganization } from "../db/organizations.js";
import { projectOrgState } from "../replay/projection.js";

const SEQUENCE_PATTERN = /^\d+$/;

// GET /api/org-state?asOf=<date> or ?upToSequence=<n> — org info, teams, and
// each team's currently-active people, replayed up to the given cutoff.
// upToSequence is exact (preferred by the UI scrubber, since several events
// can share a date and asOf can't tell them apart); asOf is date-based, for
// callers that only know a calendar date. Omitting both returns current
// state. The actual replay/shaping logic lives in replay/projection.ts —
// this handler just resolves "which org" and "which events", and
// translates bad input into a 400.
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

  const upToSequenceParam = req.query.upToSequence;
  let upToSequence: number | undefined;
  if (upToSequenceParam !== undefined) {
    if (typeof upToSequenceParam !== "string" || !SEQUENCE_PATTERN.test(upToSequenceParam)) {
      res
        .status(400)
        .json({ error: "`upToSequence` must be a non-negative integer sequence number." });
      return;
    }
    upToSequence = Number(upToSequenceParam);
  }

  const events = getEvents(org.id);

  try {
    const projection = projectOrgState(org, events, { asOf: asOfParam, upToSequence });
    res.json(projection);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
