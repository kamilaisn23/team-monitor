"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { useTeamScope } from "@/components/Layouts/team-scope";
import {
  previewMembers,
  previewTeams,
  previewRepositories,
  previewIssues,
} from "@/components/dashboard/preview-data";
import { PreviewMemberDialog } from "@/components/dashboard/PreviewMemberDialog";
import type { DashboardMember } from "@/components/dashboard/DashboardClient";
import type { PreviewSection } from "./navigation";

const headings: Record<
  Exclude<PreviewSection, "dashboard">,
  { title: string; eyebrow: string; detail: string }
> = {
  reports: {
    title: "Laporan aktivitas",
    eyebrow: "WORKLOAD SNAPSHOT",
    detail: "Ringkasan penugasan seluruh tim, dalam satu laporan yang jelas.",
  },
  members: {
    title: "Anggota tim",
    eyebrow: "PEOPLE & COLLABORATION",
    detail: "Kenali anggota, peran, dan kapasitas mereka di setiap tim.",
  },
  teams: {
    title: "Ruang untuk setiap tim",
    eyebrow: "TEAM DIRECTORY",
    detail: "Seluruh tim, terhubung dalam satu workspace.",
  },
  repositories: {
    title: "Repositori",
    eyebrow: "CONNECTED WORK",
    detail: "Lihat sumber pekerjaan dari GitHub dan GitLab.",
  },
  settings: {
    title: "Pengaturan workspace",
    eyebrow: "WORKSPACE PREFERENCES",
    detail: "Simulasikan ambang beban kerja dan usia isu pada data contoh.",
  },
};
function Metric({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: number;
  icon: IconName;
  detail: string;
}) {
  return (
    <div className="tm-stat">
      <div className="flex items-center justify-between">
        <span className="tm-stat-label">{label}</span>
        <span className="tm-stat-icon tm-tone-blue">
          <Icon name={icon} />
        </span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
      <div className="tm-stat-accent" />
    </div>
  );
}
function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function PreviewSections({
  section,
}: {
  section: Exclude<PreviewSection, "dashboard">;
}) {
  const router = useRouter();
  const { setTeamId } = useTeamScope();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [selectedMember, setSelectedMember] = useState<DashboardMember | null>(
    null,
  );
  const [lowMax, setLowMax] = useState(3);
  const [mediumMax, setMediumMax] = useState(7);
  const [staleDays, setStaleDays] = useState(30);
  const heading = headings[section];
  const members = previewMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || m.isActive === (status === "active")),
  );
  const repositories = previewRepositories.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) &&
      (platform === "all" || r.platform === platform),
  );
  const openTeam = (id: string) => {
    setTeamId(id);
    router.push("/preview");
  };
  const exportSnapshot = () => {
    const rows = [
      ["Nama", "Peran", "Tim", "Isu terbuka", "Status"],
      ...members.map((m) => [
        m.name,
        m.role,
        m.teams.map((t) => t.name).join("; "),
        String(m.currentLoad),
        m.isActive ? "Aktif" : "Nonaktif",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "team-monitor-snapshot-contoh.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const validThresholds = lowMax >= 0 && mediumMax > lowMax && staleDays >= 1;
  const bands = [
    {
      id: "low",
      label: "Ringan",
      range: `0–${lowMax} isu`,
      count: previewMembers.filter((m) => m.currentLoad <= lowMax).length,
    },
    {
      id: "medium",
      label: "Sedang",
      range: `${lowMax + 1}–${mediumMax} isu`,
      count: previewMembers.filter(
        (m) => m.currentLoad > lowMax && m.currentLoad <= mediumMax,
      ).length,
    },
    {
      id: "high",
      label: "Tinggi",
      range: `${mediumMax + 1}+ isu`,
      count: previewMembers.filter((m) => m.currentLoad > mediumMax).length,
    },
  ];
  return (
    <div className="tm-preview-section">
      <div className="tm-page-heading">
        <div>
          <div className="tm-eyebrow">
            <span />
            {heading.eyebrow}
          </div>
          <h1>
            {heading.title}
            <span className="text-primary">.</span>
          </h1>
          <p>{heading.detail}</p>
        </div>
        {section === "reports" ? (
          <button
            className="tm-button tm-button-primary"
            onClick={exportSnapshot}
          >
            <Icon name="arrow" width={16} height={16} />
            Ekspor CSV contoh
          </button>
        ) : (
          <Link href="/login" className="tm-button tm-button-secondary">
            Masuk ke workspace
            <Icon name="arrow" width={16} height={16} />
          </Link>
        )}
      </div>

      {section === "reports" && (
        <>
          <div className="tm-preview-metrics">
            <Metric
              label="Anggota dalam laporan"
              value={members.length}
              icon="users"
              detail="Snapshot anggota contoh"
            />
            <Metric
              label="Penugasan terbuka"
              value={members.reduce((n, m) => n + m.currentLoad, 0)}
              icon="issue"
              detail="Seluruh penugasan pada snapshot"
            />
            <Metric
              label="Tim terhubung"
              value={previewTeams.length}
              icon="layers"
              detail="Termasuk anggota multi-tim"
            />
          </div>
          <section className="tm-panel tm-members-panel">
            <div className="tm-members-heading">
              <div>
                <h2>Snapshot beban kerja</h2>
                <p>Laporan contoh berdasarkan penugasan saat ini.</p>
              </div>
              <span className="tm-small-tag">Data contoh</span>
            </div>
            <div className="tm-toolbar">
              <label className="tm-search">
                <Icon name="search" />
                <span className="sr-only">Cari anggota dalam laporan</span>
                <input
                  placeholder="Cari nama anggota..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            <div className="tm-table-scroll">
              <table className="tm-member-table">
                <thead>
                  <tr>
                    <th>Anggota</th>
                    <th>Peran</th>
                    <th>Tim</th>
                    <th>Penugasan terbuka</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.memberId}>
                      <td>
                        <button
                          className="tm-member-link"
                          onClick={() => setSelectedMember(m)}
                        >
                          <span className="tm-avatar tm-avatar-initials">
                            {initials(m.name)}
                          </span>
                          <strong>{m.name}</strong>
                        </button>
                      </td>
                      <td>
                        <span className="tm-role">
                          {m.role === "MANAGER" ? "Manager" : "Developer"}
                        </span>
                      </td>
                      <td>{m.teams.map((t) => t.name).join(" · ")}</td>
                      <td>
                        <strong>{m.currentLoad}</strong>
                      </td>
                      <td>{m.isActive ? "Aktif" : "Nonaktif"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!members.length && (
              <div className="tm-compact-empty">
                Tidak ada anggota yang cocok.
              </div>
            )}
            <div className="tm-table-footer">
              {members.length} anggota
              <span>Ekspor mengikuti hasil pencarian</span>
            </div>
          </section>
        </>
      )}

      {section === "members" && (
        <section className="tm-panel tm-members-panel">
          <div className="tm-members-heading">
            <div>
              <h2>
                Direktori anggota{" "}
                <span className="tm-count">{members.length}</span>
              </h2>
              <p>Pilih anggota untuk melihat profil contoh.</p>
            </div>
          </div>
          <div className="tm-toolbar">
            <label className="tm-search">
              <Icon name="search" />
              <span className="sr-only">Cari nama anggota</span>
              <input
                placeholder="Cari nama anggota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="sr-only" htmlFor="preview-member-status">
              Status anggota
            </label>
            <select
              id="preview-member-status"
              className="tm-preview-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Semua anggota</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
          <div className="tm-member-cards">
            {members.map((m) => (
              <button
                key={m.memberId}
                className="tm-member-card text-left"
                onClick={() => setSelectedMember(m)}
              >
                <div className="flex items-center justify-between">
                  <span className="tm-avatar tm-avatar-initials">
                    {initials(m.name)}
                  </span>
                  <span className="tm-role">
                    {m.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <h3>{m.name}</h3>
                <p>{m.role === "MANAGER" ? "Manager" : "Developer"}</p>
                <div className="tm-card-teams">
                  {m.teams.map((t) => t.name).join(" · ")}
                </div>
                <div className="tm-member-card-footer">
                  <span>
                    <strong>{m.currentLoad}</strong> isu terbuka
                  </span>
                  <Icon name="arrow" />
                </div>
              </button>
            ))}
          </div>
          {!members.length && (
            <div className="tm-compact-empty">
              Tidak ada anggota yang cocok.
            </div>
          )}
        </section>
      )}

      {section === "teams" && (
        <>
          <div className="tm-preview-metrics">
            <Metric
              label="Tim"
              value={previewTeams.length}
              icon="layers"
              detail="Dalam workspace contoh"
            />
            <Metric
              label="Anggota unik"
              value={previewMembers.length}
              icon="users"
              detail="Kolaborasi lintas tim"
            />
            <Metric
              label="Repositori"
              value={previewRepositories.length}
              icon="branch"
              detail="GitHub dan GitLab"
            />
          </div>
          <div className="tm-preview-team-grid">
            {previewTeams.map((team, index) => {
              const teamMembers = previewMembers.filter((m) =>
                m.teams.some((t) => t.id === team.id),
              );
              return (
                <section
                  className="tm-panel tm-preview-team-card"
                  key={team.id}
                >
                  <div className="flex items-center justify-between">
                    <span className={`tm-team-symbol tm-team-symbol-${index}`}>
                      <Icon name="layers" />
                    </span>
                    <span className="tm-small-tag">
                      {teamMembers.filter((m) => m.isActive).length} aktif
                    </span>
                  </div>
                  <h2>{team.name}</h2>
                  <p>
                    {teamMembers.length} anggota ·{" "}
                    {teamMembers.reduce((n, m) => n + m.currentLoad, 0)}{" "}
                    penugasan terbuka
                  </p>
                  <div className="tm-preview-team-avatars">
                    {teamMembers.slice(0, 4).map((m) => (
                      <span
                        key={m.memberId}
                        className="tm-avatar tm-avatar-initials"
                        title={m.name}
                      >
                        {initials(m.name)}
                      </span>
                    ))}
                    {teamMembers.length > 4 && (
                      <span className="tm-avatar tm-avatar-initials">
                        +{teamMembers.length - 4}
                      </span>
                    )}
                  </div>
                  <button
                    className="tm-button tm-button-secondary w-full"
                    onClick={() => openTeam(team.id)}
                  >
                    Buka dasbor tim
                    <Icon name="arrow" width={16} height={16} />
                  </button>
                </section>
              );
            })}
          </div>
          <p className="tm-preview-footnote">
            Anggota multi-tim dapat tampil di lebih dari satu tim.
          </p>
        </>
      )}

      {section === "repositories" && (
        <>
          <div className="tm-preview-metrics">
            <Metric
              label="Repositori"
              value={previewRepositories.length}
              icon="branch"
              detail="Sumber aktivitas contoh"
            />
            <Metric
              label="GitHub"
              value={
                previewRepositories.filter((r) => r.platform === "github")
                  .length
              }
              icon="layers"
              detail="Repositori terhubung"
            />
            <Metric
              label="GitLab"
              value={
                previewRepositories.filter((r) => r.platform === "gitlab")
                  .length
              }
              icon="layers"
              detail="Repositori terhubung"
            />
          </div>
          <section className="tm-panel tm-members-panel">
            <div className="tm-members-heading">
              <div>
                <h2>Direktori repositori</h2>
                <p>Repositori contoh dan tim yang mengerjakannya.</p>
              </div>
            </div>
            <div className="tm-toolbar">
              <label className="tm-search">
                <Icon name="search" />
                <span className="sr-only">Cari repositori</span>
                <input
                  placeholder="Cari nama repositori..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="sr-only" htmlFor="preview-repo-platform">
                Platform repositori
              </label>
              <select
                className="tm-preview-select"
                id="preview-repo-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="all">Semua platform</option>
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </div>
            <div className="tm-table-scroll">
              <table className="tm-member-table">
                <thead>
                  <tr>
                    <th>Repositori</th>
                    <th>Platform</th>
                    <th>Tim yang terlibat</th>
                    <th>Isu terbuka</th>
                  </tr>
                </thead>
                <tbody>
                  {repositories.map((repo) => {
                    const repoIssues = previewIssues.filter(
                      (i) => i.repository.id === repo.id,
                    );
                    const memberIds = new Set(
                      repoIssues.map((i) => i.memberId),
                    );
                    const teamIds = new Set(
                      previewMembers
                        .filter((m) => memberIds.has(m.memberId))
                        .flatMap((m) => m.teams.map((t) => t.id)),
                    );
                    return (
                      <tr key={repo.id}>
                        <td>
                          <div className="tm-member-link">
                            <span className="tm-team-symbol">
                              <Icon name="branch" width={17} height={17} />
                            </span>
                            <strong>{repo.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="tm-role">
                            {repo.platform === "github" ? "GitHub" : "GitLab"}
                          </span>
                        </td>
                        <td>
                          <div className="tm-team-pills">
                            {previewTeams
                              .filter((t) => teamIds.has(t.id))
                              .map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => openTeam(t.id)}
                                >
                                  {t.name}
                                </button>
                              ))}
                          </div>
                        </td>
                        <td>
                          <strong>{repoIssues.length}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!repositories.length && (
              <div className="tm-compact-empty">
                Tidak ada repositori yang cocok.
              </div>
            )}
            <div className="tm-table-footer">
              {repositories.length} repositori<span>Data contoh</span>
            </div>
          </section>
        </>
      )}

      {section === "settings" && (
        <div className="tm-preview-settings-grid">
          <section className="tm-panel tm-preview-settings">
            <h2>Ambang beban kerja</h2>
            <p>Ubah nilai untuk melihat pembagian beban pada anggota contoh.</p>
            <div className="tm-preview-setting-fields">
              <label>
                Batas beban ringan
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={lowMax}
                  onChange={(e) => setLowMax(Number(e.target.value))}
                />
                <small>Jumlah maksimum isu untuk kategori ringan.</small>
              </label>
              <label>
                Batas beban sedang
                <input
                  type="number"
                  min={lowMax + 1}
                  max={100}
                  value={mediumMax}
                  onChange={(e) => setMediumMax(Number(e.target.value))}
                />
                <small>Di atas batas ini termasuk kategori tinggi.</small>
              </label>
              <label>
                Usia isu mengendap
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={staleDays}
                  onChange={(e) => setStaleDays(Number(e.target.value))}
                />
                <small>Hari sejak isu dibuat dan masih terbuka.</small>
              </label>
            </div>
            {!validThresholds && (
              <p role="alert" className="tm-error mt-4">
                Batas sedang harus lebih besar dari batas ringan, dan usia isu
                minimal satu hari.
              </p>
            )}
            <button
              className="tm-button tm-button-secondary mt-5"
              onClick={() => {
                setLowMax(3);
                setMediumMax(7);
                setStaleDays(30);
              }}
            >
              Reset contoh
            </button>
            <p className="tm-preview-footnote mt-4">
              Perubahan hanya berlaku pada simulasi di halaman ini.
            </p>
          </section>
          <section className="tm-panel tm-preview-settings">
            <div className="tm-eyebrow">LIVE SIMULATION</div>
            <h2 className="mt-3">Hasil simulasi</h2>
            <p>
              Lihat dampak perubahan ambang pada {previewMembers.length} anggota
              contoh.
            </p>
            <div className="tm-preview-band-list">
              {bands.map((band) => (
                <div key={band.id}>
                  <span className={`tm-workload tm-workload-${band.id}`}>
                    <span />
                    {band.label}
                  </span>
                  <span>
                    {validThresholds ? band.range : "Ambang tidak valid"}
                  </span>
                  <strong>
                    {validThresholds ? band.count : "—"}
                    <small>anggota</small>
                  </strong>
                </div>
              ))}
            </div>
            <div className="tm-preview-simulation-note">
              <Icon name="clock" />
              <span>
                <strong>
                  {validThresholds
                    ? previewIssues.filter((i) => i.ageDays > staleDays).length
                    : "—"}{" "}
                  isu mengendap
                </strong>
                <small>
                  Terbuka lebih dari {staleDays} hari pada data contoh.
                </small>
              </span>
            </div>
          </section>
        </div>
      )}

      {selectedMember && (
        <PreviewMemberDialog
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
