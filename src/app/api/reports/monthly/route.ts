import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { wibMonthRange, wibDateRange } from '@/lib/wib'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role
  if (!session.user.isSuperadmin && role !== 'MANAGER' && role !== 'DEVELOPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const month = searchParams.get('month')
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  let rangeLabel: string
  let start: Date
  let end: Date

  if (startParam && endParam) {
    if (new Date(startParam) > new Date(endParam)) {
      return NextResponse.json({ error: 'start must be before end' }, { status: 400 })
    }
    ;({ start, end } = wibDateRange(startParam, endParam))
    rangeLabel = `${startParam}_to_${endParam}`
  } else if (month) {
    ;({ start, end } = wibMonthRange(month))
    rangeLabel = month
  } else {
    return NextResponse.json({ error: 'month or start+end is required' }, { status: 400 })
  }

  const repositoryId = searchParams.get('repositoryId')
  const nameFilter = searchParams.get('name')
  const platform = searchParams.get('platform') || 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)))
  const skip = (page - 1) * limit

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

  return NextResponse.json({ month: rangeLabel, total: members.length, totals, data })
}
