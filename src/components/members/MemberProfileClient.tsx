"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatWib } from "@/lib/wib";
import ActivityChart from "./ActivityChart";

interface Member {
    id: string;
    name: string;
    usernameGithub: string | null;
    usernameGitlab: string | null;
    role: string;
    avatarUrl: string | null;
    lastLoginAt: string | null;
    teams: { id: string; name: string }[];
}

interface Stats {
    currentLoad: number;
    issuesCreated: number;
    issuesAssigned: number;
    issuesResolved: number;
    staleIssues: number;
    staleDays: number;
}

interface Issue {
    id: string;
    title: string;
    url: string;
    state: string;
    platform: string;
    repository: { id: string; name: string };
    createdAt: string;
    closedAt: string | null;
    isCreator: boolean;
    isAssignee: boolean;
    daysOpen: number | null;
    isStale: boolean;
}

interface HeatmapRecord {
    date: string;
    hour: number;
    count: number;
}

interface RepoRow {
    repositoryId: string;
    name: string;
    platform: string;
    url: string;
    issuesCreated: number;
    issuesAssigned: number;
    issuesResolved: number;
}

type SortKey =
    | "title"
    | "repository"
    | "platform"
    | "createdAt"
    | "closedAt"
    | "state";
type SortDir = "asc" | "desc";
type ActivityTab = "open" | "resolved" | "created" | "assigned" | "stale";

// days value: 0 = all time, 30/90/180 = last N days
const TIME_OPTIONS = [
    { label: "All time", value: 0 },
    { label: "30d", value: 30 },
    { label: "90d", value: 90 },
    { label: "180d", value: 180 },
] as const;

