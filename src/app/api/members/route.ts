import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'
import { isAdminRole } from '@/lib/session'
import { canReadWorkspace, memberReadScope } from '@/lib/read-access'
import { readJsonObject } from '@/lib/json-body'
import { validMemberBody, validEntityId, memberRoles } from '@/lib/input-validation'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canReadWorkspace(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const roleFilter = searchParams.get('role')
  const teamId = searchParams.get('teamId')
  const activeParam = searchParams.get('active')
  if (roleFilter && !memberRoles.includes(roleFilter.toUpperCase() as (typeof memberRoles)[number]) ||
      teamId && !validEntityId(teamId) || activeParam !== null && !['true', 'false'].includes(activeParam))
    return NextResponse.json({ error: 'Invalid role, active status or team ID' }, { status: 400 })

  const members = await prisma.teamMember.findMany({
    where: {
      ...memberReadScope(session),
      ...(roleFilter ? { role: roleFilter.toUpperCase() as 'ADMIN' | 'MANAGER' | 'DEVELOPER' | 'UNASSIGNED' } : {}),
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
      kerjabaikEmployeeId: m.kerjabaikEmployeeId,
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
  if (!isAdminRole(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const parsed = await readJsonObject(req)
  if (!parsed.ok) return parsed.response
  const body = parsed.value
  if (!validMemberBody(body, true)) return NextResponse.json({ error: 'Invalid member fields, types or lengths' }, { status: 400 })

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const validRoles = ['ADMIN', 'MANAGER', 'DEVELOPER', 'UNASSIGNED']
  if (!body.role || !validRoles.includes(body.role)) {
    return NextResponse.json({ error: 'role must be ADMIN, MANAGER, DEVELOPER, or UNASSIGNED' }, { status: 400 })
  }

  try {
    const member = await prisma.teamMember.create({
      data: {
        name: body.name.trim(),
        usernameGithub: body.usernameGithub?.trim() || null,
        usernameGitlab: body.usernameGitlab?.trim() || null,
        role: body.role as 'ADMIN' | 'MANAGER' | 'DEVELOPER' | 'UNASSIGNED',
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
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
