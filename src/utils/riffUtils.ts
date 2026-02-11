import { Riff } from "../types/riff";

export type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "bpm-asc"
  | "bpm-desc";

export function sortRiffs(riffs: Riff[], sortBy: SortOption): Riff[] {
  const sorted = [...riffs];

  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case "oldest":
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case "name-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "name-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "bpm-asc":
      return sorted.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
    case "bpm-desc":
      return sorted.sort((a, b) => (b.bpm || 0) - (a.bpm || 0));
    default:
      return sorted;
  }
}

export function searchRiffs(riffs: Riff[], query: string): Riff[] {
  if (!query.trim()) return riffs;

  const lowerQuery = query.toLowerCase();
  return riffs.filter(
    (riff) =>
      riff.title.toLowerCase().includes(lowerQuery) ||
      riff.notes?.toLowerCase().includes(lowerQuery) ||
      riff.tuning?.value.toLowerCase().includes(lowerQuery),
  );
}
