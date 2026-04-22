import { auth } from "@/lib/auth";
import type { SyncJob } from "@/lib/sync-manager";

// sync-manager is loaded at runtime from a pre-compiled CJS bundle (scripts-dist/sync-manager.js),
// not bundled into the Next.js server. This prevents Turbopack from treating it as a
// worker-thread entry point and tracing build-worker.mjs / esbuild binaries at build time.
function getSyncManager() {
    const managerPath = process.env.SYNC_MANAGER_PATH;
    if (!managerPath)
        throw new Error("SYNC_MANAGER_PATH environment variable is not set.");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(/* turbopackIgnore: true */ managerPath) as {
        createSyncJob: (source?: string) => string;
        getJob: (id: string) => SyncJob | undefined;
        isJobRunning: () => boolean;
        getCooldownSecondsRemaining: () => number;
    };
}

const VALID_SOURCES = new Set(["kerjabaik", "github", "gitlab", "all"])

export async function POST(req: Request) {
    const session = await auth();
    if (!session)
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
        });

    const { searchParams } = new URL(req.url)
    const rawSource = searchParams.get("source") ?? "all"
    const source = VALID_SOURCES.has(rawSource) ? rawSource : "all"

    const { createSyncJob, isJobRunning, getCooldownSecondsRemaining } = getSyncManager();

    if (isJobRunning()) {
        return new Response(
            JSON.stringify({ error: "A sync is already in progress" }),
            { status: 409 },
        );
    }

    const cooldownRemaining = getCooldownSecondsRemaining();
    if (cooldownRemaining > 0) {
        return new Response(
            JSON.stringify({
                error: "Sync cooldown active. Please wait before syncing again.",
                retryAfter: cooldownRemaining,
            }),
            {
                status: 429,
                headers: { "Retry-After": String(cooldownRemaining) },
            },
        );
    }

    const jobId = createSyncJob(source);
    return new Response(JSON.stringify({ jobId, source }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
    });
}

export async function GET(req: Request) {
    const session = await auth();
    if (!session)
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
        });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
        const { isJobRunning, getCooldownSecondsRemaining } = getSyncManager();
        return new Response(
            JSON.stringify({
                running: isJobRunning(),
                cooldownSecondsRemaining: getCooldownSecondsRemaining(),
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    const { getJob } = getSyncManager();
    const job = getJob(jobId);
    if (!job)
        return new Response(JSON.stringify({ error: "Job not found" }), {
            status: 404,
        });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const send = (data: unknown) => {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
                );
            };

            // Replay all events that already happened before the client connected
            for (const event of job.events) {
                send(event);
            }

            // If the job is already done, close immediately
            if (job.status !== "running") {
                controller.close();
                return;
            }

            // Register as a live listener for future events
            const listener = (event: unknown) => {
                send(event);
                const e = event as { type: string };
                if (e.type === "done" || e.type === "error") {
                    controller.close();
                }
            };

            type Listener = (
                event:
                    | import("@/lib/sync").SyncProgressEvent
                    | { type: "error"; message: string },
            ) => void;
            job.listeners.push(listener as Listener);

            // Clean up listener if client disconnects early
            req.signal.addEventListener("abort", () => {
                job.listeners = job.listeners.filter(
                    (l) => l !== (listener as Listener),
                );
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
