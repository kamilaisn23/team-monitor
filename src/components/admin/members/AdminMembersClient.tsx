"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import Pagination from "@/components/ui/pagination";

const PAGE_SIZE = 10;

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

export default function AdminMembersClient() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [page, setPage] = useState(1);

    const load = useCallback(() => {
        setLoading(true);
        fetch("/api/members")
            .then((r) => r.json())
            .then((data) => {
                setMembers(data as Member[]);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (id: string) => {
        setDeleting(true);
        await fetch(`/api/members/${id}`, { method: "DELETE" });
        setDeleteConfirm(null);
        setDeleting(false);
        load();
    };

    // Unassigned members shown first
    const sorted = [...members].sort((a, b) => {
        if (a.role === "UNASSIGNED" && b.role !== "UNASSIGNED") return -1;
        if (a.role !== "UNASSIGNED" && b.role === "UNASSIGNED") return 1;
        return a.name.localeCompare(b.name);
    });

    const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-dark dark:text-white">
                        Members
                    </h2>
                    <p className="text-sm text-body dark:text-dark-6">
                        Manage team members and username mappings
                    </p>
                </div>
                <Link
                    href="/admin/members/new"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                    Add Member
                </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                {loading ? (
                    <div className="p-8 text-center text-body">Loading...</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-stroke bg-gray-2 dark:border-stroke-dark dark:bg-[#1a2535]">
                                {[
                                    "Member",
                                    "Role",
                                    "GitHub",
                                    "GitLab",
                                    "Teams",
                                    "Last Login",
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
                            {paginated.map((member) => (
                                <tr
                                    key={member.id}
                                    className={`border-b border-stroke last:border-0 hover:bg-gray-2/50 dark:border-stroke-dark dark:hover:bg-[#1a2535]/50 ${
                                        member.role === "UNASSIGNED"
                                            ? "bg-yellow-50/50 dark:bg-yellow-900/10"
                                            : ""
                                    }`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
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
                                            <Link
                                                href={`/members/${member.id}`}
                                                className="font-medium text-dark hover:text-primary dark:text-white"
                                            >
                                                {member.name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                member.role === "UNASSIGNED"
                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                            }`}
                                        >
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-body dark:text-dark-6">
                                        {member.usernameGithub || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-body dark:text-dark-6">
                                        {member.usernameGitlab || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-body dark:text-dark-6">
                                        {member.teams
                                            .map((t) => t.name)
                                            .join(", ") || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-body dark:text-dark-6">
                                        {member.lastLoginAt
                                            ? dayjs(member.lastLoginAt).format(
                                                  "MMM D, YYYY",
                                              )
                                            : "Never"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/admin/members/${member.id}/edit`}
                                                className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() =>
                                                    setDeleteConfirm(member.id)
                                                }
                                                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <Pagination
                    page={page}
                    totalItems={sorted.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    className="border-t border-stroke dark:border-stroke-dark"
                />
            </div>

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-dark">
                        <h3 className="mb-2 text-lg font-bold text-dark dark:text-white">
                            Delete Member
                        </h3>
                        <p className="mb-4 text-sm text-body dark:text-dark-6">
                            Are you sure? This will remove the member.
                            Historical issue data will be preserved but
                            unlinked.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-stroke-dark dark:text-white dark:hover:bg-[#1a2535]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
