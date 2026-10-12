"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { WorkloadLevel } from "@/types";
import Pagination from "@/components/ui/pagination";
import { Icon, type IconName } from "@/components/ui/icon";
import { useTeamScope } from "@/components/Layouts/team-scope";
import {
  getPreviewDashboard,
  getPreviewIssues,
  previewRepositories,
} from "./preview-data";
import { PreviewMemberDialog } from "./PreviewMemberDialog";
import { DetailsDialog } from "@/components/ui/details-dialog";
import { PreviewIssueList } from "@/components/preview/PreviewIssueList";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DashboardMember {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  teams: { id: string; name: string }[];
  currentLoad: number;
  workloadLevel: WorkloadLevel;
}
interface Summary {
  memberCount: number;
  activeMembers: number;
  totalOpenIssues: number;
  highWorkload: number;
  staleIssues: number;
  distribution: Record<WorkloadLevel, number>;
}
export interface DashboardResponse {
  total: number;
  data: DashboardMember[];
  summary: Summary;
  thresholds: { lowMax: number; mediumMax: number; staleDays: number };
  teamOverview: {
    id: string;
    name: string;
    memberCount: number;
    assignments: number;
    highWorkload: number;
  }[];
}
type SortColumn = "name" | "role" | "currentLoad" | "workloadLevel";
const PAGE_SIZE = 10;
const levels: { id: WorkloadLevel; label: string; color: string }[] = [
  { id: "low", label: "Ringan", color: "#5C9CE6" },
  { id: "medium", label: "Sedang", color: "#F5B64D" },
  { id: "high", label: "Tinggi", color: "#F07D87" },
];
const roles: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  DEVELOPER: "Developer",
  UNASSIGNED: "Belum ditentukan",
};

