import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkloadThresholds } from '@/lib/settings'
import { wibMonthRange, wibDaysAgo, nowWib } from '@/lib/wib'
import { canReadMember } from '@/lib/read-access'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!canReadMember(session, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const state = searchParams.get('state') || 'all'
  const platform = searchParams.get('platform') || 'all'
  const month = searchParams.get('month')
  const type = searchParams.get('type') || 'all'
  const days = Math.max(0, Math.min(3650, parseInt(searchParams.get('days') || '0') || 0))
  const staleOnly = searchParams.get('stale') === 'true'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

  const repoFilter = {
    ignored: false,
    ...(platform !== 'all' ? { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB' } : {}),
  }

  const dateFilter = month
    ? { createdAt: (() => { const { start, end } = wibMonthRange(month); return { gte: start, lte: end } })() }
    : days > 0 ? { [state === 'closed' ? 'closedAt' : 'createdAt']: { gte: wibDaysAgo(days) } } : {}

  const stateFilter = state !== 'all' ? { state: state.toUpperCase() as 'OPEN' | 'CLOSED' } : {}

  let issueIds: string[] = []
  let assignedIssueIds = new Set<string>()
  let createdIssueIds = new Set<string>()

  if (type === 'assigned' || type === 'all') {
    const assignedIssues = await prisma.issueAssignee.findMany({
      where: { teamMemberId: id },
      select: { issueId: true },
    })
    assignedIssueIds = new Set(assignedIssues.map((a) => a.issueId))
    issueIds = [...issueIds, ...assignedIssueIds]
  }

  if (type === 'created' || type === 'all') {
    const createdIssues = await prisma.issue.findMany({
      where: { creatorTeamMemberId: id },
      select: { id: true },
    })
    createdIssueIds = new Set(createdIssues.map((i) => i.id))
    issueIds = [...issueIds, ...createdIssueIds]
  }

  issueIds = [...new Set(issueIds)]

  const where = {
    id: { in: issueIds },
    repository: repoFilter,
    ...dateFilter,
    ...stateFilter,
    ...(staleOnly ? { AND: [{ state: 'OPEN' as const, createdAt: { lt: wibDaysAgo((await getWorkloadThresholds()).staleDays) } }] } : {}),
  }

  const [total, issues, thresholds] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      include: {
        repository: { select: { id: true, name: true, platform: true } },
        assignees: { select: { teamMemberId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    getWorkloadThresholds(),
  ])

  const staleDate = wibDaysAgo(thresholds.staleDays)

  return NextResponse.json({
    data: issues.map((issue) => {
      const daysOpen = issue.state === 'OPEN' ? nowWib().diff(issue.createdAt, 'day') : null
      const isStale = issue.state === 'OPEN' && issue.createdAt < staleDate
      return {
        id: issue.id,
        title: issue.title,
        url: issue.url,
        state: issue.state,
        platform: issue.repository.platform,
        repository: { id: issue.repository.id, name: issue.repository.name },
        createdAt: issue.createdAt,
        closedAt: issue.closedAt,
        isCreator: createdIssueIds.has(issue.id),
        isAssignee: assignedIssueIds.has(issue.id),
        daysOpen,
        isStale,
      }
    }),
    total,
    page,
    limit,
  })
}
