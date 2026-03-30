import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import dayjs from 'dayjs'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role
  if (!session.user.isSuperadmin && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month is required (YYYY-MM)' }, { status: 400 })

  const repositoryId = searchParams.get('repositoryId')
  const nameFilter = searchParams.get('name')
  const platform = searchParams.get('platform') || 'all'

  const start = dayjs(month + '-01').startOf('month').toDate()
  const end = dayjs(month + '-01').endOf('month').toDate()

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

  const data = members.map((member) => ({
    memberId: member.id,
    name: member.name,
    avatarUrl: member.avatarUrl,
    role: member.role,
    issuesCreated: createdMap.get(member.id) ?? 0,
    issuesAssigned: assignedMap.get(member.id) ?? 0,
    issuesResolved: resolvedMap.get(member.id) ?? 0,
    issuesStillOpen: stillOpenMap.get(member.id) ?? 0,
  }))

  return NextResponse.json({ month, data })
}
