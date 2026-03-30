import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Import dynamically to avoid loading sync engine on every request
  import('@/lib/sync').then(({ runSync }) => {
    runSync().catch((err: unknown) => console.error('[sync] Manual sync error:', err))
  })

  return NextResponse.json({ status: 'started', message: 'Sync triggered. Check server logs for progress.' })
}
