import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getWorkloadThresholds, setWorkloadThresholds } from '@/lib/settings'
import { readJsonObject } from '@/lib/json-body'
import { onlyKeys } from '@/lib/input-validation'

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

  const parsed = await readJsonObject(req)
  if (!parsed.ok) return parsed.response
  const body = parsed.value
  if (!onlyKeys(body, ['lowMax', 'mediumMax', 'staleDays'])) return NextResponse.json({ error: 'Unknown settings field' }, { status: 400 })

  const { lowMax, mediumMax, staleDays } = body

  if (typeof lowMax !== 'number' || !Number.isInteger(lowMax) || lowMax < 1 || lowMax > 10000) {
    return NextResponse.json({ error: 'lowMax must be an integer between 1 and 10000' }, { status: 400 })
  }
  if (typeof mediumMax !== 'number' || !Number.isInteger(mediumMax) || mediumMax < 1 || mediumMax > 10000) {
    return NextResponse.json({ error: 'mediumMax must be an integer between 1 and 10000' }, { status: 400 })
  }
  if (lowMax >= mediumMax) {
    return NextResponse.json({ error: 'lowMax must be less than mediumMax' }, { status: 400 })
  }
  if (typeof staleDays !== 'number' || !Number.isInteger(staleDays) || staleDays < 1 || staleDays > 36500) {
    return NextResponse.json({ error: 'staleDays must be an integer between 1 and 36500' }, { status: 400 })
  }

  await setWorkloadThresholds({ lowMax, mediumMax, staleDays })
  return NextResponse.json({ lowMax, mediumMax, staleDays })
}
