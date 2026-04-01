"use client";

import { useState, useEffect, useCallback } from "react";
import Pagination from "@/components/ui/pagination";

interface Repo {
    id: string;
    platform: string;
    name: string;
    url: string;
    ignored: boolean;
    discoveredAt: string;
}

const PAGE_SIZE = 10;

export default function AdminReposClient() {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [platformFilter, setPlatformFilter] = useState("");
    const [ignoredFilter, setIgnoredFilter] = useState("false");
    const [page, setPage] = useState(1);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (platformFilter) params.set("platform", platformFilter);
        if (ignoredFilter !== "") params.set("ignored", ignoredFilter);
        fetch(`/api/repositories?${params.toString()}`)
            .then((r) => r.json())
            .then((data) => {
                setRepos(data as Repo[]);
                setLoading(false);
            });
    }, [platformFilter, ignoredFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [platformFilter, ignoredFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const handleToggleIgnore = async (repo: Repo) => {
        await fetch(`/api/repositories/${repo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ignored: !repo.ignored }),
        });
        load();
    };

    const pagedRepos = repos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark dark:text-white">
                    Repositories
                </h2>
                <p className="text-sm text-body dark:text-dark-6">
                    Auto-discovered repositories. Mark as ignored to exclude
                    from reports.
                </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-3">
                <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                >
                    <option value="">All Platforms</option>
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                </select>
                <select
                    value={ignoredFilter}
                    onChange={(e) => setIgnoredFilter(e.target.value)}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                >
                    <option value="false">Active only</option>
                    <option value="">All</option>
                    <option value="true">Ignored only</option>
                </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                {loading ? (
                    <div className="p-8 text-center text-body">Loading...</div>
                ) : repos.length === 0 ? (
                    <div className="p-8 text-center text-body">
                        No repositories found. Run a sync to discover repos.
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-stroke bg-gray-2 dark:border-stroke-dark dark:bg-[#1a2535]">
                                {[
                                    "Platform",
                                    "Repository",
                                    "Ignored",
                                    "Actions",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-sm font-medium text-body dark:text-dark-6"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pagedRepos.map((repo) => (
                                <tr
                                    key={repo.id}
                                    className={`border-b border-stroke last:border-0 dark:border-stroke-dark ${repo.ignored ? "opacity-60" : ""}`}
                                >
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                repo.platform === "GITHUB"
                                                    ? "bg-gray-100 text-gray-700 dark:bg-[#1a2535] dark:text-dark-6"
                                                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                            }`}
                                        >
                                            {repo.platform}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <a
                                            href={repo.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-dark hover:text-primary dark:text-white"
                                        >
                                            {repo.name}
                                        </a>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                repo.ignored
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                            }`}
                                        >
                                            {repo.ignored ? "Ignored" : "Active"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() =>
                                                handleToggleIgnore(repo)
                                            }
                                            className={`rounded px-2 py-1 text-xs ${
                                                repo.ignored
                                                    ? "text-green-600 hover:bg-green-50 dark:text-green-400"
                                                    : "text-red-600 hover:bg-red-50 dark:text-red-400"
                                            }`}
                                        >
                                            {repo.ignored ? "Unignore" : "Ignore"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <Pagination
                page={page}
                totalItems={repos.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />
        </div>
    );
}
