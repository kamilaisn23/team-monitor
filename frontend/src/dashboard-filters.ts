export interface DashboardFilters {
  teamId: string; name: string; active: string; workload: string; platform: string;
  repositoryId: string; sortCol: string; sortDir: string; view: string;
}
export interface SavedDashboardFilter { id: string; label: string; filters: DashboardFilters }
export function validSavedFilters(value: unknown): value is SavedDashboardFilter[] {
  return Array.isArray(value) && value.length <= 12 && value.every((item) => {
    if (!item || typeof item.id !== "string" || typeof item.label !== "string" || !item.label.trim() || item.label.length > 60 || !item.filters) return false;
    const f = item.filters;
    return [f.teamId, f.name, f.repositoryId].every((entry) => typeof entry === "string" && entry.length <= 200) &&
      ["true", "false", ""].includes(f.active) && ["all", "low", "medium", "high"].includes(f.workload) &&
      ["all", "github", "gitlab"].includes(f.platform) && ["name", "role", "currentLoad", "workloadLevel"].includes(f.sortCol) &&
      ["asc", "desc"].includes(f.sortDir) && ["list", "grid"].includes(f.view);
  });
}
