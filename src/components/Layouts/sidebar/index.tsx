"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/wib";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { NAV_DATA, NAV_DATA_DEVELOPER } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
    const pathname = usePathname();
    const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const { data: session } = useSession();

    const role = session?.user?.role;
    const isSuperadmin = session?.user?.isSuperadmin;
    const isDeveloper = false; // developers now have same nav access as managers

    // Filter nav data based on role
    const navData = isDeveloper
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
                  // Only superadmin sees Repositories page
                  if (item.url === "/admin/repositories") return isSuperadmin;
                  // Only superadmin sees Teams, Members, and Settings admin pages
                  if (
                      item.url === "/admin/teams" ||
                      item.url === "/admin/members" ||
                      item.url === "/admin/settings"
                  )
                      return isSuperadmin;
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
        fetchLastSynced();
    }, []);

    const triggerSync = () => {
        if (syncing) return;
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
                                        setSyncProgress(
                                            "Resolving usernames...",
                                        );
                                    } else if (event.type === "done") {
                                        const totalIssues =
                                            (event.githubIssues as number) +
                                            (event.gitlabIssues as number);
                                        setSyncProgress(
                                            `✓ Done — ${event.processed as number} members, ${totalIssues} issues in ${event.durationSeconds as string}s`,
                                        );
                                        setSyncing(false);
                                        fetchLastSynced();
                                        setTimeout(
                                            () => setSyncProgress(null),
                                            10000,
                                        );
                                        return Promise.resolve();
                                    } else if (event.type === "error") {
                                        setSyncProgress(
                                            `✗ Error: ${event.message as string}`,
                                        );
                                        setSyncing(false);
                                        fetchLastSynced();
                                        setTimeout(
                                            () => setSyncProgress(null),
                                            10000,
                                        );
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
                    "max-w-[290px] overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
                    isMobile
                        ? "fixed bottom-0 top-0 z-50"
                        : "sticky top-0 h-screen",
                    isOpen ? "w-full" : "w-0",
                )}
                aria-label="Main navigation"
                aria-hidden={!isOpen}
                inert={!isOpen}
            >
                <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
                    <div className="relative pr-4.5">
                        <Link
                            href="/"
                            onClick={() => isMobile && toggleSidebar()}
                            className="px-0 py-2.5 min-[850px]:py-0"
                        >
                            <Logo />
                        </Link>

                        {isMobile && (
                            <button
                                onClick={toggleSidebar}
                                className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
                            >
                                <span className="sr-only">Close Menu</span>
                                <ArrowLeftIcon className="ml-auto size-7" />
                            </button>
                        )}
                    </div>

                    <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3 min-[850px]:mt-10">
                        {navData.map((section) => (
                            <div key={section.label} className="mb-6">
                                <h2 className="mb-5 text-sm font-medium text-dark-4 dark:text-dark-6">
                                    {section.label}
                                </h2>

                                <nav
                                    role="navigation"
                                    aria-label={section.label}
                                >
                                    <ul className="space-y-2">
                                        {section.items.map((item) => (
                                            <li key={item.title}>
                                                {item.items.length ? (
                                                    <div>
                                                        <MenuItem
                                                            isActive={item.items.some(
                                                                ({ url }) =>
                                                                    url ===
                                                                    pathname,
                                                            )}
                                                            onClick={() =>
                                                                toggleExpanded(
                                                                    item.title,
                                                                )
                                                            }
                                                        >
                                                            <item.icon
                                                                className="size-6 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                {item.title}
                                                            </span>
                                                            <ChevronUp
                                                                className={cn(
                                                                    "ml-auto rotate-180 transition-transform duration-200",
                                                                    expandedItems.includes(
                                                                        item.title,
                                                                    ) &&
                                                                        "rotate-0",
                                                                )}
                                                                aria-hidden="true"
                                                            />
                                                        </MenuItem>

                                                        {expandedItems.includes(
                                                            item.title,
                                                        ) && (
                                                            <ul
                                                                className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                                                role="menu"
                                                            >
                                                                {item.items.map(
                                                                    (
                                                                        subItem,
                                                                    ) => (
                                                                        <li
                                                                            key={
                                                                                subItem.title
                                                                            }
                                                                            role="none"
                                                                        >
                                                                            <MenuItem
                                                                                as="link"
                                                                                href={
                                                                                    subItem.url
                                                                                }
                                                                                isActive={
                                                                                    pathname ===
                                                                                    subItem.url
                                                                                }
                                                                            >
                                                                                <span>
                                                                                    {
                                                                                        subItem.title
                                                                                    }
                                                                                </span>
                                                                            </MenuItem>
                                                                        </li>
                                                                    ),
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const href =
                                                            "url" in item
                                                                ? item.url + ""
                                                                : "/" +
                                                                  item.title
                                                                      .toLowerCase()
                                                                      .split(
                                                                          " ",
                                                                      )
                                                                      .join(
                                                                          "-",
                                                                      );
                                                        return (
                                                            <MenuItem
                                                                className="flex items-center gap-3 py-3"
                                                                as="link"
                                                                href={href}
                                                                isActive={
                                                                    pathname ===
                                                                        href ||
                                                                    pathname.startsWith(
                                                                        href +
                                                                            "/",
                                                                    )
                                                                }
                                                            >
                                                                <item.icon
                                                                    className="size-6 shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    {item.title}
                                                                </span>
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
                    <div className="border-t border-gray-200 pt-4 pr-4 dark:border-gray-800">
                        <button
                            onClick={triggerSync}
                            disabled={syncing}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-body hover:bg-gray-2 disabled:opacity-50 dark:text-dark-6 dark:hover:bg-[#1a2535]"
                        >
                            <svg
                                className={cn(
                                    "size-4 shrink-0",
                                    syncing && "animate-spin",
                                )}
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
                                {syncing ? "Syncing..." : "Trigger Sync"}
                            </span>
                        </button>
                        <p className="mt-1 px-3 text-xs text-dark-4 dark:text-dark-6">
                            {lastSyncedAt
                                ? `Last synced: ${timeAgo(lastSyncedAt)}`
                                : "Never synced"}
                        </p>
                        {syncProgress && (
                            <p
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
