export type {
  DashboardMember,
  DashboardResponse,
  WorkloadLevel,
} from "../../src/types/dashboard";
export interface Team {
  id: string;
  name: string;
  memberCount?: number;
  isArchived?: boolean;
  kerjabaikProjectId?: string | null;
}
export interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  teams: Team[];
  usernameGithub?: string | null;
  usernameGitlab?: string | null;
  kerjabaikEmployeeId?: string | null;
}
export interface Repository {
  id: string;
  name: string;
  platform: string;
  teams: Team[];
  ignored: boolean;
  url?: string;
  discoveredAt?: string;
}
export interface Session {
  user: {
    id?: string;
    name?: string;
    image?: string;
    role: string;
    isSuperadmin: boolean;
  };
}
export interface Thresholds {
  lowMax: number;
  mediumMax: number;
  staleDays: number;
}
export interface ReportRow {
  memberId: string;
  name: string;
  role: string;
  teamIds?: string[];
  teamNames?: string[];
  issuesCreated: number;
  issuesAssigned: number;
  issuesResolved: number;
  issuesStillOpen: number;
}
export interface ReportTotals {
  issuesCreated: number;
  issuesAssigned: number;
  issuesResolved: number;
  issuesStillOpen: number;
}
export interface TeamGroup {
  teamId: string;
  teamName: string;
  members: ReportRow[];
  totals: ReportTotals;
}
export interface Issue {
  id: string;
  title: string;
  number: number;
  url: string;
  state: string;
  createdAt: string;
  closedAt: string | null;
  isStale: boolean;
  labels: string[];
  author?: { id: string; name: string } | null;
  repository: { name: string; platform: string };
  assignees?: { id: string; name: string }[];
}
export const roleLabels: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  DEVELOPER: "Developer",
  UNASSIGNED: "Belum ditentukan",
};
export const levelLabels = { low: "Ringan", medium: "Sedang", high: "Tinggi" };
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
