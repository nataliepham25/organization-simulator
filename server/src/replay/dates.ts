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
