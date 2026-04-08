import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role
  if (!session.user.isSuperadmin && role !== 'MANAGER' && role !== 'DEVELOPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const roleFilter = searchParams.get('role')
  const teamId = searchParams.get('teamId')
  const activeParam = searchParams.get('active')

  const members = await prisma.teamMember.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter.toUpperCase() as 'MANAGER' | 'DEVELOPER' | 'UNASSIGNED' } : {}),
      ...(teamId ? { teams: { some: { teamId } } } : {}),
      ...(activeParam !== null ? { isActive: activeParam === 'true' } : {}),
    },
    include: {
      teams: { include: { team: { select: { id: true, name: true } } } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      usernameGithub: m.usernameGithub,
      usernameGitlab: m.usernameGitlab,
      role: m.role,
      avatarUrl: m.avatarUrl,
      isActive: m.isActive,
      lastLoginAt: m.lastLoginAt,
      teams: m.teams.map((t) => t.team),
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { name?: string; usernameGithub?: string; usernameGitlab?: string; role?: string }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const validRoles = ['MANAGER', 'DEVELOPER', 'UNASSIGNED']
  if (!body.role || !validRoles.includes(body.role)) {
    return NextResponse.json({ error: 'role must be MANAGER, DEVELOPER, or UNASSIGNED' }, { status: 400 })
  }

  try {
    const member = await prisma.teamMember.create({
      data: {
        name: body.name.trim(),
        usernameGithub: body.usernameGithub?.trim() || null,
        usernameGitlab: body.usernameGitlab?.trim() || null,
        role: body.role as 'MANAGER' | 'DEVELOPER' | 'UNASSIGNED',
      },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      if (e.message.includes('username_gitlab')) {
        return NextResponse.json({ error: 'usernameGitlab already taken' }, { status: 409 })
      }
      return NextResponse.json({ error: 'usernameGithub already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
