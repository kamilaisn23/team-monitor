import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/session'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await prisma.teamMember.findMany({
    include: { teams: { include: { team: { select: { id: true, name: true } } } } },
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
      lastLoginAt: m.lastLoginAt,
      teams: m.teams.map((t) => t.team),
    }))
  )
}
