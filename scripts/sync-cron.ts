import cron from "node-cron";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
    const { runSync } = await import("../src/lib/sync");
    const { runKerjabaikSync } = await import("../src/lib/sync-kerjabaik");

    const DEFAULT_GH_GL_SCHEDULE = "0 19 * * *"; // 02:00 WIB = 19:00 UTC
    const DEFAULT_KERJABAIK_SCHEDULE = "0 * * * *"; // every hour

    const ghGlSchedule = process.env.SYNC_CRON_SCHEDULE ?? DEFAULT_GH_GL_SCHEDULE;
    const kerjabaikSchedule = process.env.KERJABAIK_SYNC_CRON_SCHEDULE ?? DEFAULT_KERJABAIK_SCHEDULE;

    if (!cron.validate(ghGlSchedule)) {
        console.error(
            `[sync] Invalid SYNC_CRON_SCHEDULE: "${ghGlSchedule}". Falling back to default "${DEFAULT_GH_GL_SCHEDULE}"`,
        );
    }

    const validGhGlSchedule = cron.validate(ghGlSchedule) ? ghGlSchedule : DEFAULT_GH_GL_SCHEDULE;
    const validKerjabaikSchedule = cron.validate(kerjabaikSchedule) ? kerjabaikSchedule : DEFAULT_KERJABAIK_SCHEDULE;

    // Hourly: sync employees from kerjabaik
    cron.schedule(validKerjabaikSchedule, async () => {
        console.log(`[sync-kerjabaik] Starting scheduled sync at ${new Date().toISOString()}`);
        try {
            await runKerjabaikSync((event) => {
                if (event.type === "kerjabaik_start") {
                    console.log("[sync-kerjabaik] Fetching employees...");
                } else if (event.type === "kerjabaik_done") {
                    console.log(
                        `[sync-kerjabaik] Done — ${event.upserted} upserted, ${event.deactivated} deactivated (${event.durationSeconds}s)`,
                    );
                } else if (event.type === "kerjabaik_error") {
                    console.error(`[sync-kerjabaik] Error: ${event.error}`);
                }
            });
        } catch (err) {
            console.error("[sync-kerjabaik] Scheduled sync failed:", err);
        }
    });

    // Daily: sync issues from GitHub + GitLab
    cron.schedule(validGhGlSchedule, async () => {
        console.log(
            `[sync] Starting scheduled sync at ${new Date().toISOString()}`,
        );
        try {
            await runSync((event) => {
                if (event.type === "start") {
                    console.log(`[sync] Syncing ${event.total} member(s)...`);
                } else if (event.type === "member_start") {
                    console.log(
                        `[sync] Syncing member ${event.index + 1} of ${event.total}: ${event.name}`,
                    );
                } else if (event.type === "member_done") {
                    console.log(
                        `[sync] Done member ${event.index + 1} of ${event.total}: ${event.name} ` +
                            `(GitHub: ${event.githubIssues}, GitLab: ${event.gitlabIssues})`,
                    );
                } else if (event.type === "member_error") {
                    console.error(
                        `[sync] Error for member ${event.name} (${event.index + 1}/${event.total}): ${event.error}`,
                    );
                } else if (event.type === "resolving") {
                    console.log("[sync] Resolving usernames...");
                } else if (event.type === "done") {
                    const totalIssues = event.githubIssues + event.gitlabIssues;
                    console.log(
                        `[sync] Done — ${event.processed} members, ${totalIssues} issues synced in ${event.durationSeconds}s` +
                            (event.errors > 0
                                ? ` (${event.errors} error(s))`
                                : ""),
                    );
                }
            });
        } catch (err) {
            console.error("[sync] Scheduled sync failed:", err);
        }
    });

    console.log(`[sync] GitHub/GitLab scheduler started — schedule: "${validGhGlSchedule}"`);
    console.log(`[sync] Kerjabaik scheduler started — schedule: "${validKerjabaikSchedule}"`);
}

main().catch((err) => {
    console.error("[sync] Fatal error:", err);
    process.exit(1);
});
