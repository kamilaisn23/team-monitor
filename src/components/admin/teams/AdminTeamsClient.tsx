"use client";

import { useState, useEffect, useCallback } from "react";
import Pagination from "@/components/ui/pagination";

const TEAMS_PAGE_SIZE = 10;

interface Team {
    id: string;
    name: string;
    kerjabaikProjectId: string | null;
    memberCount: number;
}

interface Member {
    id: string;
    name: string;
    avatarUrl: string | null;
    teams: { id: string; name: string }[];
}

interface Props {
    kerjabaikEnabled?: boolean;
    kerjabaikBaseUrl?: string;
}

export default function AdminTeamsClient({ kerjabaikEnabled = false, kerjabaikBaseUrl = "" }: Props) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [teamMembers, setTeamMembers] = useState<Member[]>([]);
    const [newTeamName, setNewTeamName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [teamsPage, setTeamsPage] = useState(1);

    const loadTeams = useCallback(() => {
        fetch("/api/teams")
            .then((r) => r.json())
            .then((data) => {
                setTeams(data as Team[]);
                setLoading(false);
            });
    }, []);

    const loadMembers = useCallback(() => {
        fetch("/api/members")
            .then((r) => r.json())
            .then((data) => setMembers(data as Member[]));
    }, []);

    useEffect(() => {
        loadTeams();
        loadMembers();
    }, [loadTeams, loadMembers]);

    const loadTeamMembers = useCallback((teamId: string) => {
        fetch(`/api/members?teamId=${teamId}`)
            .then((r) => r.json())
            .then((data) => setTeamMembers(data as Member[]));
    }, []);

    useEffect(() => {
        if (selectedTeam) loadTeamMembers(selectedTeam.id);
    }, [selectedTeam, loadTeamMembers]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        setError("");
        const res = await fetch("/api/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newTeamName.trim() }),
        });
        if (!res.ok) {
            const d = (await res.json()) as { error: string };
            setError(d.error);
            return;
        }
        setNewTeamName("");
        loadTeams();
    };

    const handleRename = async (id: string) => {
        if (!editName.trim()) return;
        const res = await fetch(`/api/teams/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: editName.trim() }),
        });
        if (!res.ok) {
            const d = (await res.json()) as { error: string };
            setError(d.error);
            return;
        }
        setEditingId(null);
        loadTeams();
        if (selectedTeam?.id === id)
            setSelectedTeam((prev) =>
                prev ? { ...prev, name: editName.trim() } : null,
            );
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/teams/${id}`, { method: "DELETE" });
        setDeleteConfirm(null);
        if (selectedTeam?.id === id) setSelectedTeam(null);
        loadTeams();
    };

    const handleAddMember = async (memberId: string) => {
        if (!selectedTeam) return;
        await fetch(`/api/teams/${selectedTeam.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId }),
        });
        loadTeamMembers(selectedTeam.id);
        loadTeams();
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!selectedTeam) return;
        await fetch(`/api/teams/${selectedTeam.id}/members/${memberId}`, {
            method: "DELETE",
        });
        loadTeamMembers(selectedTeam.id);
        loadTeams();
    };

    const teamMemberIds = new Set(teamMembers.map((m) => m.id));
    const availableMembers = members.filter((m) => !teamMemberIds.has(m.id));
    const pagedTeams = teams.slice(
        (teamsPage - 1) * TEAMS_PAGE_SIZE,
        teamsPage * TEAMS_PAGE_SIZE,
    );

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-dark dark:text-white">
                    Teams
                </h2>
                {kerjabaikEnabled && (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Read-only — managed in kerjabaik
                    </span>
                )}
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Team list */}
                <div className="rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                    <div className="border-b border-stroke p-4 dark:border-stroke-dark">
                        <h3 className="font-semibold text-dark dark:text-white">
                            All Teams
                        </h3>
                    </div>

                    {/* Create team — hidden when kerjabaik manages teams */}
                    {!kerjabaikEnabled && (
                        <div className="border-b border-stroke p-4 dark:border-stroke-dark">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && handleCreateTeam()
                                    }
                                    placeholder="New team name"
                                    className="flex-1 rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                                />
                                <button
                                    onClick={handleCreateTeam}
                                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        {loading ? (
                            <div className="p-4 text-center text-body">
                                Loading...
                            </div>
                        ) : teams.length === 0 ? (
                            <div className="p-4 text-center text-body">
                                No teams yet.
                            </div>
                        ) : (
                            pagedTeams.map((team) => (
                                <div
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team)}
                                    className={`flex cursor-pointer items-center justify-between border-b border-stroke p-4 last:border-0 hover:bg-gray-2/50 dark:border-stroke-dark dark:hover:bg-[#1a2535]/50 ${
                                        selectedTeam?.id === team.id
                                            ? "bg-primary/5 dark:bg-primary/10"
                                            : ""
                                    }`}
                                >
                                    {editingId === team.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) =>
                                                setEditName(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    handleRename(team.id);
                                                if (e.key === "Escape")
                                                    setEditingId(null);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 rounded border border-stroke px-2 py-1 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                                            autoFocus
                                        />
                                    ) : (
                                        <div>
                                            <p className="font-medium text-dark dark:text-white">
                                                {team.name}
                                            </p>
                                            <p className="text-xs text-body dark:text-dark-6">
                                                {team.memberCount} members
                                            </p>
                                        </div>
                                    )}
                                    <div
                                        className="flex gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {kerjabaikEnabled ? (
                                            team.kerjabaikProjectId && (
                                                <a
                                                    href={`${kerjabaikBaseUrl}/projects/${team.kerjabaikProjectId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                                                >
                                                    View in kerjabaik ↗
                                                </a>
                                            )
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(team.id);
                                                        setEditName(team.name);
                                                    }}
                                                    className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setDeleteConfirm(team.id)
                                                    }
                                                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <Pagination
                        page={teamsPage}
                        totalItems={teams.length}
                        pageSize={TEAMS_PAGE_SIZE}
                        onPageChange={setTeamsPage}
                        className="border-t border-stroke dark:border-stroke-dark"
                    />
                </div>

                {/* Team detail */}
                <div className="rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
                    <div className="border-b border-stroke p-4 dark:border-stroke-dark">
                        <h3 className="font-semibold text-dark dark:text-white">
                            {selectedTeam
                                ? `Members in "${selectedTeam.name}"`
                                : "Select a team"}
                        </h3>
                    </div>

                    {selectedTeam ? (
                        <div>
                            {/* Add member dropdown — hidden when kerjabaik manages memberships */}
                            {!kerjabaikEnabled && availableMembers.length > 0 && (
                                <div className="border-b border-stroke p-4 dark:border-stroke-dark">
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value)
                                                handleAddMember(e.target.value);
                                            e.target.value = "";
                                        }}
                                        className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>
                                            Add member...
                                        </option>
                                        {availableMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {teamMembers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-body">
                                    No members in this team.
                                </div>
                            ) : (
                                teamMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between border-b border-stroke p-4 last:border-0 dark:border-stroke-dark"
                                    >
                                        <span className="text-sm font-medium text-dark dark:text-white">
                                            {member.name}
                                        </span>
                                        {!kerjabaikEnabled && (
                                            <button
                                                onClick={() =>
                                                    handleRemoveMember(member.id)
                                                }
                                                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-body">
                            Click a team to manage its members.
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirm — only shown when not in kerjabaik mode */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-dark">
                        <h3 className="mb-2 text-lg font-bold text-dark dark:text-white">
                            Delete Team
                        </h3>
                        <p className="mb-4 text-sm text-body dark:text-dark-6">
                            Members will be removed from this team. This cannot
                            be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark dark:border-stroke-dark dark:text-white"
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
