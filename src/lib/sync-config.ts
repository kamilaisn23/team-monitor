import { CronExpressionParser } from "cron-parser";

export const SYNC_SOURCES = ["kerjabaik", "github", "gitlab"] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];
export type SyncSelection = SyncSource | "all";
export type SyncEvent = { type: string; [key: string]: unknown };
export const SYNC_LOCK_KEY = 894316025;
export const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
export const SCHEDULER_ZONE = "Asia/Jakarta";

export function sourceConfigured(source: SyncSource, env = process.env): boolean {
  if (source === "github") return Boolean((env.GITHUB_TOKEN || env.GITHUB_ORG_TOKEN) && (env.GITHUB_USER_NAME || env.GITHUB_ORG_NAME));
  if (source === "gitlab") return Boolean(env.GITLAB_BASE_URL && env.GITLAB_GROUP_TOKEN && env.GITLAB_GROUP_ID);
  return Boolean(env.KERJABAIK_BASE_URL && env.KERJABAIK_SERVICE_TOKEN);
}

export function sourceSchedule(source: SyncSource, env = process.env): string {
  // All schedules are interpreted in WIB, including custom expressions.
  return source === "kerjabaik" ? env.KERJABAIK_SYNC_CRON_SCHEDULE || "0 * * * *" : env.SYNC_CRON_SCHEDULE || "0 2 * * *";
}

export function nextScheduledAt(source: SyncSource, now = new Date(), env = process.env): string | null {
  if (env.SYNC_SCHEDULER_ENABLED === "false" || !sourceConfigured(source, env)) return null;
  try {
    return CronExpressionParser.parse(sourceSchedule(source, env), { currentDate: now, tz: SCHEDULER_ZONE }).next().toISOString();
  } catch { return null; }
}
