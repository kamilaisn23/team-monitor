import cron from "node-cron";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
    const { runSync } = await import("../src/lib/sync");

    const DEFAULT_SCHEDULE = "0 19 * * *"; // 02:00 WIB = 19:00 UTC
    const schedule = process.env.SYNC_CRON_SCHEDULE ?? DEFAULT_SCHEDULE;

    if (!cron.validate(schedule)) {
        console.error(
            `[sync] Invalid SYNC_CRON_SCHEDULE: "${schedule}". Falling back to default "${DEFAULT_SCHEDULE}"`,
        );
    }

    const validSchedule = cron.validate(schedule) ? schedule : DEFAULT_SCHEDULE;

    cron.schedule(validSchedule, async () => {
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

    console.log(
        `[sync] Scheduler started with schedule "${validSchedule}" (SYNC_CRON_SCHEDULE env var to override)`,
    );
}

main().catch((err) => {
    console.error("[sync] Fatal error:", err);
    process.exit(1);
});
