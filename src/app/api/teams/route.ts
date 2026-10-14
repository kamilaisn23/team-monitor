import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'
import { isAdminRole } from '@/lib/session'
import { canReadWorkspace, isSelfScoped, teamReadScope } from '@/lib/read-access'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canReadWorkspace(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const teams = await prisma.team.findMany({
    where: teamReadScope(session),
    include: { _count: { select: { members: isSelfScoped(session) ? { where: { teamMemberId: session.user.id } } : true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      kerjabaikProjectId: t.kerjabaikProjectId,
      isArchived: t.isArchived,
      createdAt: t.createdAt,
      memberCount: t._count.members,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const body = await req.json() as { name?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  try {
    const team = await prisma.team.create({ data: { name: body.name.trim() } })
    return NextResponse.json(team, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Team name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
