import { computed, reactive } from "vue";
import { api } from "./api";
import type { Session, Team, Repository } from "./types";
import {
  previewTeams,
  previewRepositories,
  previewMembers,
} from "../../src/lib/preview-data";

export type ViewRole = "ADMIN" | "MANAGER" | "DEVELOPER" | "";
export const viewRoleOptions = ["ADMIN", "MANAGER", "DEVELOPER"] as const;
const viewAsStorageKey = "team-monitor:view-as";
function storedViewAs(): ViewRole {
  if (typeof window === "undefined") return "";
  const value = window.localStorage.getItem(viewAsStorageKey);
  return value === "ADMIN" || value === "MANAGER" || value === "DEVELOPER"
    ? value
    : "";
}
export const workspace = reactive({
  preview: false,
  ready: false,
  session: null as Session | null,
  config: {
    githubConfigured: false,
    devLoginEnabled: false,
    kerjabaikEnabled: true,
  },
  teams: [] as Team[],
  repositories: [] as Repository[],
  teamId: "",
  notice: "",
  noticeType: "success",
  syncing: false,
  lastSyncedAt: null as string | null,
  refreshKey: 0,
  viewAs: storedViewAs() as ViewRole,
});
export const isRealAdmin = computed(
  () =>
    !!workspace.session &&
    (workspace.session.user.isSuperadmin ||
      ["ADMIN", "SUPERADMIN"].includes(workspace.session.user.role)),
);
export const effectiveRole = computed(() => {
  if (!workspace.session) return "";
  if (!isRealAdmin.value) {
    return workspace.session.user.role === "SUPERADMIN"
      ? "ADMIN"
      : workspace.session.user.role;
  }
  return workspace.viewAs || "ADMIN";
});
export const isAdmin = computed(
  () => isRealAdmin.value && effectiveRole.value === "ADMIN",
);
export const isManager = computed(
  () => isAdmin.value || effectiveRole.value === "MANAGER",
);
export const canManage = computed(
  () =>
    isAdmin.value && !workspace.config.kerjabaikEnabled && !workspace.preview,
);
export const isDeveloper = computed(
  () => !workspace.preview && effectiveRole.value === "DEVELOPER",
);
export const canSettings = computed(
  () => workspace.preview || isAdmin.value,
);
export function setViewAs(role: ViewRole) {
  workspace.viewAs = role;
  if (typeof window === "undefined") return;
  if (role) window.localStorage.setItem(viewAsStorageKey, role);
  else window.localStorage.removeItem(viewAsStorageKey);
}
export function notify(message: string, type = "success") {
  workspace.notice = message;
  workspace.noticeType = type;
}
let bootstrapPromise: Promise<void> | undefined;
export async function bootstrap() {
  if (!bootstrapPromise)
    bootstrapPromise = (async () => {
      workspace.config = await api<typeof workspace.config>("/api/ui-config");
      workspace.session = await api<Session | null>("/api/auth/session");
      if (!isRealAdmin.value) setViewAs("");
      workspace.ready = true;
    })().catch((error) => {
      bootstrapPromise = undefined;
      throw error;
    });
  await bootstrapPromise;
}
export async function loadWorkspace(preview: boolean) {
  workspace.preview = preview;
  workspace.teamId = "";
  if (preview) {
    workspace.teams = previewTeams.map((team) => ({ ...team }));
    workspace.repositories = previewRepositories.map((repo, i) => ({
      ...repo,
      ignored: false,
      teams: [previewTeams[i % 3]!],
    }));
    workspace.lastSyncedAt = null;
  } else {
    const [teams, repositories] = await Promise.all([
      api<Team[]>("/api/teams"),
      api<Repository[]>("/api/repositories"),
    ]);
    workspace.teams = teams;
    workspace.repositories = repositories;
    try {
      const data = await api<{ lastSyncedAt: string | null }>(
        "/api/sync/status",
      );
      workspace.lastSyncedAt = data.lastSyncedAt;
    } catch {
      /* Nonessential sync timestamp. */
    }
  }
}
export function sampleMembers() {
  return previewMembers.map((member) => ({
    id: member.memberId,
    name: member.name,
    avatarUrl: member.avatarUrl,
    role: member.role,
    isActive: member.isActive,
    teams: member.teams,
    usernameGithub: null,
    usernameGitlab: null,
  }));
}
export async function signOut() {
  const { csrfToken } = await api<{ csrfToken: string }>("/api/auth/csrf");
  const response = await fetch("/api/auth/signout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/login" }),
  });
  if (!response.ok) throw new Error("Keluar gagal. Silakan coba kembali.");
  workspace.session = null;
  setViewAs("");
  bootstrapPromise = undefined;
  window.location.assign("/login");
}
