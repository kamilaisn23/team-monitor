import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkloadThresholds } from '@/lib/settings'
import { wibMonthRange, wibCurrentMonth, wibDaysAgo } from '@/lib/wib'
import { isAdminRole } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = session.user.role
  if (!isAdminRole(session) && role !== 'MANAGER' && session.user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const month = searchParams.get('month') || wibCurrentMonth()
  const daysParam = searchParams.get('days')
  const platform = searchParams.get('platform') || 'all'

  let start: Date, end: Date
  if (daysParam) {
    const days = parseInt(daysParam, 10)
    start = wibDaysAgo(days)
    end = new Date()
  } else {
    ;({ start, end } = wibMonthRange(month))
  }

  // Platform filter for repositories
  const platformFilter = platform !== 'all'
    ? { repository: { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB', ignored: false } }
    : { repository: { ignored: false } }

  const thresholds = await getWorkloadThresholds()
  const staleDate = wibDaysAgo(thresholds.staleDays)

  const [currentLoad, issuesCreated, issuesAssigned, issuesResolved, staleIssues] = await Promise.all([
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
    // Stale: open issues older than staleDays
    prisma.issueAssignee.count({
      where: {
        teamMemberId: id,
        issue: { state: 'OPEN', createdAt: { lt: staleDate }, ...platformFilter },
      },
    }),
  ])

  return NextResponse.json({ memberId: id, month, platform, currentLoad, issuesCreated, issuesAssigned, issuesResolved, staleIssues, staleDays: thresholds.staleDays })
}
