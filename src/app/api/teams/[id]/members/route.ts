import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const { id: teamId } = await params
  const body = await req.json() as { memberId?: string }
  if (!body.memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })

  const [team, member] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.teamMember.findUnique({ where: { id: body.memberId } }),
  ])
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  try {
    await prisma.teamMembership.create({ data: { teamId, teamMemberId: body.memberId } })
    return NextResponse.json({ teamId, memberId: body.memberId }, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Member already in team' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
