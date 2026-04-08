import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkloadLevel, getWorkloadThresholds } from "@/lib/settings";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role;
    if (!session.user.isSuperadmin && role !== "MANAGER" && role !== "DEVELOPER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const teamId = searchParams.get("teamId");
    const repoTeamId = searchParams.get("repoTeamId");
    const repositoryId = searchParams.get("repositoryId");
    const platform = searchParams.get("platform") || "all";
    const activeParam = searchParams.get("active");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
    const skip = (page - 1) * limit;

    const repoFilter = {
        ignored: false,
        ...(repositoryId ? { id: repositoryId } : {}),
        ...(platform !== "all"
            ? { platform: platform.toUpperCase() as "GITHUB" | "GITLAB" }
            : {}),
        ...(repoTeamId ? { teams: { some: { teamId: repoTeamId } } } : {}),
    };

    const memberWhere = {
        role: { not: "UNASSIGNED" as const },
        ...(teamId ? { teams: { some: { teamId } } } : {}),
        ...(activeParam !== null ? { isActive: activeParam === "true" } : {}),
    };

    const [total, members] = await Promise.all([
        prisma.teamMember.count({ where: memberWhere }),
        prisma.teamMember.findMany({
            where: memberWhere,
            include: {
                teams: { include: { team: { select: { id: true, name: true } } } },
            },
            orderBy: { name: "asc" },
            skip,
            take: limit,
        }),
    ]);

    const memberIds = members.map((m) => m.id);

    const [thresholds, loadCounts] = await Promise.all([
        getWorkloadThresholds(),
        prisma.issueAssignee.groupBy({
            by: ["teamMemberId"],
            where: {
                teamMemberId: { in: memberIds },
                issue: { state: "OPEN", repository: repoFilter },
            },
            _count: { issueId: true },
        }),
    ]);

    const loadMap = new Map(
        loadCounts.map((r) => [r.teamMemberId, r._count.issueId]),
    );

    const data = members.map((member) => {
        const currentLoad = loadMap.get(member.id) ?? 0;
        return {
            memberId: member.id,
            name: member.name,
            avatarUrl: member.avatarUrl,
            role: member.role,
            isActive: member.isActive,
            teams: member.teams.map((t) => t.team),
            currentLoad,
            workloadLevel: getWorkloadLevel(currentLoad, thresholds),
        };
    });

    return NextResponse.json({ total, data });
}
