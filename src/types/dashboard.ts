export type WorkloadLevel = "low" | "medium" | "high";
export interface DashboardMember {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  teams: { id: string; name: string }[];
  currentLoad: number;
  workloadLevel: WorkloadLevel;
}
export interface DashboardResponse {
  total: number;
  data: DashboardMember[];
  summary: {
    memberCount: number;
    activeMembers: number;
    totalOpenIssues: number;
    highWorkload: number;
    staleIssues: number;
    distribution: Record<WorkloadLevel, number>;
  };
  thresholds: { lowMax: number; mediumMax: number; staleDays: number };
  teamOverview: {
    id: string;
    name: string;
    memberCount: number;
    assignments: number;
    highWorkload: number;
  }[];
}
