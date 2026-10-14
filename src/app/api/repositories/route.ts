import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canReadWorkspace, isSelfScoped, issueReadScope, teamReadScope } from '@/lib/read-access'
import { validEntityId } from '@/lib/input-validation'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canReadWorkspace(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const platform = searchParams.get('platform')?.toLowerCase()
  const ignoredParam = searchParams.get('ignored')
  const teamId = searchParams.get('teamId')
  if (platform && !['all', 'github', 'gitlab'].includes(platform) ||
      ignoredParam !== null && !['true', 'false'].includes(ignoredParam) || teamId && !validEntityId(teamId))
    return NextResponse.json({ error: 'Invalid platform, ignored status or team ID' }, { status: 400 })

  const repos = await prisma.repository.findMany({
    where: {
      ...(isSelfScoped(session) ? { issues: { some: issueReadScope(session) } } : {}),
      ...(platform && platform !== 'all' ? { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB' } : {}),
      ...(ignoredParam !== null ? { ignored: ignoredParam === 'true' } : {}),
      ...(teamId ? { teams: { some: { teamId } } } : {}),
    },
    include: { teams: { where: { team: teamReadScope(session) }, include: { team: { select: { id: true, name: true } } } } },
    orderBy: [{ platform: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(
    repos.map((r) => ({
      id: r.id,
      platform: r.platform,
      name: r.name,
      url: r.url,
      ignored: r.ignored,
      discoveredAt: r.discoveredAt,
      teams: r.teams.map((t) => t.team),
    }))
  )
}