function MemberAvatar({ member }: { member: DashboardMember }) {
  return member.avatarUrl ? (
    <Image
      src={member.avatarUrl}
      alt=""
      width={40}
      height={40}
      className="tm-avatar"
    />
  ) : (
    <span className="tm-avatar tm-avatar-initials">
      {member.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}

export default function DashboardClient({
  preview = false,
}: {
  preview?: boolean;
}) {
  const { teams, teamId, setTeamId, reloadTeams } = useTeamScope();
  const router = useRouter();
  const isMobile = useIsMobile();
  const directory = useRef<HTMLElement>(null);
  const memberSearch = useRef<HTMLInputElement>(null);
  const [details, setDetails] = useState<"open" | "stale" | "capacity" | null>(
    null,
  );
  const [response, setResponse] = useState<DashboardResponse | null>(() =>
    preview
      ? getPreviewDashboard(
          new URLSearchParams({
            active: "true",
            sortCol: "currentLoad",
            sortDir: "desc",
          }),
        )
      : null,
  );
  const [loading, setLoading] = useState(!preview);
  const [previewMember, setPreviewMember] = useState<DashboardMember | null>(
    null,
  );
  const [error, setError] = useState("");
  const [repoError, setRepoError] = useState(false);
  const [platform, setPlatform] = useState("all");
  const [active, setActive] = useState("active");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [repos, setRepos] = useState<{ id: string; name: string }[]>(
    preview ? previewRepositories : [],
  );
  const [repoId, setRepoId] = useState("");
  const [workload, setWorkload] = useState("all");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<SortColumn>("currentLoad");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (isMobile) setView("grid");
  }, [isMobile]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(name.trim()), 250);
    return () => clearTimeout(timer);
  }, [name]);
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    fetch("/api/repositories?ignored=false", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error();
        setRepos(data);
        setRepoError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRepoError(true);
      });
    return () => controller.abort();
  }, [revision, preview]);
  useEffect(() => {
    setPage(1);
  }, [teamId, repoId, platform, active, search, workload, sortCol, sortDir]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortCol,
      sortDir,
    });
    if (teamId) params.set("teamId", teamId);
    if (repoId) params.set("repositoryId", repoId);
    if (platform !== "all") params.set("platform", platform);
    if (active !== "all") params.set("active", String(active === "active"));
    if (search) params.set("name", search);
    if (workload !== "all") params.set("workload", workload);
    if (preview) {
      const data = getPreviewDashboard(params);
      setResponse(data);
      setLoading(false);
      const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
      if (page > lastPage) setPage(lastPage);
      return () => controller.abort();
    }
    fetch(`/api/dashboard?${params}`, { signal: controller.signal })
      .then(async (r) => {
        if (
          !r.ok ||
          !r.headers.get("content-type")?.includes("application/json")
        )
          throw new Error();
        return r.json();
      })
      .then((data: DashboardResponse) => {
        if (!Array.isArray(data.data) || !data.summary) throw new Error();
        setResponse(data);
        const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResponse(null);
          setError("Data dasbor belum dapat dimuat. Silakan coba kembali.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    teamId,
    repoId,
    platform,
    active,
    search,
    workload,
    page,
    sortCol,
    sortDir,
    revision,
    preview,
  ]);

  const profileLink = (member: DashboardMember) => ({
    href: preview
      ? `/preview#${member.memberId}`
      : `/members/${member.memberId}`,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (preview) {
        event.preventDefault();
        setPreviewMember(member);
      }
    },
  });

  const summary = response?.summary;
  const thresholds = response?.thresholds;
  const scopeName =
    teams.find((team) => team.id === teamId)?.name ?? "Semua tim";
  const filterCount =
    Number(!!repoId) +
    Number(platform !== "all") +
    Number(active !== "active") +
    Number(workload !== "all") +
    Number(!!search);
  const clearFilters = () => {
    setRepoId("");
    setPlatform("all");
    setActive("active");
    setWorkload("all");
    setName("");
    setSearch("");
    setPage(1);
  };
  const refresh = () => {
    setRevision((v) => v + 1);
    reloadTeams();
  };
  const sort = (column: SortColumn) => {
    setSortCol(column);
    setSortDir(sortCol === column && sortDir === "desc" ? "asc" : "desc");
  };
  const focusDirectory = (tier = "all", cards = false) => {
    setWorkload(tier);
    setPage(1);
    setView(cards ? "grid" : "list");
    directory.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    memberSearch.current?.focus({ preventScroll: true });
  };
  const inspectStat = (icon: IconName) => {
    if (icon === "users") focusDirectory("all", true);
    else if (icon === "activity") focusDirectory("high");
    else if (icon === "clock") setDetails("stale");
    else if (preview) setDetails("open");
    else {
      setSortCol("currentLoad");
      setSortDir("desc");
      focusDirectory();
    }
  };
  const issueScope = new URLSearchParams();
  if (teamId) issueScope.set("teamId", teamId);
  if (repoId) issueScope.set("repositoryId", repoId);
  if (platform !== "all") issueScope.set("platform", platform);
  if (active !== "all") issueScope.set("active", String(active === "active"));
  if (search) issueScope.set("name", search);
  const detailIssues = preview
    ? getPreviewIssues(issueScope).filter(
        (i) => details !== "stale" || i.ageDays > (thresholds?.staleDays ?? 30),
      )
    : [];
  const percent = (level: WorkloadLevel) =>
    summary?.memberCount
      ? (summary.distribution[level] / summary.memberCount) * 100
      : 0;
  const lowPercent = percent("low");
  const mediumPercent = percent("medium");
  const donut = summary?.memberCount
    ? `conic-gradient(#5C9CE6 0% ${lowPercent}%, #F5B64D ${lowPercent}% ${lowPercent + mediumPercent}%, #F07D87 ${lowPercent + mediumPercent}% 100%)`
    : "conic-gradient(#2B3A55 0% 100%)";
  const stats: {
    label: string;
    value: number | undefined;
    detail: string;
    icon: IconName;
    tone: string;
  }[] = [
    {
      label: "Anggota tim",
      value: summary?.memberCount,
      detail: summary
        ? `${summary.activeMembers} anggota aktif dalam cakupan`
        : "Anggota dalam cakupan terpilih",
      icon: "users",
      tone: "blue",
    },
    {
      label: "Isu terbuka",
      value: summary?.totalOpenIssues,
      detail: "Isu unik dari GitHub & GitLab",
      icon: "issue",
      tone: "violet",
    },
    {
      label: "Beban tinggi",
      value: summary?.highWorkload,
      detail: "Anggota yang perlu ditinjau",
      icon: "activity",
      tone: "rose",
    },
    {
      label: "Isu mengendap",
      value: summary?.staleIssues,
      detail: thresholds
        ? `Terbuka lebih dari ${thresholds.staleDays} hari`
        : "Isu yang melewati batas usia",
      icon: "clock",
      tone: "amber",
    },
  ];

  const sortHeading = (column: SortColumn, label: string) => (
    <th
      aria-sort={
        sortCol === column
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button onClick={() => sort(column)}>
        {label}
        <span
          aria-hidden="true"
          className={sortCol === column ? "text-primary" : "opacity-40"}
        >
          {sortCol === column ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );

  return (
    <div className="tm-dashboard">
      <div className="tm-page-heading">
        <div>
          <div className="tm-eyebrow">
            <span /> ENGINEERING OVERVIEW
          </div>
          <h1>
            Ringkasan tim<span className="text-primary">.</span>
          </h1>
          <p>Pahami beban kerja. Jaga ritme tim. Fokus pada yang penting.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="tm-button tm-button-secondary"
            onClick={refresh}
            disabled={loading}
          >
            <Icon
              name="refresh"
              className={loading ? "animate-spin" : ""}
              width={16}
              height={16}
            />{" "}
            Muat ulang
          </button>
          <Link
            href={preview ? "/preview?section=reports" : "/reports"}
            className="tm-button tm-button-primary"
          >
            Lihat laporan
            <Icon name="arrow" width={16} height={16} />
          </Link>
        </div>
      </div>

      <div className="tm-scope-line">
        <span className="tm-scope-chip">
          <Icon name="layers" width={15} height={15} />
          {scopeName}
        </span>
        <span className="tm-muted">
          {teamId
            ? "Cakupan anggota tim terpilih"
            : "Gambaran seluruh organisasi"}
        </span>
        {teamId && (
          <button
            className="tm-text-button ml-auto"
            onClick={() => setTeamId("")}
          >
            Lihat semua tim <Icon name="close" width={13} height={13} />
          </button>
        )}
      </div>
      {error && (
        <div role="alert" className="tm-error">
          <Icon name="issue" />
          <span>{error}</span>
          <button onClick={refresh}>Coba lagi</button>
        </div>
      )}
      <div className="tm-stat-grid" aria-busy={loading}>
        {stats.map((stat) => (
          <button
            type="button"
            className={`tm-stat tm-stat-${stat.tone} tm-clickable-card`}
            key={stat.label}
            disabled={loading || !summary}
            onClick={() => inspectStat(stat.icon)}
            aria-label={`Lihat detail ${stat.label.toLowerCase()}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="tm-stat-label">{stat.label}</span>
              <span className={`tm-stat-icon tm-tone-${stat.tone}`}>
                <Icon name={stat.icon} width={20} height={20} />
              </span>
            </div>
            {loading ? (
              <div className="tm-skeleton mt-3 h-10 w-20" />
            ) : (
              <strong>
                {stat.value === undefined
                  ? "—"
                  : stat.value.toLocaleString("id-ID")}
              </strong>
            )}
            <p>{stat.detail}</p>
            <div className="tm-stat-accent" />
            <span className="tm-card-cue" aria-hidden="true">
              <Icon name="arrow" width={14} height={14} />
            </span>
          </button>
        ))}
      </div>

      <div className="tm-insight-grid">
        <section
          className="tm-capacity tm-clickable-panel"
          aria-labelledby="capacity-title"
          aria-busy={loading}
        >
          <button
            type="button"
            className="tm-card-hit-area"
            aria-label="Lihat detail kapasitas tim"
            onClick={() => setDetails("capacity")}
            disabled={loading || !summary}
          />
          <div className="tm-panel-heading">
            <div>
              <div className="tm-eyebrow">TEAM CAPACITY</div>
              <h2 id="capacity-title">Ruang untuk tumbuh.</h2>
              <p>Distribusi beban kerja dalam cakupan saat ini.</p>
            </div>
            <span className="tm-capacity-icon">
              <Icon name="activity" width={21} height={21} />
            </span>
          </div>
          <div className="tm-capacity-body">
            <div
              className="tm-donut"
              style={{ background: loading ? "#2B3A55" : donut }}
              role="img"
              aria-label={
                loading
                  ? "Memuat distribusi"
                  : `Distribusi: ${summary?.distribution.low ?? 0} ringan, ${summary?.distribution.medium ?? 0} sedang, ${summary?.distribution.high ?? 0} tinggi`
              }
            >
              <div>
                <strong>
                  {loading || !summary ? "—" : summary.memberCount}
                </strong>
                <span>anggota</span>
              </div>
            </div>
            <div className="tm-capacity-legend">
              {levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() =>
                    setWorkload(workload === level.id ? "all" : level.id)
                  }
                  className={workload === level.id ? "is-selected" : ""}
                  aria-pressed={workload === level.id}
                >
                  <span
                    className="tm-status-dot"
                    style={{ background: level.color }}
                  />
                  <span>
                    {level.label}
                    <small>
                      {thresholds
                        ? level.id === "low"
                          ? `0–${thresholds.lowMax} isu`
                          : level.id === "medium"
                            ? `${thresholds.lowMax + 1}–${thresholds.mediumMax} isu`
                            : `${thresholds.mediumMax + 1}+ isu`
                        : "Berdasarkan ambang sistem"}
                    </small>
                  </span>
                  <strong>
                    {loading || !summary ? "—" : summary.distribution[level.id]}
                  </strong>
                  <em>
                    {loading || !summary
                      ? "—"
                      : `${Math.round(percent(level.id))}%`}
                  </em>
                </button>
              ))}
            </div>
          </div>
          <div className="tm-capacity-footer">
            <Icon
              name={summary?.highWorkload ? "issue" : "layers"}
              width={15}
              height={15}
            />
            <span>
              {loading
                ? "Menyiapkan ringkasan kapasitas..."
                : !summary
                  ? "Ringkasan kapasitas belum tersedia"
                  : summary.memberCount === 0
                    ? "Belum ada anggota dalam cakupan ini"
                    : summary.highWorkload
                      ? `${summary.highWorkload} anggota memerlukan perhatian pada beban kerja`
                      : "Seluruh anggota berada di bawah ambang beban tinggi"}
            </span>
          </div>
        </section>

        <section
          className="tm-panel tm-team-panel tm-clickable-panel"
          aria-labelledby="teams-title"
        >
          <button
            type="button"
            className="tm-card-hit-area"
            aria-label="Buka direktori tim"
            onClick={() =>
              preview
                ? router.push("/preview?section=teams")
                : (setShowFilters(true), focusDirectory())
            }
          />
          <div className="tm-panel-heading">
            <div>
              <h2 id="teams-title">Tim dalam cakupan</h2>
              <p>Jelajahi kapasitas setiap tim.</p>
            </div>
            <span className="tm-small-tag">
              {loading ? "—" : (response?.teamOverview.length ?? "—")} tim
            </span>
          </div>
          <div className="tm-team-list">
            {loading ? (
              [1, 2, 3].map((n) => <div key={n} className="tm-skeleton h-14" />)
            ) : response?.teamOverview.length ? (
              response.teamOverview.map((team, i) => (
                <button
                  key={team.id}
                  className="tm-team-row"
                  onClick={() => setTeamId(team.id)}
                >
                  <span className={`tm-team-symbol tm-team-symbol-${i % 3}`}>
                    <Icon name="layers" width={18} height={18} />
                  </span>
                  <span className="tm-team-copy">
                    <strong>{team.name}</strong>
                    <small>
                      {team.memberCount} anggota · {team.assignments} penugasan
                      terbuka
                    </small>
                  </span>
                  <span
                    className={`tm-team-risk ${team.highWorkload ? "has-risk" : ""}`}
                  >
                    {team.highWorkload
                      ? `${team.highWorkload} beban tinggi`
                      : "Tinjau tim"}
                  </span>
                  <Icon name="chevron" width={14} height={14} />
                </button>
              ))
            ) : (
              <div className="tm-compact-empty">
                <Icon name="layers" width={26} height={26} />
                <p>
                  {error
                    ? "Data tim belum tersedia."
                    : "Tidak ada tim dalam cakupan ini."}
                </p>
              </div>
            )}
          </div>
          <p className="tm-panel-footnote">
            Anggota multi-tim dapat muncul di lebih dari satu tim.
          </p>
        </section>
      </div>

      <section
        ref={directory}
        className="tm-panel tm-members-panel tm-card-target"
        aria-labelledby="members-title"
      >
        <div className="tm-members-heading">
          <div>
            <h2 id="members-title">
              Beban kerja anggota{" "}
              <span className="tm-count">
                {loading ? "…" : (response?.total ?? "—")}
              </span>
            </h2>
            <p>Temukan anggota dan lihat detail aktivitasnya.</p>
          </div>
          <div
            className="tm-view-switch"
            role="group"
            aria-label="Tampilan anggota"
          >
            <button
              onClick={() => setView("list")}
              className={view === "list" ? "active" : ""}
              aria-pressed={view === "list"}
              aria-label="Tampilan tabel"
            >
              <Icon name="list" width={17} height={17} />
            </button>
            <button
              onClick={() => setView("grid")}
              className={view === "grid" ? "active" : ""}
              aria-pressed={view === "grid"}
              aria-label="Tampilan kartu"
            >
              <Icon name="grid" width={17} height={17} />
            </button>
          </div>
        </div>
        <div className="tm-toolbar">
          <label className="tm-search">
            <Icon name="search" width={18} height={18} />
            <span className="sr-only">Cari nama anggota</span>
            <input
              type="search"
              ref={memberSearch}
              placeholder="Cari nama anggota..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div
            className="tm-level-tabs"
            role="group"
            aria-label="Filter beban kerja"
          >
            {[{ id: "all", label: "Semua" }, ...levels].map((level) => (
              <button
                key={level.id}
                aria-pressed={workload === level.id}
                className={workload === level.id ? "active" : ""}
                onClick={() => setWorkload(level.id)}
              >
                {level.label}
              </button>
            ))}
          </div>
          <button
            className={`tm-button tm-filter-button ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="dashboard-filters"
          >
            <Icon name="filter" width={17} height={17} />
            Filter{filterCount > 0 && <span>{filterCount}</span>}
          </button>
        </div>
        {showFilters && (
          <div className="tm-filter-row" id="dashboard-filters">
            <label>
              Repositori
              <select
                value={repoId}
                disabled={repoError}
                onChange={(e) => setRepoId(e.target.value)}
              >
                <option value="">
                  {repoError ? "Repositori belum tersedia" : "Semua repositori"}
                </option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Platform
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="all">Semua platform</option>
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </label>
            <label>
              Status anggota
              <select
                value={active}
                onChange={(e) => setActive(e.target.value)}
              >
                <option value="active">Anggota aktif</option>
                <option value="inactive">Anggota nonaktif</option>
                <option value="all">Semua anggota</option>
              </select>
            </label>
            <button className="tm-text-button" onClick={clearFilters}>
              Reset filter <Icon name="close" width={13} height={13} />
            </button>
          </div>
        )}
        {filterCount > 0 && !showFilters && (
          <div className="tm-applied-filters">
            <span>{filterCount} filter diterapkan</span>
            <button onClick={clearFilters}>Reset filter</button>
          </div>
        )}
        <div aria-busy={loading}>
          {loading ? (
            <div className="tm-table-loading" role="status">
              <span className="sr-only">Memuat anggota...</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-4">
                  <span className="tm-skeleton size-10 rounded-full" />
                  <span className="tm-skeleton h-4 w-40" />
                  <span className="tm-skeleton ml-auto h-5 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="tm-empty">
              <Icon name="issue" width={36} height={36} />
              <h3>Data belum tersedia</h3>
              <p>Coba muat ulang untuk mengambil data terbaru.</p>
              <button
                className="tm-button tm-button-secondary"
                onClick={refresh}
              >
                Coba lagi
              </button>
            </div>
          ) : !response?.data.length ? (
            <div className="tm-empty">
              <span className="tm-empty-icon">
                <Icon name="users" width={30} height={30} />
              </span>
              <h3>Belum ada anggota yang cocok</h3>
              <p>Coba ubah cakupan tim atau reset filter pencarian.</p>
              <button
                className="tm-button tm-button-secondary"
                onClick={() => {
                  clearFilters();
                  setTeamId("");
                }}
              >
                Reset pencarian
              </button>
            </div>
          ) : view === "list" ? (
            <div className="tm-table-scroll">
              <table className="tm-member-table">
                <thead>
                  <tr>
                    {sortHeading("name", "Anggota")}
                    {sortHeading("role", "Peran")}
                    <th>Tim</th>
                    {sortHeading("currentLoad", "Isu terbuka")}
                    {sortHeading("workloadLevel", "Beban kerja")}
                    <th>
                      <span className="sr-only">Profil</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {response.data.map((member) => (
                    <tr key={member.memberId}>
                      <td>
                        <Link
                          {...profileLink(member)}
                          className="tm-member-link"
                        >
                          <MemberAvatar member={member} />
                          <span>
                            <strong>{member.name}</strong>
                            <small>
                              <span
                                className={`tm-online-dot ${member.isActive ? "is-active" : ""}`}
                              />
                              {member.isActive ? "Aktif" : "Nonaktif"}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="tm-role">
                          {roles[member.role] ?? member.role}
                        </span>
                      </td>
                      <td>
                        <div className="tm-team-pills">
                          {member.teams.length ? (
                            member.teams.map((team) => (
                              <button
                                key={team.id}
                                onClick={() => setTeamId(team.id)}
                              >
                                {team.name}
                              </button>
                            ))
                          ) : (
                            <span className="tm-muted">Belum ada tim</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="tm-load-value">
                          <strong>{member.currentLoad}</strong>
                          <div>
                            <span
                              className={`tm-load-${member.workloadLevel}`}
                              style={{
                                width: `${Math.min(100, (member.currentLoad / Math.max(1, (thresholds?.mediumMax ?? 7) + 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`tm-workload tm-workload-${member.workloadLevel}`}
                        >
                          <span />
                          {
                            levels.find((l) => l.id === member.workloadLevel)
                              ?.label
                          }
                        </span>
                      </td>
                      <td>
                        <Link
                          className="tm-row-arrow"
                          {...profileLink(member)}
                          aria-label={`Lihat profil ${member.name}`}
                        >
                          <Icon name="arrow" width={18} height={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tm-member-cards">
              {response.data.map((member) => (
                <Link
                  {...profileLink(member)}
                  className="tm-member-card"
                  key={member.memberId}
                >
                  <div className="flex items-center justify-between">
                    <MemberAvatar member={member} />
                    <span
                      className={`tm-workload tm-workload-${member.workloadLevel}`}
                    >
                      <span />
                      {levels.find((l) => l.id === member.workloadLevel)?.label}
                    </span>
                  </div>
                  <h3>{member.name}</h3>
                  <p>
                    {roles[member.role] ?? member.role} ·{" "}
                    {member.isActive ? "Aktif" : "Nonaktif"}
                  </p>
                  <div className="tm-card-teams">
                    {member.teams.map((t) => t.name).join(" · ") ||
                      "Belum ada tim"}
                  </div>
                  <div className="tm-member-card-footer">
                    <span>
                      <strong>{member.currentLoad}</strong> isu terbuka
                    </span>
                    <Icon name="arrow" width={18} height={18} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        {!loading && !error && response && response.total > 0 && (
          <>
            <Pagination
              page={page}
              totalItems={response.total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              className="tm-pagination border-t border-stroke"
            />
            {response.total <= PAGE_SIZE && (
              <div className="tm-table-footer">
                Menampilkan {response.total} anggota
                <span>
                  {preview
                    ? "Data contoh untuk pratinjau"
                    : "Data dari sinkronisasi terakhir"}
                </span>
              </div>
            )}
          </>
        )}
      </section>
      <footer className="tm-dashboard-footer">
        <span>
          TEAM MONITOR <span className="opacity-50">/</span> ENGINEERING
          WORKSPACE
        </span>
        <span>Dirancang untuk ritme kerja yang lebih baik.</span>
      </footer>
      {previewMember && (
        <PreviewMemberDialog
          member={previewMember}
          onClose={() => setPreviewMember(null)}
        />
      )}
      {details && (
        <DetailsDialog
          title={
            details === "capacity"
              ? "Kapasitas tim"
              : details === "stale"
                ? "Detail isu mengendap"
                : "Detail isu terbuka"
          }
          description={
            details === "capacity"
              ? `${scopeName} · ${summary?.memberCount ?? 0} anggota dalam cakupan`
              : `${scopeName} · ${details === "stale" ? `Isu terbuka lebih dari ${thresholds?.staleDays ?? 30} hari` : "Isu terbuka dalam cakupan terpilih"}`
          }
          onClose={() => setDetails(null)}
        >
          {details === "capacity" ? (
            <div className="tm-detail-list">
              {levels.map((level) => (
                <button
                  type="button"
                  className="tm-detail-row"
                  key={level.id}
                  onClick={() => {
                    setDetails(null);
                    focusDirectory(level.id);
                  }}
                >
                  <span className={`tm-workload tm-workload-${level.id}`}>
                    <span />
                    {level.label}
                  </span>
                  <span className="tm-detail-row-copy">
                    <strong>
                      {summary?.distribution[level.id] ?? 0} anggota
                    </strong>
                    <small>
                      Klik untuk menampilkan anggota pada kategori ini.
                    </small>
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
          ) : preview ? (
            <PreviewIssueList
              issues={detailIssues}
              onMember={(member) => {
                setDetails(null);
                setPreviewMember(member);
              }}
            />
          ) : (
            <div>
              <p className="tm-detail-intro">
                {summary?.staleIssues ?? 0} isu melewati ambang usia dalam
                cakupan ini. Buka profil anggota untuk memeriksa daftar isu dan
                statusnya.
              </p>
              <div className="tm-detail-list">
                {response?.data.map((member) => (
                  <Link
                    className="tm-detail-row"
                    key={member.memberId}
                    href={`/members/${member.memberId}`}
                  >
                    <MemberAvatar member={member} />
                    <span className="tm-detail-row-copy">
                      <strong>{member.name}</strong>
                      <small>{member.currentLoad} isu terbuka</small>
                    </span>
                    <Icon name="arrow" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </DetailsDialog>
      )}
    </div>
  );
}
