import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { wibMonthRange } from '@/lib/wib'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role
  if (!session.user.isSuperadmin && role !== 'MANAGER' && role !== 'DEVELOPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month is required (YYYY-MM)' }, { status: 400 })

  const repositoryId = searchParams.get('repositoryId')
  const nameFilter = searchParams.get('name')
  const platform = searchParams.get('platform') || 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)))
  const skip = (page - 1) * limit

  const { start, end } = wibMonthRange(month)

  const repoFilter = {
    ignored: false,
    ...(repositoryId ? { id: repositoryId } : {}),
    ...(platform !== 'all' ? { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB' } : {}),
  }

  const members = await prisma.teamMember.findMany({
    where: {
      role: { not: 'UNASSIGNED' },
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

  const allRows = members.map((member) => ({
    memberId: member.id,
    name: member.name,
    avatarUrl: member.avatarUrl,
    role: member.role,
    issuesCreated: createdMap.get(member.id) ?? 0,
    issuesAssigned: assignedMap.get(member.id) ?? 0,
    issuesResolved: resolvedMap.get(member.id) ?? 0,
    issuesStillOpen: stillOpenMap.get(member.id) ?? 0,
  }))

  const totals = allRows.reduce(
    (acc, row) => ({
      issuesCreated: acc.issuesCreated + row.issuesCreated,
      issuesAssigned: acc.issuesAssigned + row.issuesAssigned,
      issuesResolved: acc.issuesResolved + row.issuesResolved,
      issuesStillOpen: acc.issuesStillOpen + row.issuesStillOpen,
    }),
    { issuesCreated: 0, issuesAssigned: 0, issuesResolved: 0, issuesStillOpen: 0 },
  )

  const data = allRows.slice(skip, skip + limit)

  return NextResponse.json({ month, total: members.length, totals, data })
}
