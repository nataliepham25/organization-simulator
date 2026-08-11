import type { Rng } from "./rng.js";

// Whole calendar months between two ISO dates — the simulation clock moves
// in month-sized steps, so this (not raw millisecond math) is the unit
// hire-probability and promotion-eligibility are measured in.
export function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth())
  );
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1),
  ).toISOString();
}

// Picks a plausible day within a given month (1-28, side-stepping
// month-length edge cases) so generated events don't all fall on the 1st.
export function randomDayInMonth(monthStartIso: string, rng: Rng): string {
  const d = new Date(monthStartIso);
  const day = 1 + Math.floor(rng() * 28);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), day),
  ).toISOString();
}
