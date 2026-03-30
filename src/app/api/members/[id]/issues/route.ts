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
  const state = searchParams.get('state') || 'all'
  const platform = searchParams.get('platform') || 'all'
  const month = searchParams.get('month')
  const type = searchParams.get('type') || 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

  const repoFilter = {
    ignored: false,
    ...(platform !== 'all' ? { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB' } : {}),
  }

  const dateFilter = month
    ? {
        createdAt: {
          gte: dayjs(month + '-01').startOf('month').toDate(),
          lte: dayjs(month + '-01').endOf('month').toDate(),
        },
      }
    : {}

  const stateFilter = state !== 'all' ? { state: state.toUpperCase() as 'OPEN' | 'CLOSED' } : {}

  let issueIds: string[] = []

  if (type === 'assigned' || type === 'all') {
    const assignedIssues = await prisma.issueAssignee.findMany({
      where: { teamMemberId: id },
      select: { issueId: true },
    })
    issueIds = [...issueIds, ...assignedIssues.map((a) => a.issueId)]
  }

  if (type === 'created' || type === 'all') {
    const createdIssues = await prisma.issue.findMany({
      where: { creatorTeamMemberId: id },
      select: { id: true },
    })
    issueIds = [...issueIds, ...createdIssues.map((i) => i.id)]
  }

  issueIds = [...new Set(issueIds)]

  const where = {
    id: { in: issueIds },
    repository: repoFilter,
    ...dateFilter,
    ...stateFilter,
  }

  const [total, issues] = await Promise.all([
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
  ])

  const assigneeIds = new Set(
    (await prisma.issueAssignee.findMany({ where: { teamMemberId: id }, select: { issueId: true } })).map((a) => a.issueId)
  )
  const creatorIds = new Set(
    (await prisma.issue.findMany({ where: { creatorTeamMemberId: id, id: { in: issueIds } }, select: { id: true } })).map((i) => i.id)
  )

  return NextResponse.json({
    data: issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      url: issue.url,
      state: issue.state,
      platform: issue.repository.platform,
      repository: { id: issue.repository.id, name: issue.repository.name },
      createdAt: issue.createdAt,
      closedAt: issue.closedAt,
      isCreator: creatorIds.has(issue.id),
      isAssignee: assigneeIds.has(issue.id),
    })),
    total,
    page,
    limit,
  })
}
