import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getWorkloadThresholds, setWorkloadThresholds } from '@/lib/settings'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const thresholds = await getWorkloadThresholds()
  return NextResponse.json(thresholds)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { lowMax?: unknown; mediumMax?: unknown }

  const lowMax = Number(body.lowMax)
  const mediumMax = Number(body.mediumMax)

  if (!Number.isInteger(lowMax) || lowMax < 1) {
    return NextResponse.json({ error: 'lowMax must be a positive integer' }, { status: 400 })
  }
  if (!Number.isInteger(mediumMax) || mediumMax < 1) {
    return NextResponse.json({ error: 'mediumMax must be a positive integer' }, { status: 400 })
  }
  if (lowMax >= mediumMax) {
    return NextResponse.json({ error: 'lowMax must be less than mediumMax' }, { status: 400 })
  }

  await setWorkloadThresholds({ lowMax, mediumMax })
  return NextResponse.json({ lowMax, mediumMax })
}
