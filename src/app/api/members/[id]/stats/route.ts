import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import dayjs from 'dayjs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = session.user.role
  if (!session.user.isSuperadmin && role !== 'MANAGER' && session.user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const month = searchParams.get('month') || dayjs().format('YYYY-MM')
  const platform = searchParams.get('platform') || 'all'

  const start = dayjs(month + '-01').startOf('month').toDate()
  const end = dayjs(month + '-01').endOf('month').toDate()

  // Platform filter for repositories
  const platformFilter = platform !== 'all'
    ? { repository: { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB', ignored: false } }
    : { repository: { ignored: false } }

  const [currentLoad, issuesCreated, issuesAssigned, issuesResolved] = await Promise.all([
    // Current load: open issues assigned
    prisma.issueAssignee.count({
      where: {
        teamMemberId: id,
        issue: { state: 'OPEN', ...platformFilter },
      },
    }),
    // Issues created this month
    prisma.issue.count({
      where: {
        creatorTeamMemberId: id,
        createdAt: { gte: start, lte: end },
        ...platformFilter,
      },
    }),
    // Issues assigned this month
    prisma.issueAssignee.count({
      where: {
        teamMemberId: id,
        issue: { createdAt: { gte: start, lte: end }, ...platformFilter },
      },
    }),
    // Issues resolved this month
    prisma.issueAssignee.count({
      where: {
        teamMemberId: id,
        issue: { state: 'CLOSED', closedAt: { gte: start, lte: end }, ...platformFilter },
      },
    }),
  ])

  return NextResponse.json({ memberId: id, month, platform, currentLoad, issuesCreated, issuesAssigned, issuesResolved })
}
