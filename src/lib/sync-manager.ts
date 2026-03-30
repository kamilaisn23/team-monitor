import { Worker } from "worker_threads";
import path from "path";
import fs from "fs";
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

// Resolve the compiled worker script path.
// In standalone/production build it is at <cwd>/scripts/sync-worker.js
// The scripts/ folder is copied into the container at the project root.
function resolveWorkerPath(): string {
    const candidates = [
        path.resolve(process.cwd(), "scripts", "sync-worker.js"),
        path.resolve(__dirname, "..", "scripts", "sync-worker.js"),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    // fallback — will throw a meaningful error when the worker is spawned
    return candidates[0]!;
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
