import { getEvents, insertEvent } from "../db/events.js";
import { getOrganization } from "../db/organizations.js";
import { addMonths, monthsBetween } from "../replay/dates.js";
import { activePeople, applyEvent, computeState } from "../replay/state.js";
import { createRng, type Rng } from "./rng.js";
import { generateEventsForMonth } from "./tick.js";

const DEFAULT_MONTHS_TO_SIMULATE = 24;
const DEFAULT_RNG_SEED = 20260811;

// Picks a plausible day within a given month (1-28, side-stepping
// month-length edge cases) so generated events don't all fall on the 1st.
function randomDayInMonth(monthStartIso: string, rng: Rng): string {
  const d = new Date(monthStartIso);
  const day = 1 + Math.floor(rng() * 28);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), day),
  ).toISOString();
}

function main(): void {
  const orgId = process.argv[2];
  if (!orgId) {
    console.error(
      "Usage: tsx src/generation/simulate.ts <org_id> [monthsToSimulate] [seed]",
    );
    process.exit(1);
  }

  const monthsToSimulate = Number(
    process.argv[3] ?? DEFAULT_MONTHS_TO_SIMULATE,
  );
  const seed = Number(process.argv[4] ?? DEFAULT_RNG_SEED);

  const org = getOrganization(orgId);
  if (!org) {
    console.error(`No organization with id ${orgId}`);
    process.exit(1);
  }

  const existingEvents = getEvents(orgId);
  if (existingEvents.length === 0) {
    console.error("No existing events — run the seed script first.");
    process.exit(1);
  }

  let state = computeState(org, existingEvents);
  const rng = createRng(seed);

  const lastEvent = existingEvents[existingEvents.length - 1]!;
  let cursor = addMonths(lastEvent.occurred_at, 1);

  let totalGenerated = 0;
  for (let i = 0; i < monthsToSimulate; i++) {
    const monthsSinceFounding = monthsBetween(org.founded_at, cursor);
    const occurredAt = randomDayInMonth(cursor, rng);

    const events = generateEventsForMonth(
      state,
      { orgId, occurredAt, monthsSinceFounding },
      rng,
    );

    for (const event of events) {
      insertEvent(event);
      state = applyEvent(state, event);
    }
    totalGenerated += events.length;

    console.log(`${cursor.slice(0, 7)}: ${events.length} event(s)`);
    cursor = addMonths(cursor, 1);
  }

  const headcount = activePeople(state);
  const byTeam = new Map<string, number>();
  for (const person of headcount) {
    const team = state.teams.get(person.team_id);
    const name = team?.name ?? "unknown";
    byTeam.set(name, (byTeam.get(name) ?? 0) + 1);
  }

  console.log(
    `\nGenerated ${totalGenerated} events over ${monthsToSimulate} simulated months.`,
  );
  console.log(`Active headcount: ${headcount.length}`);
  for (const [team, count] of byTeam) {
    console.log(`  ${team}: ${count}`);
  }
}

main();
