// A tiny seeded PRNG (mulberry32) instead of Math.random() throughout, so a
// simulation run is reproducible: same org + same seed always produces the
// same event log, which matters for debugging/demoing "constrained
// randomness" rather than pure randomness.
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return function mulberry32() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function chance(probability: number, rng: Rng): boolean {
  return rng() < probability;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) {
    throw new Error("pick() called with an empty array");
  }
  return item;
}

export function pickWeighted<T>(
  items: readonly { value: T; weight: number }[],
  rng: Rng,
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    if (roll < item.weight) return item.value;
    roll -= item.weight;
  }
  const last = items[items.length - 1];
  if (last === undefined) {
    throw new Error("pickWeighted() called with an empty array");
  }
  return last.value;
}
