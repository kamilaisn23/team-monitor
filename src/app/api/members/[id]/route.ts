import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = session.user.role
  // Developer can only access own profile
  if (!session.user.isSuperadmin && role !== 'MANAGER' && session.user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const member = await prisma.teamMember.findUnique({
    where: { id },
    include: { teams: { include: { team: { select: { id: true, name: true } } } } },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  return NextResponse.json({
    id: member.id,
    name: member.name,
    usernameGithub: member.usernameGithub,
    usernameGitlab: member.usernameGitlab,
    role: member.role,
    avatarUrl: member.avatarUrl,
    isActive: member.isActive,
    createdAt: member.createdAt,
    lastLoginAt: member.lastLoginAt,
    teams: member.teams.map((t) => t.team),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const { id } = await params
  const body = await req.json() as { name?: string; usernameGithub?: string; usernameGitlab?: string; role?: string; isActive?: boolean }

  const existing = await prisma.teamMember.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const validRoles = ['MANAGER', 'DEVELOPER', 'UNASSIGNED']
  if (body.role && !validRoles.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  try {
    const updated = await prisma.teamMember.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.usernameGithub !== undefined ? { usernameGithub: body.usernameGithub?.trim() || null } : {}),
        ...(body.usernameGitlab !== undefined ? { usernameGitlab: body.usernameGitlab?.trim() || null } : {}),
        ...(body.role !== undefined ? { role: body.role as 'MANAGER' | 'DEVELOPER' | 'UNASSIGNED' } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      include: { teams: { include: { team: { select: { id: true, name: true } } } } },
    })
    return NextResponse.json({
      ...updated,
      teams: updated.teams.map((t) => t.team),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      if (e.message.includes('username_gitlab')) {
        return NextResponse.json({ error: 'usernameGitlab already taken by another member' }, { status: 409 })
      }
      return NextResponse.json({ error: 'usernameGithub already taken by another member' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const { id } = await params
  const existing = await prisma.teamMember.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  await prisma.teamMember.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
