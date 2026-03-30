import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkloadLevel } from '@/types'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role
  if (!session.user.isSuperadmin && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const teamId = searchParams.get('teamId')
  const repoTeamId = searchParams.get('repoTeamId')
  const repositoryId = searchParams.get('repositoryId')
  const platform = searchParams.get('platform') || 'all'

  const repoFilter = {
    ignored: false,
    ...(repositoryId ? { id: repositoryId } : {}),
    ...(platform !== 'all' ? { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB' } : {}),
    ...(repoTeamId ? { teams: { some: { teamId: repoTeamId } } } : {}),
  }

  const members = await prisma.teamMember.findMany({
    where: {
      role: { not: 'UNASSIGNED' },
      ...(teamId ? { teams: { some: { teamId } } } : {}),
    },
    include: {
      teams: { include: { team: { select: { id: true, name: true } } } },
    },
    orderBy: { name: 'asc' },
  })

  const data = await Promise.all(
    members.map(async (member) => {
      const currentLoad = await prisma.issueAssignee.count({
        where: {
          teamMemberId: member.id,
          issue: { state: 'OPEN', repository: repoFilter },
        },
      })
      return {
        memberId: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        role: member.role,
        teams: member.teams.map((t) => t.team),
        currentLoad,
        workloadLevel: getWorkloadLevel(currentLoad),
      }
    })
  )

  return NextResponse.json(data)
}
