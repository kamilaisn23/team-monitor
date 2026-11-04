import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import { prisma } from "./prisma";
import { acquireSyncLock } from "./sync-lock";
import { SYNC_COOLDOWN_MS, SYNC_SOURCES, sourceConfigured, type SyncEvent, type SyncSelection } from "./sync-config";

export type JobStatus = "running" | "done" | "error";
export interface SyncJob {
  id: string;
  status: JobStatus;
  events: SyncEvent[];
  listeners: Array<(event: SyncEvent) => void>;
}
const jobs = new Map<string, SyncJob>();
export class SyncStartError extends Error {
  constructor(public status: number, message: string, public retryAfter = 0) { super(message); }
}
export async function getCooldownSecondsRemaining() {
  const last = await prisma.syncJob.findFirst({ where: { finishedAt: { not: null } }, orderBy: { finishedAt: "desc" } });
  return last?.finishedAt ? Math.max(0, Math.ceil((SYNC_COOLDOWN_MS - (Date.now() - last.finishedAt.getTime())) / 1000)) : 0;
}
export async function isJobRunning() {
  const release = await acquireSyncLock(() => {});
  if (!release) return true;
  await release();
  return false;
}
export async function createSyncJob(source: SyncSelection = "all", trigger: "manual" | "scheduled" = "manual", scheduledAt?: string): Promise<string> {
  const workerPath = process.env.SYNC_WORKER_PATH;
  if (!workerPath) throw new Error("SYNC_WORKER_PATH environment variable is not set");
  if (!(source === "all" ? SYNC_SOURCES.some(item => sourceConfigured(item)) : sourceConfigured(source))) {
    throw new SyncStartError(400, "Integration is not configured");
  }
  let worker: Worker | undefined;
  let lockLost = false;
  const release = await acquireSyncLock(() => { lockLost = true; void worker?.terminate(); });
  if (!release) throw new SyncStartError(409, "A sync is already in progress");
  const id = `sync_${randomUUID()}`;
  try {
    const scheduleKey = `sync:schedule:${source}`;
    if (trigger === "scheduled") {
      if (!scheduledAt || source === "all") throw new Error("Scheduled sync requires a source and occurrence");
      const previous = await prisma.setting.findUnique({ where: { key: scheduleKey } });
      if (previous && previous.value >= scheduledAt) throw new SyncStartError(409, "Schedule already processed");
    }
    const cooldown = await getCooldownSecondsRemaining();
    if (cooldown) throw new SyncStartError(429, "Sync cooldown active. Please wait before syncing again.", cooldown);
    // Only the global lock owner can recover orphaned jobs.
    await prisma.syncJob.updateMany({ where: { status: "running" }, data: { status: "error", finishedAt: new Date(), summary: { type: "error", message: "Sync interrupted by a previous process shutdown" } } });
    await prisma.$transaction(async (tx) => {
      await tx.syncJob.create({ data: { id, status: "running", summary: { source, trigger } } });
      if (scheduledAt) await tx.setting.upsert({ where: { key: scheduleKey }, create: { key: scheduleKey, value: scheduledAt }, update: { value: scheduledAt } });
    });
    if (lockLost) throw new Error("Sync database lock lost");
    const job: SyncJob = { id, status: "running", events: [], listeners: [] };
    jobs.set(id, job);
    let terminal: SyncEvent | undefined;
    worker = new Worker(workerPath, { workerData: { source, jobId: id, trigger }, env: { ...process.env } });
    const broadcast = (event: SyncEvent) => {
      job.events.push(event);
      if (job.events.length > 500) job.events.shift();
      for (const listener of [...job.listeners]) { try { listener(event); } catch { /* disconnected client */ } }
    };
    worker.on("message", (event: SyncEvent) => {
      // Hold the lock until worker exit, including DB cleanup.
      if (event.type === "done" || event.type === "error") terminal = event;
      else broadcast(event);
    });
    worker.on("error", () => { terminal = { type: "error", message: "Sync worker failed; check source health" }; });
    worker.on("exit", async (code) => {
      const event = lockLost ? { type: "error", message: "Sync database lock lost; worker stopped" }
        : terminal || { type: "error", message: `Sync worker exited without a result (${code})` };
      let status: JobStatus = event.type === "done" ? "done" : "error";
      try {
        await prisma.syncJob.update({ where: { id }, data: { status, finishedAt: new Date(), summary: { ...event, source, trigger } as object } });
      } catch { status = "error"; }
      finally { await release(); }
      job.status = status;
      broadcast(job.status === "error" && event.type !== "error" ? { type: "error", message: "Unable to persist sync result" } : event);
      job.listeners = [];
      setTimeout(() => jobs.delete(id), 10 * 60_000).unref();
    });
    return id;
  } catch (error) {
    await prisma.syncJob.updateMany({ where: { id, status: "running" }, data: { status: "error", finishedAt: new Date() } }).catch(() => {});
    await release();
    throw error;
  }
}
export async function getJob(id: string): Promise<SyncJob | undefined> {
  const local = jobs.get(id);
  if (local) return local;
  const persisted = await prisma.syncJob.findUnique({ where: { id } });
  if (!persisted) return undefined;
  let status = persisted.status as JobStatus;
  if (status === "running" && !(await isJobRunning())) status = "error";
  const event = status === "running" ? { type: "waiting", message: "Sync running in another process" }
    : persisted.summary && typeof persisted.summary === "object" && "type" in persisted.summary
      ? persisted.summary as SyncEvent : { type: "error", message: "Sync interrupted" };
  return { id, status, events: [event], listeners: [] };
}
