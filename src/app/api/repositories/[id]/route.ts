import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.repository.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Repository not found' }, { status: 404 })

  const body = await req.json() as { ignored?: boolean; teamIds?: string[] }

  await prisma.$transaction(async (tx) => {
    if (body.teamIds !== undefined) {
      await tx.repositoryTeam.deleteMany({ where: { repositoryId: id } })
      if (body.teamIds.length > 0) {
        await tx.repositoryTeam.createMany({
          data: body.teamIds.map((teamId) => ({ repositoryId: id, teamId })),
        })
      }
    }
    if (body.ignored !== undefined) {
      await tx.repository.update({ where: { id }, data: { ignored: body.ignored } })
    }
  })

  const updated = await prisma.repository.findUnique({
    where: { id },
    include: { teams: { include: { team: { select: { id: true, name: true } } } } },
  })

  return NextResponse.json({
    ...updated,
    teams: updated!.teams.map((t) => t.team),
  })
}
