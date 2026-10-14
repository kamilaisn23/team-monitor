import path from "node:path";
import dotenv from "dotenv";
import { CronExpressionParser } from "cron-parser";
import { createSyncJob, SyncStartError } from "../src/lib/sync-manager";
import { SYNC_SOURCES, sourceConfigured, sourceSchedule, SCHEDULER_ZONE } from "../src/lib/sync-config";
import { prisma } from "../src/lib/prisma";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
process.env.SYNC_WORKER_PATH ||= path.resolve(__dirname, "sync-worker.js");
let ticking = false;
let stopping = false;
async function tick() {
  if (ticking || stopping || process.env.SYNC_SCHEDULER_ENABLED === "false") return;
  ticking = true;
  try {
    for (const source of SYNC_SOURCES) {
      if (!sourceConfigured(source)) continue;
      let due: string;
      try { due = CronExpressionParser.parse(sourceSchedule(source), { currentDate: new Date(), tz: SCHEDULER_ZONE }).prev().toISOString()!; }
      catch { console.error(`[scheduler] Invalid schedule for ${source}; source disabled`); continue; }
      try {
        const id = await createSyncJob(source, "scheduled", due);
        console.log(`[scheduler] Started ${source} job ${id}`);
      } catch (error) {
        // Busy/cooldown retries next tick. Persistent occurrence claims dedupe replicas.
        if (!(error instanceof SyncStartError)) console.error(`[scheduler] Unable to start ${source} sync`);
      }
    }
  } finally { ticking = false; }
}
console.log(`[scheduler] Running in ${SCHEDULER_ZONE}; configured sources: ${SYNC_SOURCES.filter(source => sourceConfigured(source)).join(", ") || "none (waiting for integration configuration)"}`);
void tick();
const timer = setInterval(() => void tick(), 30_000);
function stop() {
  stopping = true;
  clearInterval(timer);
  // Terminating this process ends the DB lock and its worker threads.
  void prisma.$disconnect().finally(() => process.exit(0));
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
