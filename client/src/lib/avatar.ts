const PALETTE = ["#6B7A4F", "#B5602F", "#7C4A3A", "#8C6E4F", "#4F7A6B", "#A97B4F", "#5C6B8A"];

// Deterministic so the same person gets the same color across renders and
// across the two views, without storing a color anywhere.
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
