import { Riff } from "../types/riff";

export type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "duration-asc"
  | "duration-desc"
  | "bpm-asc"
  | "bpm-desc"
  | "favorites-first"
  | "tuning-asc"
  | "tuning-desc"
  | "key-asc"
  | "key-desc"
  | "energy-asc"
  | "energy-desc"
  | "genre-asc"
  | "genre-desc";

export function sortRiffs(riffs: Riff[], sortBy: SortOption): Riff[] {
  const sorted = [...riffs];

  sorted.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    switch (sortBy) {
      case "newest": return b.createdAt - a.createdAt;
      case "oldest": return a.createdAt - b.createdAt;
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "duration-asc": return a.duration - b.duration;
      case "duration-desc": return b.duration - a.duration;
      case "bpm-asc": {
        if (!a.bpm && !b.bpm) return 0;
        if (!a.bpm) return 1;
        if (!b.bpm) return -1;
        return a.bpm - b.bpm;
      }
      case "bpm-desc": {
        if (!a.bpm && !b.bpm) return 0;
        if (!a.bpm) return 1;
        if (!b.bpm) return -1;
        return b.bpm - a.bpm;
      }
      case "favorites-first": {
        if (a.favorite === b.favorite) return b.createdAt - a.createdAt;
        return a.favorite ? -1 : 1;
      }
      case "tuning-asc": return (a.tuning?.value || "").localeCompare(b.tuning?.value || "");
      case "tuning-desc": return (b.tuning?.value || "").localeCompare(a.tuning?.value || "");
      case "key-asc": {
        if (!a.detectedKey && !b.detectedKey) return 0;
        if (!a.detectedKey) return 1;
        if (!b.detectedKey) return -1;
        return a.detectedKey.localeCompare(b.detectedKey);
      }
      case "key-desc": {
        if (!a.detectedKey && !b.detectedKey) return 0;
        if (!a.detectedKey) return 1;
        if (!b.detectedKey) return -1;
        return b.detectedKey.localeCompare(a.detectedKey);
      }
      case "energy-desc": {
        const order = { high: 3, medium: 2, low: 1 };
        const ae = order[a.energyLevel || "low"] || 0;
        const be = order[b.energyLevel || "low"] || 0;
        return be - ae;
      }
      case "energy-asc": {
        const order = { high: 3, medium: 2, low: 1 };
        const ae = order[a.energyLevel || "low"] || 0;
        const be = order[b.energyLevel || "low"] || 0;
        return ae - be;
      }
      case "genre-asc": return (a.genre || "").localeCompare(b.genre || "");
      case "genre-desc": return (b.genre || "").localeCompare(a.genre || "");
      default: return 0;
    }
  });

  return sorted;
}

export function searchRiffs(riffs: Riff[], query: string): Riff[] {
  if (!query.trim()) return riffs;

  const lowerQuery = query.toLowerCase();
  return riffs.filter(
    (riff) =>
      riff.name.toLowerCase().includes(lowerQuery) ||
      riff.notes?.toLowerCase().includes(lowerQuery) ||
      riff.tuning?.value.toLowerCase().includes(lowerQuery) ||
      riff.tags?.some(t => t.toLowerCase().includes(lowerQuery)) ||
      riff.markers?.some(m => m.label.toLowerCase().includes(lowerQuery))
  );
}

// ---------------------------------------------------------------------------
// Smart Lists
// ---------------------------------------------------------------------------

/** Riffs with no project AND no tags — the "inbox" */
export function getInboxRiffs(riffs: Riff[]): Riff[] {
  return riffs.filter(r => !r.projectId && (!r.tags || r.tags.length === 0));
}

/** Riffs that have at least one marker */
export function getRiffsWithMarkers(riffs: Riff[]): Riff[] {
  return riffs.filter(r => r.markers && r.markers.length > 0);
}

/** Riffs marked as favorite within the last 7 days */
export function getFavoritesThisWeek(riffs: Riff[]): Riff[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return riffs.filter(r => r.favorite && r.createdAt >= weekAgo);
}

/** Riffs whose name matches the auto-generated default pattern */
export function getUnnamedRiffs(riffs: Riff[]): Riff[] {
  const defaultPattern = /^Ideia \d{2}\/\d{2}/;
  return riffs.filter(r => defaultPattern.test(r.name) || r.name === "Riff sem nome");
}

/** Calculate creative streak (consecutive days with at least one idea) */
export function calculateStreak(riffs: Riff[]): number {
  if (!riffs || riffs.length === 0) return 0;

  const dates = new Set(
    riffs.map(r => new Date(r.createdAt).toDateString())
  );

  let streak = 0;
  let currentDate = new Date();
  
  // If no riff today, check yesterday. If no riff yesterday either, streak is 0.
  if (!dates.has(currentDate.toDateString())) {
    currentDate.setDate(currentDate.getDate() - 1);
    if (!dates.has(currentDate.toDateString())) {
      return 0;
    }
  }

  // Count backwards
  while (dates.has(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

/** Get weekly progress array for the last 7 days */
export function getWeeklyProgress(riffs: Riff[]): { date: Date; count: number; label: string }[] {
  const progress = [];
  const today = new Date();
  
  const daysShort = ["D", "S", "T", "Q", "Q", "S", "S"];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    
    const count = riffs.filter(r => new Date(r.createdAt).toDateString() === dateStr).length;
    progress.push({ date: d, count, label: daysShort[d.getDay()] });
  }
  
  return progress;
}

