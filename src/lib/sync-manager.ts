import { Worker } from "worker_threads";
import type { SyncProgressEvent } from "@/lib/sync";

export type JobStatus = "running" | "done" | "error";

export interface SyncJob {
    id: string;
    status: JobStatus;
    events: Array<SyncProgressEvent | { type: "error"; message: string }>;
    listeners: Array<
        (event: SyncProgressEvent | { type: "error"; message: string }) => void
    >;
}

// Module-level store — survives across requests in the same Node.js process
const jobs = new Map<string, SyncJob>();

const JOB_TTL_MS = 10 * 60 * 1000;

function cleanupJob(jobId: string) {
    setTimeout(() => jobs.delete(jobId), JOB_TTL_MS);
}

// Worker path is supplied via SYNC_WORKER_PATH env var (set in Dockerfile).
// Using an env var avoids static path expressions like process.cwd() or __dirname
// which cause Turbopack's NFT to trace the entire scripts/ directory at build time.
function resolveWorkerPath(): string {
    const envPath = process.env.SYNC_WORKER_PATH;
    if (envPath) return envPath;
    throw new Error(
        "SYNC_WORKER_PATH environment variable is not set. " +
        "Set it to the absolute path of the compiled scripts/sync-worker.js file.",
    );
}

export function createSyncJob(): string {
    const jobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const job: SyncJob = {
        id: jobId,
        status: "running",
        events: [],
        listeners: [],
    };

    jobs.set(jobId, job);

    const workerPath = resolveWorkerPath();

    const worker = new Worker(workerPath, {
        // Pass DATABASE_URL and other critical env vars into the worker
        env: {
            ...process.env,
        },
    });

    const broadcast = (
        event: SyncProgressEvent | { type: "error"; message: string },
    ) => {
        job.events.push(event);
        for (const listener of [...job.listeners]) {
            listener(event);
        }
    };

    worker.on(
        "message",
        (event: SyncProgressEvent | { type: "error"; message: string }) => {
            broadcast(event);
            if (event.type === "done") {
                job.status = "done";
                job.listeners = [];
                cleanupJob(jobId);
            }
        },
    );

    worker.on("error", (err) => {
        broadcast({ type: "error", message: err.message });
        job.status = "error";
        job.listeners = [];
        cleanupJob(jobId);
    });

    worker.on("exit", (code) => {
        if (job.status === "running") {
            broadcast({
                type: "error",
                message: `Worker exited unexpectedly with code ${code}`,
            });
            job.status = "error";
            job.listeners = [];
            cleanupJob(jobId);
        }
    });

    return jobId;
}

export function getJob(jobId: string): SyncJob | undefined {
    return jobs.get(jobId);
}

export function isJobRunning(): boolean {
    for (const job of jobs.values()) {
        if (job.status === "running") return true;
    }
    return false;
}
