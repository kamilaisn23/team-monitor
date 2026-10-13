import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkloadLevel, getWorkloadThresholds } from "@/lib/settings";
import { isAdminRole } from "@/lib/session";
import { dashboardIssue, dashboardIssueSelect } from "@/lib/dashboard-issues";

type SortCol = "name" | "role" | "currentLoad" | "workloadLevel";
type SortDir = "asc" | "desc";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role;
    if (
        !isAdminRole(session) &&
        role !== "MANAGER" &&
        role !== "DEVELOPER"
    ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const teamId = searchParams.get("teamId");
    const repoTeamId = searchParams.get("repoTeamId");
    const repositoryId = searchParams.get("repositoryId");
    const rawPlatform = searchParams.get("platform");
    const platform = rawPlatform === "github" || rawPlatform === "gitlab" ? rawPlatform : "all";
    const activeParam = searchParams.get("active");
    const nameFilter = searchParams.get("name");
    const rawPage = Number(searchParams.get("page"));
    const rawLimit = Number(searchParams.get("limit"));
    const page = Math.max(1, Number.isFinite(rawPage) ? Math.trunc(rawPage) || 1 : 1);
    const limit = Math.min(
        100,
        Math.max(1, Number.isFinite(rawLimit) ? Math.trunc(rawLimit) || 10 : 10),
    );
    const skip = (page - 1) * limit;
    const validSortCols: SortCol[] = ["name", "role", "currentLoad", "workloadLevel"];
    const rawSort = searchParams.get("sortCol") as SortCol;
    const sortCol = validSortCols.includes(rawSort) ? rawSort : "name";
    const sortDir: SortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
    const workload = searchParams.get("workload");

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
        ...(nameFilter
            ? { name: { contains: nameFilter, mode: "insensitive" as const } }
            : {}),
    };

    // Fetch all members without pagination so sorting applies across the full dataset
    const members = await prisma.teamMember.findMany({
        where: memberWhere,
        include: {
            teams: { include: { team: { select: { id: true, name: true } } } },
        },
        orderBy: { name: "asc" },
    });

    const memberIds = members.map((m) => m.id);
    const memberIdSet = new Set(memberIds);
    const now = new Date();
    const thresholds = await getWorkloadThresholds();
    const openIssueWhere = {
        state: "OPEN" as const,
        repository: repoFilter,
        assignees: { some: { teamMemberId: { in: memberIds } } },
    };
    const staleIssueWhere = {
        ...openIssueWhere,
        createdAt: { lt: new Date(now.getTime() - thresholds.staleDays * 86400000) },
    };
    const issueView = searchParams.get("issueView");
    if (issueView === "open" || issueView === "stale") {
        const rawIssuePage = Number(searchParams.get("issuePage"));
        const rawIssueLimit = Number(searchParams.get("issueLimit"));
        const issuePage = Math.max(1, Number.isFinite(rawIssuePage) ? Math.trunc(rawIssuePage) || 1 : 1);
        const issueLimit = Math.min(100, Math.max(1, Number.isFinite(rawIssueLimit) ? Math.trunc(rawIssueLimit) || 20 : 20));
        const where = issueView === "stale" ? staleIssueWhere : openIssueWhere;
        const [total, issues] = await Promise.all([
            prisma.issue.count({ where }),
            prisma.issue.findMany({
                where,
                select: dashboardIssueSelect,
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                skip: (issuePage - 1) * issueLimit,
                take: issueLimit,
            }),
        ]);
        return NextResponse.json({
            data: issues.map((issue) => dashboardIssue(issue, memberIdSet, now)),
            total, page: issuePage, limit: issueLimit,
        });
    }

    const loadCounts = await prisma.issueAssignee.groupBy({
            by: ["teamMemberId"],
            where: {
                teamMemberId: { in: memberIds },
                issue: { state: "OPEN", repository: repoFilter },
            },
            _count: { issueId: true },
        });

    const loadMap = new Map(
        loadCounts.map((r) => [r.teamMemberId, r._count.issueId]),
    );

    const workloadOrder: Record<string, number> = {
        low: 0,
        medium: 1,
        high: 2,
    };

    const allData = members.map((member) => {
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

    allData.sort((a, b) => {
        if (sortCol === "workloadLevel") {
            const av = workloadOrder[a.workloadLevel] ?? 0;
            const bv = workloadOrder[b.workloadLevel] ?? 0;
            return sortDir === "asc" ? av - bv : bv - av;
        }
        if (sortCol === "currentLoad") {
            return sortDir === "asc"
                ? a.currentLoad - b.currentLoad
                : b.currentLoad - a.currentLoad;
        }
        const av = a[sortCol];
        const bv = b[sortCol];
        return sortDir === "asc"
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
    });

    const [totalOpenIssues, staleIssues, resolvedLast7Days, attentionIssues] = await Promise.all([
        prisma.issue.count({ where: openIssueWhere }),
        prisma.issue.count({ where: staleIssueWhere }),
        prisma.issue.count({ where: {
            ...openIssueWhere,
            state: "CLOSED",
            closedAt: { gte: new Date(now.getTime() - 7 * 86400000), lte: now },
        } }),
        prisma.issue.findMany({
            where: staleIssueWhere,
            select: dashboardIssueSelect,
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 3,
        }),
    ]);
    const distribution = { low: 0, medium: 0, high: 0 };
    for (const member of allData) distribution[member.workloadLevel]++;
    const summary = {
        memberCount: allData.length,
        activeMembers: allData.filter((m) => m.isActive).length,
        totalOpenIssues,
        highWorkload: distribution.high,
        staleIssues,
        resolvedLast7Days,
        distribution,
    };
    const teamMap = new Map<string, { id: string; name: string; memberCount: number; assignments: number; highWorkload: number }>();
    for (const member of allData) {
        for (const team of member.teams) {
            const row = teamMap.get(team.id) ?? { ...team, memberCount: 0, assignments: 0, highWorkload: 0 };
            row.memberCount++;
            row.assignments += member.currentLoad;
            if (member.workloadLevel === "high") row.highWorkload++;
            teamMap.set(team.id, row);
        }
    }
    const filteredData = ["low", "medium", "high"].includes(workload ?? "")
        ? allData.filter((m) => m.workloadLevel === workload)
        : allData;
    const total = filteredData.length;
    const data = filteredData.slice(skip, skip + limit);
    return NextResponse.json({ total, data, summary, thresholds, attentionIssues: attentionIssues.map((issue) => dashboardIssue(issue, memberIdSet, now)), teamOverview: Array.from(teamMap.values()) });
}
