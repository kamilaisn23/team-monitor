"use client";
import { createContext, useContext, useEffect, useState } from "react";

export interface ScopeTeam {
  id: string;
  name: string;
  memberCount: number;
  isArchived?: boolean;
}
const TeamScopeContext = createContext<{
  teams: ScopeTeam[];
  teamId: string;
  setTeamId: (id: string) => void;
  loading: boolean;
  error: boolean;
  reloadTeams: () => void;
} | null>(null);

export function TeamScopeProvider({
  children,
  previewTeams,
}: {
  children: React.ReactNode;
  previewTeams?: ScopeTeam[];
}) {
  const [teams, setTeams] = useState<ScopeTeam[]>(previewTeams ?? []);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(!previewTeams);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (previewTeams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch("/api/teams", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: ScopeTeam[]) => {
        if (!Array.isArray(data)) throw new Error();
        setTeams(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, previewTeams]);
  return (
    <TeamScopeContext.Provider
      value={{
        teams,
        teamId,
        setTeamId,
        loading,
        error,
        reloadTeams: () => setRevision((v) => v + 1),
      }}
    >
      {children}
    </TeamScopeContext.Provider>
  );
}
export function useTeamScope() {
  const scope = useContext(TeamScopeContext);
  if (!scope) throw new Error("TeamScopeProvider is required");
  return scope;
}
