import type { DashboardTrends } from "../types/dashboard";

export const WEEK_MS = 7 * 86400000;

// Four adjacent rolling windows. Current assignments determine the member scope;
// these are creation/closure events, not reconstructed historical workload.
export function dashboardTrends(
  issues: { createdAt: Date; closedAt: Date | null }[],
  now: Date,
): DashboardTrends {
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const start = now.getTime() - (4 - index) * WEEK_MS;
    const end = start + WEEK_MS;
    const within = (date: Date | null) => date !== null &&
      date.getTime() >= start && (index === 3 ? date.getTime() <= end : date.getTime() < end);
    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      created: issues.filter((issue) => within(issue.createdAt)).length,
      resolved: issues.filter((issue) => within(issue.closedAt)).length,
    };
  });
  return {
    weeks,
    createdDelta: weeks[3]!.created - weeks[2]!.created,
    resolvedDelta: weeks[3]!.resolved - weeks[2]!.resolved,
  };
}
