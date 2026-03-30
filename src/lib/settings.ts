import { prisma } from '@/lib/prisma'
import type { WorkloadLevel } from '@/types'

export interface WorkloadThresholds {
  lowMax: number   // <= lowMax  → 'low'
  mediumMax: number // <= mediumMax → 'medium', else 'high'
}

export const DEFAULT_THRESHOLDS: WorkloadThresholds = {
  lowMax: 3,
  mediumMax: 7,
}

let cachedThresholds: WorkloadThresholds | null = null
let cacheExpiry = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getWorkloadThresholds(): Promise<WorkloadThresholds> {
  if (cachedThresholds && Date.now() < cacheExpiry) return cachedThresholds

  const rows = await prisma.setting.findMany({
    where: { key: { in: ['workload_low_max', 'workload_medium_max'] } },
  })

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  const lowMax = parseInt(map['workload_low_max'] ?? '', 10)
  const mediumMax = parseInt(map['workload_medium_max'] ?? '', 10)

  cachedThresholds = {
    lowMax: isNaN(lowMax) ? DEFAULT_THRESHOLDS.lowMax : lowMax,
    mediumMax: isNaN(mediumMax) ? DEFAULT_THRESHOLDS.mediumMax : mediumMax,
  }
  cacheExpiry = Date.now() + CACHE_TTL_MS
  return cachedThresholds
}

export async function setWorkloadThresholds(thresholds: WorkloadThresholds): Promise<void> {
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: 'workload_low_max' },
      update: { value: String(thresholds.lowMax) },
      create: { key: 'workload_low_max', value: String(thresholds.lowMax) },
    }),
    prisma.setting.upsert({
      where: { key: 'workload_medium_max' },
      update: { value: String(thresholds.mediumMax) },
      create: { key: 'workload_medium_max', value: String(thresholds.mediumMax) },
    }),
  ])
  cachedThresholds = null
}

export function getWorkloadLevel(
  count: number,
  thresholds: WorkloadThresholds = DEFAULT_THRESHOLDS,
): WorkloadLevel {
  if (count <= thresholds.lowMax) return 'low'
  if (count <= thresholds.mediumMax) return 'medium'
  return 'high'
}
