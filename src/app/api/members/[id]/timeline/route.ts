import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { isAdminRole } from '@/lib/session'

dayjs.extend(utc)

const WIB_OFFSET = 7 // UTC+7

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = session.user.role
  if (!isAdminRole(session) && role !== 'MANAGER' && session.user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const member = await prisma.teamMember.findUnique({ where: { id }, select: { id: true } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '90')))
  const platform = searchParams.get('platform') || 'all'

  const platformFilter = platform !== 'all'
    ? { repository: { platform: platform.toUpperCase() as 'GITHUB' | 'GITLAB', ignored: false } }
    : { repository: { ignored: false } }

  // Compute range in WIB (UTC+7): "today" in WIB may differ from UTC
  const nowWib = dayjs.utc().add(WIB_OFFSET, 'hour')
  const rangeStart = nowWib.subtract(days - 1, 'day').startOf('day').subtract(WIB_OFFSET, 'hour').toDate()
  const rangeEnd = nowWib.endOf('day').subtract(WIB_OFFSET, 'hour').toDate()

  const resolvedAssignees = await prisma.issueAssignee.findMany({
    where: {
      teamMemberId: id,
      issue: { state: 'CLOSED', closedAt: { gte: rangeStart, lte: rangeEnd }, ...platformFilter },
    },
    include: { issue: { select: { closedAt: true } } },
  })

  // Group by date (YYYY-MM-DD) + hour (0-23) in WIB (UTC+7)
  const countMap = new Map<string, number>()
  for (const r of resolvedAssignees) {
    if (!r.issue.closedAt) continue
    const d = dayjs.utc(r.issue.closedAt).add(WIB_OFFSET, 'hour')
    const key = `${d.format('YYYY-MM-DD')}:${d.hour()}`
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  }

  const records = [...countMap.entries()].map(([key, count]) => {
    const colonIdx = key.indexOf(':')
    return {
      date: key.slice(0, colonIdx),
      hour: parseInt(key.slice(colonIdx + 1)),
      count,
    }
  })

  return NextResponse.json({ records, days })
}
