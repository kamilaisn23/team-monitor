import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'
import { isAdminRole } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const { id } = await params
  const body = await req.json() as { name?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const existing = await prisma.team.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  try {
    const team = await prisma.team.update({ where: { id }, data: { name: body.name.trim() } })
    return NextResponse.json(team)
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Team name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isKerjabaikSyncEnabled()) {
    return NextResponse.json({ error: 'managed_in_kerjabaik' }, { status: 409 })
  }

  const { id } = await params
  const existing = await prisma.team.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  await prisma.team.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
