import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/session'
import { readJsonObject } from '@/lib/json-body'
import { validRepositoryBody } from '@/lib/input-validation'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const parsed = await readJsonObject(req)
  if (!parsed.ok) return parsed.response
  const body = parsed.value
  if (!validRepositoryBody(body)) return NextResponse.json({ error: 'ignored must be boolean; teamIds must be at most 100 unique IDs' }, { status: 400 })
  if (body.teamIds?.length && await prisma.team.count({ where: { id: { in: body.teamIds } } }) !== body.teamIds.length)
    return NextResponse.json({ error: 'One or more selected teams do not exist' }, { status: 400 })
  const existing = await prisma.repository.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Repository not found' }, { status: 404 })

  try { await prisma.$transaction(async (tx) => {
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
  }) } catch (error) {
    const missingRelation = error && typeof error === 'object' && 'code' in error && error.code === 'P2003'
    return NextResponse.json({ error: 'Repository update failed; reload the available teams and try again' }, { status: missingRelation ? 400 : 500 })
  }

  const updated = await prisma.repository.findUnique({
    where: { id },
    include: { teams: { include: { team: { select: { id: true, name: true } } } } },
  })

  return NextResponse.json({
    ...updated,
    teams: updated!.teams.map((t) => t.team),
  })
}