export default function MemberProfileClient({
    memberId,
}: {
    memberId: string;
}) {
    const [member, setMember] = useState<Member | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [issueTotal, setIssueTotal] = useState(0);
    const [heatmapRecords, setHeatmapRecords] = useState<HeatmapRecord[]>([]);
    const [heatmapDays, setHeatmapDays] = useState<number>(30);
    const [platform, setPlatform] = useState("all");
    const [tab, setTab] = useState<ActivityTab>("open");
    const issueSection = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // Repositories section
    const [repos, setRepos] = useState<RepoRow[]>([]);
    const [reposLoading, setReposLoading] = useState(true);

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir("asc");
        }
    }

    const getIssueValue = (issue: Issue, key: SortKey): string => {
        if (key === "repository") return issue.repository.name;
        if (key === "closedAt") return issue.closedAt ?? "";
        if (key === "title") return issue.title;
        if (key === "platform") return issue.platform;
        if (key === "createdAt") return issue.createdAt;
        if (key === "state") return issue.state;
        return "";
    };

    const sortedIssues = [...issues].sort((a, b) => {
        const av = getIssueValue(a, sortKey);
        const bv = getIssueValue(b, sortKey);
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    useEffect(() => {
        fetch(`/api/members/${memberId}`)
            .then((r) => r.json())
            .then((data) => setMember(data as Member));
    }, [memberId]);

    useEffect(() => {
        const params = new URLSearchParams({
            days: String(heatmapDays),
            platform,
        });
        fetch(`/api/members/${memberId}/stats?${params.toString()}`)
            .then((r) => r.json())
            .then((data) => setStats(data as Stats));
    }, [memberId, platform, heatmapDays]);

    useEffect(() => {
        if (heatmapDays === 0) {
            setHeatmapRecords([]);
            return;
        }
        const params = new URLSearchParams({
            platform,
            days: String(heatmapDays),
        });
        fetch(`/api/members/${memberId}/timeline?${params.toString()}`)
            .then((r) => r.json())
            .then((data) => {
                const d = data as { records: HeatmapRecord[]; days: number };
                setHeatmapRecords(d.records);
            });
    }, [memberId, platform, heatmapDays]);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({
            platform,
            page: String(page),
            limit: "20",
        });
        if (tab === "open") { params.set("state", "open"); params.set("type", "assigned"); }
        else if (tab === "stale") { params.set("state", "open"); params.set("type", "assigned"); params.set("stale", "true"); }
        else if (tab === "assigned") params.set("type", "assigned");
        else if (tab === "resolved") {
            params.set("state", "closed");
            params.set("type", "assigned");
        } else if (tab === "created") params.set("type", "created");
        if (heatmapDays > 0 && tab !== "open" && tab !== "stale") params.set("days", String(heatmapDays));
        fetch(`/api/members/${memberId}/issues?${params.toString()}`)
            .then((r) => r.json())
            .then((data) => {
                const d = data as { data: Issue[]; total: number };
                setIssues(d.data);
                setIssueTotal(d.total);
                setLoading(false);
            });
    }, [memberId, platform, tab, page, heatmapDays]);

    // Fetch repositories — reacts to platform and heatmapDays
    useEffect(() => {
        setReposLoading(true);
        const params = new URLSearchParams({ platform });
        if (heatmapDays > 0) params.set("days", String(heatmapDays));
        fetch(`/api/members/${memberId}/repositories?${params.toString()}`)
            .then((r) => r.json())
            .then((data) => {
                setRepos(data as RepoRow[]);
                setReposLoading(false);
            });
    }, [memberId, platform, heatmapDays]);

    if (!member)
        return <div className="p-8 text-center text-body">Loading...</div>;

    const hasTimeline = heatmapRecords.some((r) => r.count > 0);

    return (
        <div>
            {/* Header */}
            <div className="mb-6 rounded-xl border border-stroke bg-white p-6 dark:border-stroke-dark dark:bg-gray-dark">
                <div className="flex items-start gap-4">
                    {member.avatarUrl ? (
                        <Image
                            src={member.avatarUrl}
                            alt={member.name}
                            width={64}
                            height={64}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                            {member.name[0]?.toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-dark dark:text-white">
                                {member.name}
                            </h2>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {member.role}
                            </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-body dark:text-dark-6">
                            {member.usernameGithub && (
                                <a
                                    href={`https://github.com/${member.usernameGithub}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary"
                                >
                                    GitHub: @{member.usernameGithub}
                                </a>
                            )}
                            {member.usernameGitlab && (
                                <span>GitLab: @{member.usernameGitlab}</span>
                            )}
                        </div>
                        {member.teams.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {member.teams.map((t) => (
                                    <span
                                        key={t.id}
                                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-body dark:bg-[#1a2535] dark:text-dark-6"
                                    >
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        )}
                        {member.lastLoginAt && (
                            <p className="mt-2 text-xs text-body dark:text-dark-6">
                                Last login:{" "}
                                {formatWib(member.lastLoginAt, "MMM D, YYYY")}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Platform filter + Time window — shared controls for all sections below */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                    {["all", "github", "gitlab"].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPlatform(p)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                                platform === p
                                    ? "bg-primary text-white"
                                    : "bg-white text-body hover:bg-gray-2 dark:bg-gray-dark dark:text-dark-6 dark:hover:bg-[#1a2535]"
                            }`}
                        >
                            {p === "all" ? "All Platforms" : p}
                        </button>
                    ))}
                </div>

                <div className="flex gap-1">
                    {TIME_OPTIONS.map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setHeatmapDays(value)}
                            className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                heatmapDays === value
                                    ? "bg-primary text-white"
                                    : "border border-stroke text-body hover:bg-gray-2 dark:border-stroke-dark dark:text-dark-6 dark:hover:bg-[#1a2535]"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
                {[
                    { label: "Open Issues", value: stats?.currentLoad ?? "—", tab: "open" },
                    {
                        label:
                            heatmapDays > 0
                                ? `Created (Last ${heatmapDays}d)`
                                : "Created (All time)",
                        value: stats?.issuesCreated ?? "—",
                        tab: "created",
                    },
                    {
                        label:
                            heatmapDays > 0
                                ? `Assigned (Last ${heatmapDays}d)`
                                : "Assigned (All time)",
                        value: stats?.issuesAssigned ?? "—",
                        tab: "assigned",
                    },
                    {
                        label:
                            heatmapDays > 0
                                ? `Resolved (Last ${heatmapDays}d)`
                                : "Resolved (All time)",
                        value: stats?.issuesResolved ?? "—",
                        tab: "resolved",
                    },
                    {
                        label: `Stale (${stats?.staleDays ?? "…"}d+)`,
                        value: stats?.staleIssues ?? "—",
                        highlight: stats !== null && stats.staleIssues > 0,
                        tab: "stale",
                    },
                ].map((stat) => (
                    <button type="button" disabled={!stats} aria-label={`Lihat ${stat.label}`} onClick={() => { setTab(stat.tab as ActivityTab); setPage(1); issueSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                        key={stat.label}
                        className={`tm-clickable-card rounded-xl border p-4 ${
                            "highlight" in stat && stat.highlight
                                ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20"
                                : "border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark"
                        }`}
                    >
                        <p className="text-sm text-body dark:text-dark-6">
                            {stat.label}
                        </p>
                        <p
                            className={`text-2xl font-bold ${"highlight" in stat && stat.highlight ? "text-orange-600 dark:text-orange-400" : "text-dark dark:text-white"}`}
                        >
                            {stat.value}
                        </p>
                    </button>
                ))}
            </div>

            {/* Activity Heatmap */}
            <div className="mb-6 rounded-xl border border-stroke bg-white p-5 dark:border-stroke-dark dark:bg-gray-dark">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-dark dark:text-white">
                            Resolution Activity
                        </h3>
                        <p className="text-xs text-body dark:text-dark-6">
                            Hour of day (WIB, UTC+7) × date — issues resolved
                        </p>
                    </div>
                </div>
                {heatmapDays === 0 ? (
                    <div className="flex h-[240px] items-center justify-center text-sm text-body dark:text-dark-6">
                        Select a time window (30d / 90d / 180d) to view the
                        activity heatmap.
                    </div>
                ) : hasTimeline ? (
                    <ActivityChart
                        records={heatmapRecords}
                        days={heatmapDays}
                    />
                ) : (
                    <div className="flex h-[240px] items-center justify-center text-sm text-body dark:text-dark-6">
                        No resolved issues in the last {heatmapDays} days.
                    </div>
                )}
                {heatmapDays > 0 && (
                    <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-body dark:text-dark-6">
                        <span>Less</span>
                        {[
                            "#ebedf0",
                            "#9be9a8",
                            "#40c463",
                            "#30a14e",
                            "#216e39",
                        ].map((c) => (
                            <span
                                key={c}
                                className="inline-block h-3 w-3 rounded-sm"
                                style={{ backgroundColor: c }}
                            />
                        ))}
                        <span>More</span>
                    </div>
                )}
            </div>

            {/* Repositories section */}
            <div className="mb-6 rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                <div className="flex items-center justify-between border-b border-stroke px-5 py-3.5 dark:border-stroke-dark">
                    <div>
                        <h3 className="text-sm font-semibold text-dark dark:text-white">
                            Repositories
                        </h3>
                        <p className="text-xs text-body dark:text-dark-6">
                            {heatmapDays > 0
                                ? `Active in the last ${heatmapDays} days`
                                : "All-time activity"}{" "}
                            · {platform === "all" ? "All platforms" : platform}
                        </p>
                    </div>
                    {!reposLoading && (
                        <span className="text-xs text-body dark:text-dark-6">
                            {repos.length}{" "}
                            {repos.length === 1 ? "repo" : "repos"}
                        </span>
                    )}
                </div>

                {reposLoading ? (
                    <div className="p-6 text-center text-sm text-body dark:text-dark-6">
                        Loading…
                    </div>
                ) : repos.length === 0 ? (
                    <div className="p-6 text-center text-sm text-body dark:text-dark-6">
                        No repository activity found
                        {heatmapDays > 0
                            ? ` in the last ${heatmapDays} days`
                            : ""}
                        .
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stroke bg-gray-2 text-left dark:border-stroke-dark dark:bg-[#1a2535]">
                                    <th className="px-5 py-2.5 font-medium text-body dark:text-dark-6">
                                        Repository
                                    </th>
                                    <th className="px-5 py-2.5 font-medium text-body dark:text-dark-6">
                                        Platform
                                    </th>
                                    <th className="px-5 py-2.5 font-medium text-body dark:text-dark-6">
                                        Created
                                    </th>
                                    <th className="px-5 py-2.5 font-medium text-body dark:text-dark-6">
                                        Assigned
                                    </th>
                                    <th className="px-5 py-2.5 font-medium text-body dark:text-dark-6">
                                        Resolved
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {repos.map((repo) => (
                                    <tr
                                        key={repo.repositoryId}
                                        className="border-b border-stroke last:border-0 hover:bg-gray-2/50 dark:border-stroke-dark dark:hover:bg-[#1a2535]/50"
                                    >
                                        <td className="px-5 py-3">
                                            <a
                                                href={repo.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-dark hover:text-primary dark:text-white dark:hover:text-primary"
                                            >
                                                {repo.name}
                                            </a>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    repo.platform === "GITHUB"
                                                        ? "bg-gray-100 text-body dark:bg-[#1a2535] dark:text-dark-6"
                                                        : "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                                                }`}
                                            >
                                                {repo.platform}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-dark dark:text-white">
                                            {repo.issuesCreated}
                                        </td>
                                        <td className="px-5 py-3 text-dark dark:text-white">
                                            {repo.issuesAssigned}
                                        </td>
                                        <td className="px-5 py-3 text-dark dark:text-white">
                                            {repo.issuesResolved}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Issue list */}
            <div ref={issueSection} className="tm-card-target rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                <div className="flex flex-wrap border-b border-stroke dark:border-stroke-dark">
                    {(["open", "resolved", "created", "assigned", "stale"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setTab(t);
                                setPage(1);
                            }}
                            className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                                tab === t
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-body hover:text-dark dark:text-dark-6 dark:hover:text-white"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-body">Loading...</div>
                ) : issues.length === 0 ? (
                    <div className="p-8 text-center text-body">
                        No issues found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stroke bg-gray-2 text-left dark:border-stroke-dark dark:bg-[#1a2535]">
                                    {(
                                        [
                                            { key: "title", label: "Title" },
                                            {
                                                key: "repository",
                                                label: "Repo",
                                            },
                                            {
                                                key: "platform",
                                                label: "Platform",
                                            },
                                            {
                                                key: "createdAt",
                                                label: "Created",
                                            },
                                            {
                                                key: "closedAt",
                                                label: "Closed",
                                            },
                                            { key: "state", label: "Status" },
                                        ] as { key: SortKey; label: string }[]
                                    ).map(({ key, label }) => (
                                        <th
                                            key={key}
                                            onClick={() => handleSort(key)}
                                            className="cursor-pointer select-none px-4 py-2.5 font-medium text-body hover:text-dark dark:text-dark-6 dark:hover:text-white"
                                        >
                                            {label}
                                            {sortKey === key && (
                                                <span className="ml-1">
                                                    {sortDir === "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedIssues.map((issue) => (
                                    <tr
                                        key={issue.id}
                                        className="border-b border-stroke last:border-0 hover:bg-gray-2/50 dark:border-stroke-dark dark:hover:bg-[#1a2535]/50"
                                    >
                                        <td className="max-w-xs px-4 py-3">
                                            <a
                                                href={issue.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block truncate font-medium text-dark hover:text-primary dark:text-white dark:hover:text-primary"
                                                title={issue.title}
                                            >
                                                {issue.title}
                                            </a>
                                            {issue.isStale && (
                                                <span className="mt-0.5 inline-block rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                    Stale · {issue.daysOpen}d
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-body dark:text-dark-6">
                                            {issue.repository.name}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                                    issue.platform === "GITHUB"
                                                        ? "bg-gray-100 text-body dark:bg-[#1a2535] dark:text-dark-6"
                                                        : "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                                                }`}
                                            >
                                                {issue.platform}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-body dark:text-dark-6">
                                            {formatWib(
                                                issue.createdAt,
                                                "MMM D, YYYY",
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-body dark:text-dark-6">
                                            {issue.closedAt
                                                ? formatWib(
                                                      issue.closedAt,
                                                      "MMM D, YYYY",
                                                  )
                                                : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    issue.state === "OPEN"
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                        : "bg-gray-100 text-gray-600 dark:bg-[#1a2535] dark:text-dark-6"
                                                }`}
                                            >
                                                {issue.state}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {issueTotal > 20 && (
                            <div className="flex items-center justify-between p-4">
                                <span className="text-sm text-body dark:text-dark-6">
                                    {issueTotal} total
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            setPage((p) => Math.max(1, p - 1))
                                        }
                                        disabled={page === 1}
                                        className="rounded px-3 py-1 text-sm disabled:opacity-50"
                                    >
                                        ← Prev
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={page * 20 >= issueTotal}
                                        className="rounded px-3 py-1 text-sm disabled:opacity-50"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
