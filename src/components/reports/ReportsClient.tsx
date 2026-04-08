"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { wibCurrentMonth } from "@/lib/wib";
import Pagination from "@/components/ui/pagination";

interface ReportRow {
    memberId: string;
    name: string;
    role: string;
    issuesCreated: number;
    issuesAssigned: number;
    issuesResolved: number;
    issuesStillOpen: number;
}

const PAGE_SIZE = 10;

export default function ReportsClient() {
    const [data, setData] = useState<ReportRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totals, setTotals] = useState({
        issuesCreated: 0,
        issuesAssigned: 0,
        issuesResolved: 0,
        issuesStillOpen: 0,
    });
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<"monthly" | "custom">("monthly");
    const [month, setMonth] = useState(wibCurrentMonth);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [dateError, setDateError] = useState("");
    const [nameFilter, setNameFilter] = useState("");
    const [repoFilter, setRepoFilter] = useState("");
    const [platformFilter, setPlatformFilter] = useState("all");
    const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
    const [page, setPage] = useState(1);
    const [sortCol, setSortCol] = useState<keyof ReportRow>("issuesResolved");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSort = (col: keyof ReportRow) => {
        if (sortCol === col) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortCol(col);
            setSortDir("desc");
        }
        setPage(1);
    };

    useEffect(() => {
        fetch("/api/repositories?ignored=false")
            .then((r) => r.json())
            .then((r) => setRepos(r as { id: string; name: string }[]));
    }, []);

    useEffect(() => {
        setPage(1);
    }, [
        mode,
        month,
        startDate,
        endDate,
        nameFilter,
        repoFilter,
        platformFilter,
    ]);

    useEffect(() => {
        if (mode === "custom") {
            if (!startDate || !endDate) return;
            if (startDate > endDate) {
                setDateError("Start date must be before end date");
                return;
            }
            setDateError("");
        }
        setLoading(true);
        const params = new URLSearchParams();
        if (mode === "custom") {
            params.set("start", startDate);
            params.set("end", endDate);
        } else {
            params.set("month", month);
        }
        if (nameFilter) params.set("name", nameFilter);
        if (repoFilter) params.set("repositoryId", repoFilter);
        if (platformFilter !== "all") params.set("platform", platformFilter);
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        params.set("sort", sortCol);
        params.set("sortDir", sortDir);
        fetch(`/api/reports/monthly?${params.toString()}`)
            .then((r) => r.json())
            .then(
                (d: {
                    data: ReportRow[];
                    total: number;
                    totals: typeof totals;
                }) => {
                    setData(d.data);
                    setTotal(d.total);
                    setTotals(d.totals);
                    setLoading(false);
                },
            );
    }, [
        mode,
        month,
        startDate,
        endDate,
        nameFilter,
        repoFilter,
        platformFilter,
        page,
        sortCol,
        sortDir,
    ]);

    const sortedData = data;

    const handleExport = () => {
        const params = new URLSearchParams();
        if (mode === "custom") {
            params.set("start", startDate);
            params.set("end", endDate);
        } else {
            params.set("month", month);
        }
        if (nameFilter) params.set("name", nameFilter);
        if (repoFilter) params.set("repositoryId", repoFilter);
        if (platformFilter !== "all") params.set("platform", platformFilter);
        window.location.href = `/api/reports/export?${params.toString()}`;
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-dark dark:text-white">
                        Monthly Report
                    </h2>
                    <p className="text-sm text-body dark:text-dark-6">
                        Issue activity per team member
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
                {/* Mode toggle */}
                <div className="flex overflow-hidden rounded-lg border border-stroke dark:border-stroke-dark">
                    {(["monthly", "custom"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                                mode === m
                                    ? "bg-primary text-white"
                                    : "bg-white text-body hover:bg-gray-2 dark:bg-gray-dark dark:text-dark-6 dark:hover:bg-[#1a2535]"
                            }`}
                        >
                            {m === "monthly" ? "Monthly" : "Custom Range"}
                        </button>
                    ))}
                </div>

                {mode === "monthly" ? (
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                    />
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                        />
                        <span className="text-sm text-body dark:text-dark-6">
                            to
                        </span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                        />
                        {dateError && (
                            <span className="text-xs text-red-500">
                                {dateError}
                            </span>
                        )}
                    </div>
                )}
                <input
                    type="text"
                    placeholder="Filter by name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                />
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
            </div>

            <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                {loading ? (
                    <div className="p-8 text-center text-body">Loading...</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-stroke bg-gray-2 dark:border-stroke-dark dark:bg-[#1a2535]">
                                {(
                                    [
                                        { label: "Name", col: "name" },
                                        { label: "Role", col: "role" },
                                        {
                                            label: "Created",
                                            col: "issuesCreated",
                                        },
                                        {
                                            label: "Assigned",
                                            col: "issuesAssigned",
                                        },
                                        {
                                            label: "Resolved",
                                            col: "issuesResolved",
                                        },
                                        {
                                            label: "Still Open",
                                            col: "issuesStillOpen",
                                        },
                                    ] as {
                                        label: string;
                                        col: keyof ReportRow;
                                    }[]
                                ).map(({ label, col }) => (
                                    <th
                                        key={col}
                                        onClick={() => handleSort(col)}
                                        className="cursor-pointer select-none px-4 py-3 text-left text-sm font-medium text-body hover:text-dark dark:text-dark-6 dark:hover:text-white"
                                    >
                                        {label}{" "}
                                        {sortCol === col
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((row) => (
                                <tr
                                    key={row.memberId}
                                    className="border-b border-stroke hover:bg-gray-2/50 dark:border-stroke-dark dark:hover:bg-[#1a2535]/50"
                                >
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/members/${row.memberId}`}
                                            className="font-medium text-dark hover:text-primary dark:text-white"
                                        >
                                            {row.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-body dark:text-dark-6">
                                        {row.role}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {row.issuesCreated}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {row.issuesAssigned}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {row.issuesResolved}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {row.issuesStillOpen}
                                    </td>
                                </tr>
                            ))}
                            {total > 0 && (
                                <tr className="border-t-2 border-stroke bg-gray-2/50 font-semibold dark:border-stroke-dark dark:bg-[#1a2535]">
                                    <td
                                        className="px-4 py-3 text-sm text-dark dark:text-white"
                                        colSpan={2}
                                    >
                                        Total
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {totals.issuesCreated}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {totals.issuesAssigned}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {totals.issuesResolved}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-dark dark:text-white">
                                        {totals.issuesStillOpen}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
                {!loading && total > PAGE_SIZE && (
                    <div className="border-t border-stroke dark:border-stroke-dark">
                        <Pagination
                            page={page}
                            totalItems={total}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
