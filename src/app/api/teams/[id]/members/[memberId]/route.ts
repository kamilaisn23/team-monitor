import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const { id: teamId, memberId } = await params

  const existing = await prisma.teamMembership.findUnique({
    where: { teamId_teamMemberId: { teamId, teamMemberId: memberId } },
  })
  if (!existing) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  await prisma.teamMembership.delete({
    where: { teamId_teamMemberId: { teamId, teamMemberId: memberId } },
  })
  return new NextResponse(null, { status: 204 })
}
