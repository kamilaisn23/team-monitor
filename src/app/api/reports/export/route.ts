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
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 })

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

  const rows = await Promise.all(
    members.map(async (member) => {
      const [issuesCreated, issuesAssigned, issuesResolved, issuesStillOpen] = await Promise.all([
        prisma.issue.count({ where: { creatorTeamMemberId: member.id, createdAt: { gte: start, lte: end }, repository: repoFilter } }),
        prisma.issueAssignee.count({ where: { teamMemberId: member.id, issue: { createdAt: { gte: start, lte: end }, repository: repoFilter } } }),
        prisma.issueAssignee.count({ where: { teamMemberId: member.id, issue: { state: 'CLOSED', closedAt: { gte: start, lte: end }, repository: repoFilter } } }),
        prisma.issueAssignee.count({ where: { teamMemberId: member.id, issue: { state: 'OPEN', repository: repoFilter } } }),
      ])
      return [member.name, member.role, issuesCreated, issuesAssigned, issuesResolved, issuesStillOpen]
    })
  )

  const header = 'Name,Role,Issues Created,Issues Assigned,Issues Resolved,Issues Still Open'
  const csvRows = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = [header, ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="report-${month}.csv"`,
    },
  })
}
