import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/session";
import { getWorkloadThresholds } from "@/lib/settings";
import { dashboardIssue, dashboardIssueSelect } from "@/lib/dashboard-issues";
import { attentionScope } from "@/lib/attention-scope";
import { serializeFollowUp } from "@/lib/follow-up";
import { emptyFollowUp, followUpStatuses, type AttentionResponse, type FollowUpStatus } from "@/types/attention";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session) && session.user.role !== "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const params = req.nextUrl.searchParams;
  const teamId = params.get("teamId");
  const name = params.get("name");
  const active = params.get("active");
  const [members, owners, thresholds] = await Promise.all([
    prisma.teamMember.findMany({
      where: {
        role: { not: "UNASSIGNED" },
        ...(teamId ? { teams: { some: { teamId } } } : {}),
        ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
        ...(active !== null ? { isActive: active === "true" } : {}),
      }, select: { id: true },
    }),
    prisma.teamMember.findMany({ where: { isActive: true, role: { not: "UNASSIGNED" }, ...(teamId ? { teams: { some: { teamId } } } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getWorkloadThresholds(),
  ]);
  const now = new Date();
  const memberIds = members.map((member) => member.id);
  const reason = params.get("reason");
  const where = {
    ...attentionScope(params, memberIds, thresholds.staleDays, now),
    ...(reason === "stale" ? { createdAt: { lt: new Date(now.getTime() - thresholds.staleDays * 86400000) } } : {}),
    ...(reason === "unassigned" ? { assignees: { none: {} } } : {}),
  };
  // Read only candidate IDs before applying the shared review status and pagination.
  const candidates = await prisma.issue.findMany({ where, select: { id: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const rows = candidates.length ? await prisma.followUp.findMany({ where: { issueId: { in: candidates.map((issue) => issue.id) } } }) : [];
  const followUps = new Map(rows.map((row) => [row.issueId, serializeFollowUp(row)]));
  const counts = { unreviewed: 0, following_up: 0, reviewed: 0 };
  candidates.forEach((issue) => counts[(followUps.get(issue.id) ?? emptyFollowUp()).status]++);
  const status = params.get("status") as FollowUpStatus;
  const statusIds = candidates.filter((issue) => !followUpStatuses.includes(status) || (followUps.get(issue.id) ?? emptyFollowUp()).status === status).map((issue) => issue.id);
  const filteredWhere = {
    ...where,
    id: { in: statusIds },
  };
  const rawPage = Number(params.get("attentionPage"));
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage) || 1) : 1;
  const limit = 10;
  const [total, issues] = await Promise.all([
    prisma.issue.count({ where: filteredWhere }),
    prisma.issue.findMany({ where: filteredWhere, select: dashboardIssueSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }),
  ]);
  const response: AttentionResponse = {
    data: issues.map((issue) => ({
      ...dashboardIssue(issue, new Set(memberIds), now),
      reasons: [
        ...(issue.createdAt.getTime() < now.getTime() - thresholds.staleDays * 86400000 ? ["stale" as const] : []),
        ...(!issue.assignees.length ? ["unassigned" as const] : []),
      ],
      followUp: followUps.get(issue.id) ?? emptyFollowUp(),
    })),
    total, page, limit, counts, owners, staleDays: thresholds.staleDays,
  };
  return NextResponse.json(response);
}
