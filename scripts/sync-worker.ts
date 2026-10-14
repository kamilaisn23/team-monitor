import { parentPort, workerData } from "node:worker_threads";
import { prisma } from "../src/lib/prisma";
import { sourceConfigured, SYNC_SOURCES, type SyncEvent, type SyncSource } from "../src/lib/sync-config";

async function main() {
  if (!parentPort) throw new Error("Sync worker requires a parent port");
  const sources: SyncSource[] = workerData.source === "all" ? [...SYNC_SOURCES] : [workerData.source];
  let errors = 0, processed = 0, githubIssues = 0, gitlabIssues = 0;
  const started = Date.now();
  for (const source of sources) {
    if (!sourceConfigured(source)) {
      parentPort.postMessage({ type: "source_skipped", source, message: "Integration is not configured" });
      continue;
    }
    const startedAt = new Date().toISOString();
    const key = `sync:health:${source}`;
    const health = { source, jobId: workerData.jobId, trigger: workerData.trigger, startedAt, finishedAt: null as string | null, status: "running", issues: 0, errors: 0 };
    await prisma.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(health) }, update: { value: JSON.stringify(health) } });
    const progress = (event: SyncEvent) => {
      if (event.type === "done") {
        health.errors += Number(event.errors || 0);
        processed += Number(event.processed || 0);
        githubIssues += Number(event.githubIssues || 0);
        gitlabIssues += Number(event.gitlabIssues || 0);
        health.issues += Number(event.githubIssues || 0) + Number(event.gitlabIssues || 0);
      }
      if (event.type === "kerjabaik_error") health.errors++;
      parentPort!.postMessage(event.type.includes("error") ? { type: event.type, source, message: "Integration request failed" } : { ...event, type: event.type === "done" ? "source_done" : event.type, source });
    };
    try {
      if (source === "kerjabaik") {
        const { runKerjabaikSync } = await import("../src/lib/sync-kerjabaik");
        await runKerjabaikSync(progress);
      } else {
        const { runSync } = await import("../src/lib/sync");
        await runSync(progress, source);
      }
    } catch { health.errors++; }
    health.status = health.errors ? "error" : "done";
    health.finishedAt = new Date().toISOString();
    errors += health.errors;
    await prisma.setting.update({ where: { key }, data: { value: JSON.stringify(health) } });
  }
  parentPort.postMessage({ type: errors ? "error" : "done", processed, githubIssues, gitlabIssues, errors, durationSeconds: ((Date.now() - started) / 1000).toFixed(1), ...(errors ? { message: "One or more integrations failed; check source health" } : {}) });
}
main().catch(() => parentPort?.postMessage({ type: "error", message: "Sync worker failed" })).finally(async () => {
  await prisma.$disconnect();
  parentPort?.close();
});
