import type { DashboardIssue } from "../types/dashboard";

export const dashboardIssueSelect = {
  id: true,
  title: true,
  url: true,
  createdAt: true,
  repository: { select: { id: true, name: true, platform: true } },
  assignees: {
    select: { teamMember: { select: { id: true, name: true } } },
  },
} as const;

export function dashboardIssue(
  issue: {
    id: string;
    title: string;
    url: string;
    createdAt: Date;
    repository: { id: string; name: string; platform: string };
    assignees: { teamMember: { id: string; name: string } | null }[];
  },
  memberIds: Set<string>,
  now: Date,
): DashboardIssue {
  return {
    id: issue.id,
    title: issue.title,
    url: issue.url,
    createdAt: issue.createdAt.toISOString(),
    ageDays: Math.max(0, Math.floor((now.getTime() - issue.createdAt.getTime()) / 86400000)),
    repository: { ...issue.repository, platform: issue.repository.platform.toLowerCase() },
    assignees: issue.assignees.flatMap(({ teamMember }) =>
      teamMember && memberIds.has(teamMember.id)
        ? [{ memberId: teamMember.id, name: teamMember.name }]
        : [],
    ),
  };
}
