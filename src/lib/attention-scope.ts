import type { Prisma } from "@prisma/client";

export function attentionScope(params: URLSearchParams, memberIds: string[], staleDays: number, now: Date): Prisma.IssueWhereInput {
  const platform = params.get("platform");
  const teamId = params.get("teamId");
  const repositoryId = params.get("repositoryId");
  const repoTeamId = params.get("repoTeamId");
  return {
    state: "OPEN",
    repository: {
      ignored: false,
      ...(repositoryId ? { id: repositoryId } : {}),
      ...(platform === "github" || platform === "gitlab" ? { platform: platform.toUpperCase() as "GITHUB" | "GITLAB" } : {}),
      ...(repoTeamId ? { teams: { some: { teamId: repoTeamId } } } : {}),
    },
    AND: [
      { OR: [
        { assignees: { some: { teamMemberId: { in: memberIds } } } },
        {
          assignees: { none: {} },
          ...(teamId ? { repository: { teams: { some: { teamId } } } } : {}),
          ...(params.get("name") || params.get("active") === "false" ? { creatorTeamMemberId: { in: memberIds } } : {}),
        },
      ] },
      { OR: [
        { createdAt: { lt: new Date(now.getTime() - staleDays * 86400000) } },
        { assignees: { none: {} } },
      ] },
    ],
  };
}
