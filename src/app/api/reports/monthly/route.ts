import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseReportQuery } from "@/lib/report-query";
import { InputError } from "@/lib/input-validation";
import { canReadWorkspace, memberReadScope } from "@/lib/read-access";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canReadWorkspace(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query: ReturnType<typeof parseReportQuery>;
    try { query = parseReportQuery(req.nextUrl.searchParams); }
    catch (error) { return NextResponse.json({ error: error instanceof InputError ? error.message : "Invalid report parameters" }, { status: 400 }); }
    const { rangeLabel, start, end, repositoryId, teamId, nameFilter, platform, groupBy, skip, limit, sortCol, sortDir } = query;

    const repoFilter = {
        ignored: false,
        ...(repositoryId ? { id: repositoryId } : {}),
        ...(platform !== "all"
            ? { platform: platform.toUpperCase() as "GITHUB" | "GITLAB" }
            : {}),
    };

    const members = await prisma.teamMember.findMany({
        where: {
            ...memberReadScope(session),
            role: { not: "UNASSIGNED" },
            ...(teamId ? { teams: { some: { teamId } } } : {}),
            ...(nameFilter
                ? {
                      name: {
                          contains: nameFilter,
                          mode: "insensitive" as const,
                      },
                  }
                : {}),
        },
        include: {
            teams: { include: { team: { select: { id: true, name: true } } } },
        },
        orderBy: { name: "asc" },
    });

    const memberIds = members.map((m) => m.id);

    const [createdCounts, assignedCounts, resolvedCounts, stillOpenCounts] =
        await Promise.all([
            prisma.issue.groupBy({
                by: ["creatorTeamMemberId"],
                where: {
                    creatorTeamMemberId: { in: memberIds },
                    createdAt: { gte: start, lte: end },
                    repository: repoFilter,
                },
                _count: { id: true },
            }),
            prisma.issueAssignee.groupBy({
                by: ["teamMemberId"],
                where: {
                    teamMemberId: { in: memberIds },
                    issue: {
                        createdAt: { gte: start, lte: end },
                        repository: repoFilter,
                    },
                },
                _count: { issueId: true },
            }),
            prisma.issueAssignee.groupBy({
                by: ["teamMemberId"],
                where: {
                    teamMemberId: { in: memberIds },
                    issue: {
                        state: "CLOSED",
                        closedAt: { gte: start, lte: end },
                        repository: repoFilter,
                    },
                },
                _count: { issueId: true },
            }),
            prisma.issueAssignee.groupBy({
                by: ["teamMemberId"],
                where: {
                    teamMemberId: { in: memberIds },
                    issue: { state: "OPEN", repository: repoFilter },
                },
                _count: { issueId: true },
            }),
        ]);

    const createdMap = new Map(
        createdCounts.map((r) => [r.creatorTeamMemberId, r._count.id]),
    );
    const assignedMap = new Map(
        assignedCounts.map((r) => [r.teamMemberId, r._count.issueId]),
    );
    const resolvedMap = new Map(
        resolvedCounts.map((r) => [r.teamMemberId, r._count.issueId]),
    );
    const stillOpenMap = new Map(
        stillOpenCounts.map((r) => [r.teamMemberId, r._count.issueId]),
    );

    const allRows = members.map((member) => ({
        memberId: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        role: member.role,
        teamIds: member.teams.map((t) => t.team.id),
        teamNames: member.teams.map((t) => t.team.name),
        issuesCreated: createdMap.get(member.id) ?? 0,
        issuesAssigned: assignedMap.get(member.id) ?? 0,
        issuesResolved: resolvedMap.get(member.id) ?? 0,
        issuesStillOpen: stillOpenMap.get(member.id) ?? 0,
    }));

    if (groupBy === "team") {
        // Build team groups
        const teamMap = new Map<
            string,
            {
                teamId: string;
                teamName: string;
                members: typeof allRows;
                totals: {
                    issuesCreated: number;
                    issuesAssigned: number;
                    issuesResolved: number;
                    issuesStillOpen: number;
                };
            }
        >();

        for (const row of allRows) {
            const teamEntries =
                row.teamIds.length > 0
                    ? row.teamIds.map((id, i) => ({
                          id,
                          name: row.teamNames[i] ?? "",
                      })).filter(team => !teamId || team.id === teamId)
                    : teamId ? [] : [{ id: "__none__", name: "(No Team)" }];

            for (const team of teamEntries) {
                if (!teamMap.has(team.id)) {
                    teamMap.set(team.id, {
                        teamId: team.id,
                        teamName: team.name,
                        members: [],
                        totals: {
                            issuesCreated: 0,
                            issuesAssigned: 0,
                            issuesResolved: 0,
                            issuesStillOpen: 0,
                        },
                    });
                }
                const entry = teamMap.get(team.id)!;
                entry.members.push(row);
                entry.totals.issuesCreated += row.issuesCreated;
                entry.totals.issuesAssigned += row.issuesAssigned;
                entry.totals.issuesResolved += row.issuesResolved;
                entry.totals.issuesStillOpen += row.issuesStillOpen;
            }
        }

        const groups = Array.from(teamMap.values()).sort((a, b) => {
            if (a.teamId === "__none__") return 1;
            if (b.teamId === "__none__") return -1;
            return a.teamName.localeCompare(b.teamName);
        });

        return NextResponse.json({ month: rangeLabel, groups });
    }

    // Default: flat member view
    const totals = allRows.reduce(
        (acc, row) => ({
            issuesCreated: acc.issuesCreated + row.issuesCreated,
            issuesAssigned: acc.issuesAssigned + row.issuesAssigned,
            issuesResolved: acc.issuesResolved + row.issuesResolved,
            issuesStillOpen: acc.issuesStillOpen + row.issuesStillOpen,
        }),
        {
            issuesCreated: 0,
            issuesAssigned: 0,
            issuesResolved: 0,
            issuesStillOpen: 0,
        },
    );

    allRows.sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        if (typeof av === "number" && typeof bv === "number") {
            return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
    });

    const data = allRows.slice(skip, skip + limit);

    return NextResponse.json({
        month: rangeLabel,
        total: members.length,
        totals,
        data,
    });
}
