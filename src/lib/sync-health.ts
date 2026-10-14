import { prisma } from "./prisma";
import { SYNC_SOURCES, nextScheduledAt, sourceConfigured, sourceSchedule, SCHEDULER_ZONE } from "./sync-config";
import { acquireSyncLock } from "./sync-lock";

export async function getSourceHealth() {
  const records = await prisma.setting.findMany({ where: { key: { in: SYNC_SOURCES.map(source => `sync:health:${source}`) } } });
  const release = records.some(row => row.value.includes('"running"')) ? await acquireSyncLock(() => {}) : null;
  if (release) await release();
  return Promise.all(SYNC_SOURCES.map(async source => {
    let last: Record<string, unknown> | null = null;
    try { last = JSON.parse(records.find(row => row.key === `sync:health:${source}`)?.value || "null"); } catch { /* invalid historic record */ }
    if (last?.status === "running" && typeof last.jobId === "string") {
      const job = await prisma.syncJob.findUnique({ where: { id: last.jobId }, select: { status: true, finishedAt: true } });
      // Job interruption/recovery must not leave source health green/running.
      if (job?.status === "error" || release) last = { ...last, status: "error", finishedAt: job?.finishedAt?.toISOString() ?? null };
    }
    return { source, configured: sourceConfigured(source), schedule: sourceSchedule(source), timezone: SCHEDULER_ZONE,
      schedulerEnabled: process.env.SYNC_SCHEDULER_ENABLED !== "false", nextScheduledAt: nextScheduledAt(source), last };
  }));
}
