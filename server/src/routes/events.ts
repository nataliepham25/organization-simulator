import type { Request, Response } from "express";
import type { EventsResponse } from "../../../shared/src/types.js";
import { getEvents, getEventsSince, insertEvent } from "../db/events.js";
import {
  getNextTickMonth,
  getSingleOrganization,
  setNextTickMonth,
} from "../db/organizations.js";
import { GENERATE_TICK_SEED } from "../generation/constants.js";
import { createRng } from "../generation/rng.js";
import { runTick } from "../generation/tick.js";
import { addMonths, monthsBetween } from "../replay/dates.js";
import { computeState } from "../replay/state.js";

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
  const body: EventsResponse = { events };
  res.json(body);
}

// POST /api/events/generate-tick — generates and persists exactly one more
// simulated month for the org, picking up wherever its log currently ends.
// This is the same operation simulate.ts's loop performs on each iteration
// (both call runTick — see generation/tick.ts), just triggered once via the
// UI instead of N times via the CLI. Responds with only the events this
// call created, not the whole log.
export function handleGenerateTick(_req: Request, res: Response): void {
  const org = getSingleOrganization();
  if (!org) {
    res.status(404).json({ error: "No organization exists yet — run the seed script first." });
    return;
  }

  const existingEvents = getEvents(org.id);
  const lastEvent = existingEvents[existingEvents.length - 1];
  if (!lastEvent) {
    res.status(400).json({ error: "No existing events — seed the organization first." });
    return;
  }

  const state = computeState(org, existingEvents);
  // The next month to simulate is tracked independently of the event log
  // (see next_tick_month in schema.ts) — a month that generates zero events
  // still has to advance the cursor, or every later click re-rolls that same
  // empty month with the same seed forever. Falls back to "one month after
  // the last event" only the very first time this org is ever ticked.
  const cursor = getNextTickMonth(org.id) ?? addMonths(lastEvent.occurred_at, 1);
  const monthsSinceFounding = monthsBetween(org.founded_at, cursor);
  const rng = createRng(GENERATE_TICK_SEED + monthsSinceFounding);

  const newEvents = runTick(org, state, cursor, rng);
  const inserted = newEvents.map((event) => insertEvent(event));
  setNextTickMonth(org.id, addMonths(cursor, 1));

  const body: EventsResponse = { events: inserted };
  res.status(201).json(body);
}
