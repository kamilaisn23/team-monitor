import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireServiceToken } from "@/lib/service-auth"
import { getWorkloadThresholds, getWorkloadLevel } from "@/lib/settings"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ kerjabaikEmployeeId: string }> },
) {
    const authError = requireServiceToken(req)
    if (authError) return authError

    const { kerjabaikEmployeeId } = await params

    const member = await prisma.teamMember.findUnique({
        where: { kerjabaikEmployeeId },
        select: { id: true },
    })
    if (!member) {
        return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [openCount, closedLast30d, thresholds, latestCreated, latestClosed, latestAssigned] =
        await Promise.all([
            prisma.issueAssignee.count({
                where: { teamMemberId: member.id, issue: { state: "OPEN" } },
            }),
            prisma.issueAssignee.count({
                where: {
                    teamMemberId: member.id,
                    issue: { state: "CLOSED", closedAt: { gte: thirtyDaysAgo } },
                },
            }),
            getWorkloadThresholds(),
            prisma.issue.findFirst({
                where: { creatorTeamMemberId: member.id },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),
            prisma.issueAssignee.findFirst({
                where: { teamMemberId: member.id, issue: { closedAt: { not: null } } },
                orderBy: { issue: { closedAt: "desc" } },
                select: { issue: { select: { closedAt: true } } },
            }),
            prisma.issueAssignee.findFirst({
                where: { teamMemberId: member.id },
                orderBy: { issue: { createdAt: "desc" } },
                select: { issue: { select: { createdAt: true } } },
            }),
        ])

    const timestamps = [
        latestCreated?.createdAt,
        latestClosed?.issue.closedAt,
        latestAssigned?.issue.createdAt,
    ].filter((t): t is Date => t != null)

    const lastActiveAt =
        timestamps.length > 0
            ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
            : null

    return NextResponse.json({
        kerjabaik_employee_id: kerjabaikEmployeeId,
        team_member_id: member.id,
        open_issues: openCount,
        closed_last_30d: closedLast30d,
        workload_tier: getWorkloadLevel(openCount, thresholds),
        last_active_at: lastActiveAt?.toISOString() ?? null,
        as_of: new Date().toISOString(),
    })
}
