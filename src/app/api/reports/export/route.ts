import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseReportQuery } from '@/lib/report-query'
import { InputError } from '@/lib/input-validation'
import { canReadWorkspace, memberReadScope } from '@/lib/read-access'
import { serializeCsv } from '@/lib/csv'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canReadWorkspace(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query: ReturnType<typeof parseReportQuery>
  try { query = parseReportQuery(req.nextUrl.searchParams) }
  catch (error) { return NextResponse.json({ error: error instanceof InputError ? error.message : 'Invalid report parameters' }, { status: 400 }) }
  const { start, end, rangeLabel, repositoryId, teamId, nameFilter, platform } = query

  const repoFilter = {
    ignored: false,
    ...(repositoryId ? { id: repositoryId } : {}),
    ...(platform !== 'all' ? { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB' } : {}),
  }

  const members = await prisma.teamMember.findMany({
    where: {
      ...memberReadScope(session),
      role: { not: 'UNASSIGNED' },
      ...(teamId ? { teams: { some: { teamId } } } : {}),
      ...(nameFilter ? { name: { contains: nameFilter, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { name: 'asc' },
  })

  const memberIds = members.map((m) => m.id)

  const [createdCounts, assignedCounts, resolvedCounts, stillOpenCounts] = await Promise.all([
    prisma.issue.groupBy({
      by: ['creatorTeamMemberId'],
      where: { creatorTeamMemberId: { in: memberIds }, createdAt: { gte: start, lte: end }, repository: repoFilter },
      _count: { id: true },
    }),
    prisma.issueAssignee.groupBy({
      by: ['teamMemberId'],
      where: { teamMemberId: { in: memberIds }, issue: { createdAt: { gte: start, lte: end }, repository: repoFilter } },
      _count: { issueId: true },
    }),
    prisma.issueAssignee.groupBy({
      by: ['teamMemberId'],
      where: { teamMemberId: { in: memberIds }, issue: { state: 'CLOSED', closedAt: { gte: start, lte: end }, repository: repoFilter } },
      _count: { issueId: true },
    }),
    prisma.issueAssignee.groupBy({
      by: ['teamMemberId'],
      where: { teamMemberId: { in: memberIds }, issue: { state: 'OPEN', repository: repoFilter } },
      _count: { issueId: true },
    }),
  ])

  const createdMap = new Map(createdCounts.map((r) => [r.creatorTeamMemberId, r._count.id]))
  const assignedMap = new Map(assignedCounts.map((r) => [r.teamMemberId, r._count.issueId]))
  const resolvedMap = new Map(resolvedCounts.map((r) => [r.teamMemberId, r._count.issueId]))
  const stillOpenMap = new Map(stillOpenCounts.map((r) => [r.teamMemberId, r._count.issueId]))

  const rows = members.map((member) => [
    member.name,
    member.role,
    createdMap.get(member.id) ?? 0,
    assignedMap.get(member.id) ?? 0,
    resolvedMap.get(member.id) ?? 0,
    stillOpenMap.get(member.id) ?? 0,
  ])

  const csv = serializeCsv([
    ['Name', 'Role', 'Issues Created', 'Issues Assigned', 'Issues Resolved', 'Issues Still Open'],
    ...rows,
  ])

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report-${rangeLabel}.csv"`,
    },
  })
}
