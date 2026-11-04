// Internal workload rebalance - DB-only. Never calls GitHub/GitLab APIs.

import { prisma } from "@/lib/prisma";

export type RebalanceResult = {
  movedIssueIds: string[];
  fromMember: { id: string; name: string };
  toMember: { id: string; name: string };
};

export async function executeRebalance(input: {
  fromMemberId: string;
  toMemberId: string;
  issueIds: string[];
  actorId: string | null;
  actorName: string;
}): Promise<RebalanceResult> {
  const { fromMemberId, toMemberId, issueIds, actorId, actorName } = input;

  const result = await prisma.$transaction(async (tx) => {
    const [fromMember, toMember] = await Promise.all([
      tx.teamMember.findFirst({ where: { id: fromMemberId }, select: { id: true, name: true, isActive: true, role: true } }),
      tx.teamMember.findFirst({ where: { id: toMemberId }, select: { id: true, name: true, isActive: true, role: true } }),
    ]);
    if (!fromMember || !toMember) throw Object.assign(new Error("Member not found"), { status: 409 });
    if (!toMember.isActive || toMember.role === "UNASSIGNED") throw Object.assign(new Error("Target member not available"), { status: 400 });

    // Only open, non-ignored issues currently assigned to `fromMember` in DB.
    const candidates = await tx.issue.findMany({
      where: {
        id: { in: issueIds },
        state: "OPEN",
        repository: { ignored: false },
        assignees: { some: { teamMemberId: fromMemberId } },
      },
      select: { id: true, title: true, platformId: true, repository: { select: { name: true } } },
    });

    if (candidates.length !== issueIds.length) {
      throw Object.assign(new Error("Some issues are not open or not assigned to source member"), { status: 409 });
    }

    const movedIssueIds: string[] = [];

    for (const issue of candidates) {
      // Replace source assignee with destination member in internal DB.
      // Preserve platformUsername if it matches source member's known username
      // so sync reconciliation can still map it; otherwise store synthetic key.
      const sourceAssignee = await tx.issueAssignee.findFirst({
        where: { issueId: issue.id, teamMemberId: fromMemberId },
      });

      // Keep the original platformUsername key so the next sync's
      // resolveUsernames() can map platform user → member for the destination.
      const platformUsername: string | undefined = sourceAssignee?.platformUsername;

      // If platformUsername already exists for this issue, re-point it to the
      // destination member. If not, use a synthetic internal key.
      if (platformUsername) {
        const existing = await tx.issueAssignee.findFirst({
          where: { issueId: issue.id, platformUsername },
        });
        if (existing) {
          await tx.issueAssignee.update({
            where: { id: existing.id },
            data: { teamMemberId: toMemberId },
          });
        } else {
          await tx.issueAssignee.create({
            data: { issueId: issue.id, platformUsername, teamMemberId: toMemberId },
          });
        }
      } else {
        const synthetic = `internal:${toMemberId}`;
        const existing = await tx.issueAssignee.findFirst({
          where: { issueId: issue.id, platformUsername: synthetic },
        });
        if (existing) {
          await tx.issueAssignee.update({ where: { id: existing.id }, data: { teamMemberId: toMemberId } });
        } else {
          await tx.issueAssignee.create({
            data: { issueId: issue.id, platformUsername: synthetic, teamMemberId: toMemberId },
          });
        }
      }

      // Source row was re-pointed to destination above when platform keys match;
      // if keys differ, delete the old source row.
      if (sourceAssignee && sourceAssignee.platformUsername !== platformUsername) {
        await tx.issueAssignee.delete({ where: { id: sourceAssignee.id } });
      }

      // Audit trail: record rebalance in FollowUpHistory (origin=rebalance).
      const revision = `${Date.now()}-${issue.id.slice(0, 8)}`;
      const note = `Redistribusi beban: ${fromMember.name} → ${toMember.name} (${issue.repository.name}).`;
      // Upsert followUp so history has parent row.
      const existingFollowUp = await tx.followUp.findUnique({ where: { issueId: issue.id } });
      if (existingFollowUp) {
        await tx.followUp.update({
          where: { issueId: issue.id },
          data: {
            note: existingFollowUp.note ? `${existingFollowUp.note}\n${note}` : note,
            actorId,
            actorName,
            revision,
            updatedAt: new Date(),
          },
        });
      } else {
        const created = await tx.followUp.create({
          data: {
            issueId: issue.id,
            status: "following_up",
            note,
            ownerId: toMemberId,
            ownerName: toMember.name,
            actorId,
            actorName,
            revision,
            updatedAt: new Date(),
          },
        });
        void created;
      }
      await tx.followUpHistory.create({
        data: {
          issueId: issue.id,
          revision,
          status: "following_up",
          note,
          ownerId: toMemberId,
          ownerName: toMember.name,
          actorId,
          actorName,
          changedAt: new Date(),
          origin: "rebalance",
        },
      });

      movedIssueIds.push(issue.id);
    }

    return { movedIssueIds, fromMember: { id: fromMember.id, name: fromMember.name }, toMember: { id: toMember.id, name: toMember.name } };
  });

  return result;
}
