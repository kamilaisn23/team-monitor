import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/session";
import type { SyncJob } from "@/lib/sync-manager";
import type { SyncEvent, SyncSelection } from "@/lib/sync-config";

// sync-manager is loaded at runtime from a pre-compiled CJS bundle (scripts-dist/sync-manager.js),
// not bundled into the Next.js server. This prevents Turbopack from treating it as a
// worker-thread entry point and tracing build-worker.mjs / esbuild binaries at build time.
function getSyncManager() {
    const managerPath = process.env.SYNC_MANAGER_PATH;
    if (!managerPath)
        throw new Error("SYNC_MANAGER_PATH environment variable is not set.");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(/* turbopackIgnore: true */ managerPath) as {
        createSyncJob: (source?: SyncSelection) => Promise<string>;
        getJob: (id: string) => Promise<SyncJob | undefined>;
        isJobRunning: () => Promise<boolean>;
        getCooldownSecondsRemaining: () => Promise<number>;
    };
}

const VALID_SOURCES = new Set(["kerjabaik", "github", "gitlab", "all"])

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminRole(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url)
    const rawSource = searchParams.get("source") ?? "all"
    if (!VALID_SOURCES.has(rawSource)) return NextResponse.json({ error: "Invalid sync source" }, { status: 400 });
    const source = rawSource as SyncSelection;

    const { createSyncJob, isJobRunning, getCooldownSecondsRemaining } = getSyncManager();

    if (await isJobRunning()) {
        return NextResponse.json({ error: "A sync is already in progress" }, { status: 409 });
    }

    const cooldownRemaining = await getCooldownSecondsRemaining();
    if (cooldownRemaining > 0) {
        return NextResponse.json(
            {
                error: "Sync cooldown active. Please wait before syncing again.",
                retryAfter: cooldownRemaining,
            },
            {
                status: 429,
                headers: { "Retry-After": String(cooldownRemaining) },
            },
        );
    }

    try {
        const jobId = await createSyncJob(source);
        return NextResponse.json({ jobId, source }, { status: 202 });
    } catch (error) {
        // Includes races after the read-only busy/cooldown checks.
        const failure = error as { status?: number; retryAfter?: number };
        if (failure.status === 400) return NextResponse.json({ error: "Integration is not configured" }, { status: 400 });
        if (failure.status === 409) return NextResponse.json({ error: "A sync is already in progress" }, { status: 409 });
        if (failure.status === 429) return NextResponse.json({ error: "Sync cooldown active", retryAfter: failure.retryAfter }, { status: 429, headers: { "Retry-After": String(failure.retryAfter) } });
        return NextResponse.json({ error: "Sync service unavailable" }, { status: 503 });
    }
}

export async function GET(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminRole(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
        const { isJobRunning, getCooldownSecondsRemaining } = getSyncManager();
        return NextResponse.json(
            {
                running: await isJobRunning(),
                cooldownSecondsRemaining: await getCooldownSecondsRemaining(),
            },
        );
    }

    const { getJob } = getSyncManager();
    const job = await getJob(jobId);
    if (!job)
        return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const encoder = new TextEncoder();

    let cleanup = () => {};
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
                    cleanup();
                }
            };

            type Listener = (event: SyncEvent) => void;
            job.listeners.push(listener as Listener);

            // Clean up listener if client disconnects early
            let closed = false;
            const poll = setInterval(async () => {
                try {
                    const current = await getJob(jobId);
                    if (closed || !current || current.status === "running") return;
                    // A different process has no shared listeners: poll its persisted result.
                    if (current.listeners !== job.listeners) {
                        for (const event of current.events) send(event);
                        controller.close();
                        cleanup();
                    }
                } catch { if (!closed) { send({ type: "error", message: "Sync status unavailable" }); controller.close(); cleanup(); } }
            }, 2000);
            cleanup = () => {
                closed = true;
                clearInterval(poll);
                req.signal.removeEventListener("abort", cleanup);
                job.listeners = job.listeners.filter(
                    (l) => l !== (listener as Listener),
                );
            };
            req.signal.addEventListener("abort", cleanup, { once: true });
        },
        cancel() { cleanup(); },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
