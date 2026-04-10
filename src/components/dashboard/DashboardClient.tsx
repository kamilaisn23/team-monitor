"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { WorkloadLevel } from "@/types";
import Pagination from "@/components/ui/pagination";

interface DashboardMember {
    memberId: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    teams: { id: string; name: string }[];
    currentLoad: number;
    workloadLevel: WorkloadLevel;
}

const workloadColors: Record<WorkloadLevel, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PAGE_SIZE = 10;

export default function DashboardClient() {
    const [members, setMembers] = useState<DashboardMember[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [teamFilter, setTeamFilter] = useState("");
    const [platformFilter, setPlatformFilter] = useState("all");
    const [activeFilter, setActiveFilter] = useState<
        "all" | "active" | "inactive"
    >("active");
    const [nameFilter, setNameFilter] = useState("");
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
    const [repoFilter, setRepoFilter] = useState("");
    const [page, setPage] = useState(1);
    const [sortCol, setSortCol] = useState<
        "name" | "role" | "currentLoad" | "workloadLevel"
    >("name");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const handleSort = (
        col: "name" | "role" | "currentLoad" | "workloadLevel",
    ) => {
        if (sortCol === col) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortCol(col);
            setSortDir("asc");
        }
    };

    useEffect(() => {
        Promise.all([
            fetch("/api/teams").then((r) => r.json()),
            fetch("/api/repositories?ignored=false").then((r) => r.json()),
        ]).then(([t, r]) => {
            setTeams(t as { id: string; name: string }[]);
            setRepos(r as { id: string; name: string }[]);
        });
    }, []);

    useEffect(() => {
        setPage(1);
    }, [
        teamFilter,
        repoFilter,
        platformFilter,
        activeFilter,
        nameFilter,
        sortCol,
        sortDir,
    ]);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (teamFilter) params.set("teamId", teamFilter);
        if (repoFilter) params.set("repositoryId", repoFilter);
        if (platformFilter !== "all") params.set("platform", platformFilter);
        if (activeFilter !== "all")
            params.set("active", activeFilter === "active" ? "true" : "false");
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        params.set("sortCol", sortCol);
        params.set("sortDir", sortDir);
        if (nameFilter) params.set("name", nameFilter);
        fetch(`/api/dashboard?${params.toString()}`)
            .then((r) => r.json())
            .then((res: { total: number; data: DashboardMember[] }) => {
                setMembers(res.data);
                setTotal(res.total);
                setLoading(false);
            });
    }, [
        teamFilter,
        repoFilter,
        platformFilter,
        activeFilter,
        nameFilter,
        page,
        sortCol,
        sortDir,
    ]);

    const totalOpen = members.reduce((s, m) => s + m.currentLoad, 0);
    const highCount = members.filter((m) => m.workloadLevel === "high").length;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark dark:text-white">
                    Team Dashboard
                </h2>
                <p className="text-sm text-body dark:text-dark-6">
                    Current workload across the team
                </p>
            </div>

            {/* Summary Bar */}
            <div className="mb-6 grid grid-cols-3 gap-4">
                {[
                    { label: "Members", value: total },
                    { label: "Total Open Issues", value: totalOpen },
                    { label: "High Workload", value: highCount },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-xl border border-stroke bg-white p-4 dark:border-stroke-dark dark:bg-gray-dark"
                    >
                        <p className="text-sm text-body dark:text-dark-6">
                            {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-dark dark:text-white">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
                <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                >
                    <option value="">All Teams (member-driven)</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <select
                    value={repoFilter}
                    onChange={(e) => setRepoFilter(e.target.value)}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                >
                    <option value="">All Repositories</option>
                    {repos.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.name}
                        </option>
                    ))}
                </select>
                <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                >
                    <option value="all">All Platforms</option>
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                </select>
                <select
                    value={activeFilter}
                    onChange={(e) =>
                        setActiveFilter(
                            e.target.value as "all" | "active" | "inactive",
                        )
                    }
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                >
                    <option value="active">Active Members</option>
                    <option value="inactive">Inactive Members</option>
                    <option value="all">All Members</option>
                </select>
                <input
                    type="text"
                    placeholder="Filter by name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                {loading ? (
                    <div className="p-8 text-center text-body dark:text-dark-6">
                        Loading...
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-8 text-center text-body dark:text-dark-6">
                        No members found.
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-stroke bg-gray-2 dark:border-stroke-dark dark:bg-[#1a2535]">
                                <th
                                    onClick={() => handleSort("name")}
                                    className="cursor-pointer select-none px-4 py-3 text-left text-sm font-medium text-body hover:text-dark dark:text-dark-6 dark:hover:text-white"
                                >
                                    Member{" "}
                                    {sortCol === "name"
                                        ? sortDir === "asc"
                                            ? "↑"
                                            : "↓"
                                        : ""}
                                </th>
                                <th
                                    onClick={() => handleSort("role")}
                                    className="cursor-pointer select-none px-4 py-3 text-left text-sm font-medium text-body hover:text-dark dark:text-dark-6 dark:hover:text-white"
                                >
                                    Role{" "}
                                    {sortCol === "role"
                                        ? sortDir === "asc"
                                            ? "↑"
                                            : "↓"
                                        : ""}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-body dark:text-dark-6">
                                    Teams
                                </th>
                                <th
                                    onClick={() => handleSort("currentLoad")}
                                    className="cursor-pointer select-none px-4 py-3 text-right text-sm font-medium text-body hover:text-dark dark:text-dark-6 dark:hover:text-white"
                                >
                                    Open Issues{" "}
                                    {sortCol === "currentLoad"
                                        ? sortDir === "asc"
                                            ? "↑"
                                            : "↓"
                                        : ""}
                                </th>
                                <th
                                    onClick={() => handleSort("workloadLevel")}
                                    className="cursor-pointer select-none px-4 py-3 text-left text-sm font-medium text-body hover:text-dark dark:text-dark-6 dark:hover:text-white"
                                >
                                    Workload{" "}
                                    {sortCol === "workloadLevel"
                                        ? sortDir === "asc"
                                            ? "↑"
                                            : "↓"
                                        : ""}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => (
                                <tr
                                    key={member.memberId}
                                    className="border-b border-stroke last:border-0 hover:bg-gray-2/50 dark:border-stroke-dark dark:hover:bg-[#1a2535]/50"
                                >
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/members/${member.memberId}`}
                                            className="flex items-center gap-3 hover:text-primary"
                                        >
                                            {member.avatarUrl ? (
                                                <Image
                                                    src={member.avatarUrl}
                                                    alt={member.name}
                                                    width={32}
                                                    height={32}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                                    {member.name[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <span className="font-medium text-dark dark:text-white">
                                                {member.name}
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-body dark:text-dark-6">
                                        {member.teams
                                            .map((t) => t.name)
                                            .join(", ") || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                                        {member.currentLoad}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${workloadColors[member.workloadLevel]}`}
                                        >
                                            {member.workloadLevel}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <Pagination
                    page={page}
                    totalItems={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    className="border-t border-stroke dark:border-stroke-dark"
                />
            </div>
        </div>
    );
}
