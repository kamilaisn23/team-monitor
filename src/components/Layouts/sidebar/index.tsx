"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/wib";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTeamScope } from "../team-scope";
import { Icon } from "@/components/ui/icon";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { NAV_DATA, NAV_DATA_DEVELOPER } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import {
  getPreviewSection,
  previewHref,
  type PreviewSection,
} from "@/components/preview/navigation";

export function Sidebar({
  preview = false,
  previewSection = "dashboard",
}: {
  preview?: boolean;
  previewSection?: PreviewSection;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const scope = useTeamScope();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { data: session } = useSession();

  const role = session?.user?.role;
  const isSuperadmin = session?.user?.isSuperadmin;
  const isAdmin = isSuperadmin || role === "ADMIN";
  const isDeveloper = false; // developers now have same nav access as managers

  // Filter nav data based on role
  const navData = preview
    ? NAV_DATA.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          url: previewHref(getPreviewSection(item.url?.split("/").at(-1))),
        })),
      }))
    : isDeveloper
      ? NAV_DATA_DEVELOPER.map((section) => ({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            url:
              item.url === "/members/me" && session?.user?.id
                ? `/members/${session.user.id}`
                : item.url,
          })),
        }))
      : NAV_DATA.map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            // Admin (and superadmin) see Repositories, Teams, and Members admin pages
            if (
              item.url === "/admin/repositories" ||
              item.url === "/admin/teams" ||
              item.url === "/admin/members"
            )
              return isAdmin;
            // Only superadmin sees Settings
            if (item.url === "/admin/settings") return isSuperadmin;
            return true;
          }),
        })).filter((section) => section.items.length > 0);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
  };

  useEffect(() => {
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        return item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title);
            }
            return true;
          }
        });
      });
    });
  }, [pathname]);

  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const fetchLastSynced = () => {
    fetch("/api/sync/status")
      .then((r) => r.json())
      .then((d: { lastSyncedAt: string | null }) =>
        setLastSyncedAt(d.lastSyncedAt),
      )
      .catch(() => {});
  };

  useEffect(() => {
    if (preview) return;
    fetchLastSynced();
  }, [preview]);

  const triggerSync = () => {
    if (syncing || preview) return;
    setSyncing(true);
    setSyncProgress("Connecting...");

    fetch("/api/sync", { method: "POST" })
      .then(async (startRes) => {
        if (!startRes.ok) {
          setSyncing(false);
          setSyncProgress(null);
          return;
        }
        const { jobId } = (await startRes.json()) as { jobId: string };

        // Stream SSE progress events and render them below the sync button
        fetch(`/api/sync?jobId=${jobId}`)
          .then((sseRes) => {
            if (!sseRes.ok || !sseRes.body) {
              setSyncing(false);
              setSyncProgress(null);
              return;
            }
            const reader = sseRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            const read = ({
              done,
              value,
            }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
              if (done) {
                setSyncing(false);
                fetchLastSynced();
                return Promise.resolve();
              }
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split("\n\n");
              buffer = parts.pop() ?? "";
              for (const part of parts) {
                const line = part.replace(/^data: /, "").trim();
                if (!line) continue;
                try {
                  const event = JSON.parse(line) as {
                    type: string;
                  } & Record<string, unknown>;
                  if (event.type === "start") {
                    setSyncProgress(
                      `Starting sync for ${event.total as number} members...`,
                    );
                  } else if (event.type === "member_start") {
                    setSyncProgress(
                      `Syncing ${(event.index as number) + 1}/${event.total as number}: ${event.name as string}...`,
                    );
                  } else if (event.type === "resolving") {
                    setSyncProgress("Resolving usernames...");
                  } else if (event.type === "done") {
                    const totalIssues =
                      (event.githubIssues as number) +
                      (event.gitlabIssues as number);
                    setSyncProgress(
                      `✓ Done — ${event.processed as number} members, ${totalIssues} issues in ${event.durationSeconds as string}s`,
                    );
                    setSyncing(false);
                    fetchLastSynced();
                    setTimeout(() => setSyncProgress(null), 10000);
                    return Promise.resolve();
                  } else if (event.type === "error") {
                    setSyncProgress(`✗ Error: ${event.message as string}`);
                    setSyncing(false);
                    fetchLastSynced();
                    setTimeout(() => setSyncProgress(null), 10000);
                    return Promise.resolve();
                  }
                } catch {
                  /* ignore */
                }
              }
              return reader.read().then(read);
            };
            reader
              .read()
              .then(read)
              .catch(() => {
                setSyncing(false);
                setSyncProgress(null);
              });
          })
          .catch(() => {
            setSyncing(false);
            setSyncProgress(null);
          });
      })
      .catch(() => {
        setSyncing(false);
        setSyncProgress(null);
      });
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "tm-sidebar shrink-0 overflow-hidden transition-[width] duration-200 ease-linear",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? "w-[256px]" : "w-0",
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-full w-[256px] flex-col p-5">
          <div className="relative pb-6 pt-2">
            <Link
              href={preview ? "/preview" : "/"}
              onClick={() => isMobile && toggleSidebar()}
              className="px-0 py-2.5 min-[850px]:py-0"
            >
              <Logo />
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute -right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-right text-white"
              >
                <span className="sr-only">Close Menu</span>
                <ArrowLeftIcon className="size-5" />
              </button>
            )}
          </div>

          <div className="tm-scope-picker">
            <label htmlFor="sidebar-team">CAKUPAN DASBOR</label>
            <div className="flex items-center gap-2">
              <Icon name="layers" width={17} height={17} />
              <select
                id="sidebar-team"
                aria-label="Pilih cakupan tim"
                disabled={scope.loading || scope.error}
                value={scope.teamId}
                onChange={(e) => {
                  scope.setTeamId(e.target.value);
                  const target = preview ? "/preview" : "/dashboard";
                  if (
                    pathname !== target ||
                    (preview && previewSection !== "dashboard")
                  )
                    router.push(target);
                  if (isMobile) setIsOpen(false);
                }}
              >
                <option value="">
                  {scope.loading
                    ? "Memuat tim..."
                    : scope.error
                      ? "Tim tidak tersedia"
                      : "Semua tim"}
                </option>
                {scope.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.isArchived ? " (arsip)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <p>
              {scope.error
                ? "Muat ulang untuk mencoba lagi"
                : "Satu pandangan untuk seluruh tim"}
            </p>
          </div>
          <div className="custom-scrollbar mt-7 flex-1 overflow-y-auto">
            {navData.map((section) => (
              <div key={section.label} className="mb-6">
                <h2 className="tm-nav-label">{section.label}</h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.title}>
                        {item.items.length ? (
                          <div>
                            <MenuItem
                              isActive={item.items.some(
                                ({ url }) => url === pathname,
                              )}
                              onClick={() => toggleExpanded(item.title)}
                            >
                              <item.icon
                                className="size-6 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{item.title}</span>
                              <ChevronUp
                                className={cn(
                                  "ml-auto rotate-180 transition-transform duration-200",
                                  expandedItems.includes(item.title) &&
                                    "rotate-0",
                                )}
                                aria-hidden="true"
                              />
                            </MenuItem>

                            {expandedItems.includes(item.title) && (
                              <ul
                                className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                role="menu"
                              >
                                {item.items.map((subItem) => (
                                  <li key={subItem.title} role="none">
                                    <MenuItem
                                      as="link"
                                      href={subItem.url}
                                      isActive={pathname === subItem.url}
                                    >
                                      <span>{subItem.title}</span>
                                    </MenuItem>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          (() => {
                            const href =
                              "url" in item
                                ? item.url + ""
                                : "/" +
                                  item.title.toLowerCase().split(" ").join("-");
                            return (
                              <MenuItem
                                className="flex items-center gap-3 py-3"
                                as="link"
                                href={href}
                                isActive={
                                  preview
                                    ? href === previewHref(previewSection)
                                    : pathname === href ||
                                      pathname.startsWith(href + "/")
                                }
                              >
                                <item.icon
                                  className="size-6 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{item.title}</span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>

          {/* Sync button for all roles */}
          <div className="tm-sync-panel">
            <span className="tm-nav-label">
              {preview ? "PRATINJAU DESAIN" : "SINKRONISASI DATA"}
            </span>
            <button
              onClick={triggerSync}
              disabled={syncing || preview}
              className="tm-sync-button"
            >
              <svg
                className={cn("size-4 shrink-0", syncing && "animate-spin")}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                {preview
                  ? "Data contoh"
                  : syncing
                    ? "Menyinkronkan..."
                    : "Sinkronkan sekarang"}
              </span>
            </button>
            <p className="tm-sync-time">
              {preview
                ? "Coba filter, tabel, dan tampilan kartu"
                : lastSyncedAt
                  ? `Terakhir: ${timeAgo(lastSyncedAt)}`
                  : "Belum pernah disinkronkan"}
            </p>
            {syncProgress && (
              <p
                role="status"
                className="mt-1 px-3 text-xs text-primary dark:text-primary truncate"
                title={syncProgress}
              >
                {syncProgress}
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
