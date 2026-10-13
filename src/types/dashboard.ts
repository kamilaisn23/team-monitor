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
    resolvedLast7Days: number;
    distribution: Record<WorkloadLevel, number>;
  };
  thresholds: { lowMax: number; mediumMax: number; staleDays: number };
  attentionIssues: DashboardIssue[];
  teamOverview: {
    id: string;
    name: string;
    memberCount: number;
    assignments: number;
    highWorkload: number;
  }[];
}

export interface DashboardIssue {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  ageDays: number;
  repository: { id: string; name: string; platform: string };
  assignees: { memberId: string; name: string }[];
}

export interface DashboardIssueResponse {
  data: DashboardIssue[];
  total: number;
  page: number;
  limit: number;
}
