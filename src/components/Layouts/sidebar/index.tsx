"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { NAV_DATA, NAV_DATA_DEVELOPER } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

type SyncLogLine = {
    id: number;
    text: string;
    status: "info" | "success" | "error" | "muted";
};

export function Sidebar() {
    const pathname = usePathname();
    const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const { data: session } = useSession();

    const role = session?.user?.role;
    const isSuperadmin = session?.user?.isSuperadmin;
    const isDeveloper = role === "DEVELOPER" && !isSuperadmin;

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
    const [showModal, setShowModal] = useState(false);
    const [syncLog, setSyncLog] = useState<SyncLogLine[]>([]);
    const [syncDone, setSyncDone] = useState(false);
    const logCounter = useRef(0);
    const logEndRef = useRef<HTMLDivElement>(null);

    const addLog = (text: string, status: SyncLogLine["status"] = "info") => {
        setSyncLog((prev) => [
            ...prev,
            { id: logCounter.current++, text, status },
        ]);
    };

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [syncLog]);

    // Reads the SSE stream for a given jobId entirely in the background.
    // This function intentionally does NOT return a Promise that is awaited
    // by the caller — it runs fire-and-forget so the JS thread is never
    // blocked and the rest of the UI stays fully responsive.
    const readSyncStream = (jobId: string) => {
        fetch(`/api/sync?jobId=${jobId}`)
            .then((sseRes) => {
                if (!sseRes.ok || !sseRes.body) {
                    addLog(
                        "Failed to connect to sync progress stream.",
                        "error",
                    );
                    setSyncing(false);
                    setSyncDone(true);
                    return;
                }

                const reader = sseRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                const processChunk = ({
                    done,
                    value,
                }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
                    if (done) {
                        setSyncing(false);
                        setSyncDone(true);
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
                                total?: number;
                                index?: number;
                                name?: string;
                                githubIssues?: number;
                                gitlabIssues?: number;
                                error?: string;
                                message?: string;
                                processed?: number;
                                errors?: number;
                                durationSeconds?: string;
                            };
                            if (event.type === "start") {
                                addLog(
                                    `Starting sync for ${event.total ?? 0} member(s)…`,
                                    "info",
                                );
                            } else if (event.type === "member_start") {
                                addLog(
                                    `[${(event.index ?? 0) + 1}/${event.total ?? 0}] Syncing ${event.name}…`,
                                    "info",
                                );
                            } else if (event.type === "member_done") {
                                const issueParts: string[] = [];
                                if ((event.githubIssues ?? 0) > 0)
                                    issueParts.push(
                                        `${event.githubIssues} GitHub`,
                                    );
                                if ((event.gitlabIssues ?? 0) > 0)
                                    issueParts.push(
                                        `${event.gitlabIssues} GitLab`,
                                    );
                                const issueStr = issueParts.length
                                    ? ` — ${issueParts.join(", ")} issues`
                                    : "";
                                addLog(
                                    `[${(event.index ?? 0) + 1}/${event.total ?? 0}] ✓ ${event.name}${issueStr}`,
                                    "success",
                                );
                            } else if (event.type === "member_error") {
                                addLog(
                                    `[${(event.index ?? 0) + 1}/${event.total ?? 0}] ✗ ${event.name}: ${event.error}`,
                                    "error",
                                );
                            } else if (event.type === "resolving") {
                                addLog("Resolving username mappings…", "muted");
                            } else if (event.type === "done") {
                                const totalIssues =
                                    (event.githubIssues ?? 0) +
                                    (event.gitlabIssues ?? 0);
                                addLog(
                                    `Sync complete in ${event.durationSeconds}s — ${event.processed} members, ${totalIssues} issues synced${(event.errors ?? 0) > 0 ? `, ${event.errors} error(s)` : ""}.`,
                                    "success",
                                );
                                setSyncDone(true);
                                setSyncing(false);
                            } else if (event.type === "error") {
                                addLog(
                                    `Fatal error: ${event.message ?? "Unknown error"}`,
                                    "error",
                                );
                                setSyncDone(true);
                                setSyncing(false);
                            }
                        } catch {
                            // ignore malformed SSE lines
                        }
                    }

                    // Schedule next chunk read without blocking — returns to event loop between each chunk
                    return reader.read().then(processChunk);
                };

                reader
                    .read()
                    .then(processChunk)
                    .catch(() => {
                        setSyncing(false);
                        setSyncDone(true);
                    });
            })
            .catch((err: unknown) => {
                addLog(
                    `Network error: ${err instanceof Error ? err.message : String(err)}`,
                    "error",
                );
                setSyncing(false);
                setSyncDone(true);
            });
    };

    const triggerSync = () => {
        setSyncing(true);
        setSyncDone(false);
        setSyncLog([]);
        setShowModal(true);

        // POST returns immediately with a jobId — the sync runs on the server
        // in the background via setImmediate, never blocking the request thread
        fetch("/api/sync", { method: "POST" })
            .then(async (startRes) => {
                if (!startRes.ok) {
                    const err = (await startRes.json()) as { error?: string };
                    addLog(err.error ?? "Failed to start sync.", "error");
                    setSyncing(false);
                    setSyncDone(true);
                    return;
                }
                const { jobId } = (await startRes.json()) as { jobId: string };
                // Fire and forget — never awaited, JS thread stays free
                readSyncStream(jobId);
            })
            .catch((err: unknown) => {
                addLog(
                    `Network error: ${err instanceof Error ? err.message : String(err)}`,
                    "error",
                );
                setSyncing(false);
                setSyncDone(true);
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

                    {/* Sync button for superadmin */}
                    {isSuperadmin && (
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
                        </div>
                    )}

                    {/* Sync progress modal */}
                    {showModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-gray-dark">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-stroke-dark">
                                    <div className="flex items-center gap-2">
                                        {syncing && (
                                            <svg
                                                className="size-4 animate-spin text-primary"
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
                                        )}
                                        <h3 className="font-semibold text-dark dark:text-white">
                                            {syncing
                                                ? "Sync in progress…"
                                                : "Sync complete"}
                                        </h3>
                                    </div>
                                    {syncDone && (
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="rounded p-1 text-body hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-[#1a2535]"
                                            aria-label="Close"
                                        >
                                            <svg
                                                className="size-4"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path
                                                    d="M6 18L18 6M6 6l12 12"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Log area */}
                                <div className="h-72 overflow-y-auto px-5 py-3 font-mono text-xs">
                                    {syncLog.map((line) => (
                                        <div
                                            key={line.id}
                                            className={cn("py-0.5", {
                                                "text-body dark:text-dark-6":
                                                    line.status === "info",
                                                "text-green-600 dark:text-green-400":
                                                    line.status === "success",
                                                "text-red-600 dark:text-red-400":
                                                    line.status === "error",
                                                "text-gray-400 dark:text-gray-500":
                                                    line.status === "muted",
                                            })}
                                        >
                                            {line.text}
                                        </div>
                                    ))}
                                    <div ref={logEndRef} />
                                </div>

                                {/* Footer */}
                                {syncDone && (
                                    <div className="border-t border-stroke px-5 py-3 dark:border-stroke-dark">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
