import { Riff } from "../types/riff";

export function getCreativeStats(riffs: Riff[]) {
  const now = new Date();
  
  // Create a Date object for today at 00:00:00
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Calculate start of the week (assuming Monday as start of week, adjust to Sunday if needed)
  const dayOfWeek = now.getDay();
  // If today is Sunday (0), week started 6 days ago. Otherwise, current day - 1.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - daysSinceMonday);

  let todayCount = 0;
  let weekCount = 0;

  for (const riff of riffs) {
    const createdAt = new Date(riff.createdAt);
    if (createdAt >= todayStart) {
      todayCount++;
    }
    if (createdAt >= weekStart) {
      weekCount++;
    }
  }

  return { todayCount, weekCount };
}
