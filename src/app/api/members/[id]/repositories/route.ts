import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { wibDaysAgo } from '@/lib/wib'
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
  const daysParam = searchParams.get('days')
  const platform = searchParams.get('platform') || 'all'

  // Build date range filter — 0 or missing means all time
  const days = daysParam ? parseInt(daysParam, 10) : 0
  const dateFilter: { gte?: Date } = days > 0 ? { gte: wibDaysAgo(days) } : {}

  const repoFilter = {
    ignored: false,
    ...(platform !== 'all' ? { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB' } : {}),
  }

  // Fetch repos where member created issues
  const createdRepos = await prisma.issue.groupBy({
    by: ['repositoryId'],
    where: {
      creatorTeamMemberId: id,
      repository: repoFilter,
      ...(days > 0 ? { createdAt: dateFilter } : {}),
    },
    _count: { id: true },
  })

  // Fetch repos where member was assigned issues
  const assignedRepos = await prisma.issueAssignee.groupBy({
    by: ['issueId'],
    where: {
      teamMemberId: id,
      issue: {
        repository: repoFilter,
        ...(days > 0 ? { createdAt: dateFilter } : {}),
      },
    },
  })

  // For assigned: we need per-repo counts, so fetch issues with repositoryId
  const assignedIssueIds = assignedRepos.map((r) => r.issueId)
  const assignedIssueRepos = await prisma.issue.groupBy({
    by: ['repositoryId'],
    where: { id: { in: assignedIssueIds } },
    _count: { id: true },
  })

  // Fetch resolved (closed) repos where member was assignee
  const resolvedRepos = await prisma.issueAssignee.groupBy({
    by: ['issueId'],
    where: {
      teamMemberId: id,
      issue: {
        state: 'CLOSED',
        repository: repoFilter,
        ...(days > 0 ? { closedAt: { gte: wibDaysAgo(days) } } : {}),
      },
    },
  })

  const resolvedIssueIds = resolvedRepos.map((r) => r.issueId)
  const resolvedIssueRepos = await prisma.issue.groupBy({
    by: ['repositoryId'],
    where: { id: { in: resolvedIssueIds } },
    _count: { id: true },
  })

  // Collect all repository IDs
  const allRepoIds = new Set<string>([
    ...createdRepos.map((r) => r.repositoryId),
    ...assignedIssueRepos.map((r) => r.repositoryId),
  ])

  if (allRepoIds.size === 0) {
    return NextResponse.json([])
  }

  // Fetch repository details
  const repositories = await prisma.repository.findMany({
    where: { id: { in: Array.from(allRepoIds) } },
    select: { id: true, name: true, platform: true, url: true },
  })

  // Build lookup maps
  const createdMap = new Map(createdRepos.map((r) => [r.repositoryId, r._count.id]))
  const assignedMap = new Map(assignedIssueRepos.map((r) => [r.repositoryId, r._count.id]))
  const resolvedMap = new Map(resolvedIssueRepos.map((r) => [r.repositoryId, r._count.id]))

  const result = repositories
    .map((repo) => ({
      repositoryId: repo.id,
      name: repo.name,
      platform: repo.platform,
      url: repo.url,
      issuesCreated: createdMap.get(repo.id) ?? 0,
      issuesAssigned: assignedMap.get(repo.id) ?? 0,
      issuesResolved: resolvedMap.get(repo.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.issuesCreated + b.issuesAssigned + b.issuesResolved -
        (a.issuesCreated + a.issuesAssigned + a.issuesResolved),
    )

  return NextResponse.json(result)
}
