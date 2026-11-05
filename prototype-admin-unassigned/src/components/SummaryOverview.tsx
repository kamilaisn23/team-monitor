import React from 'react';
import { Member, Repository, Role, SystemSettings, Team } from '../types';
import { getWorkloadStatus } from '../utils/rolesAndWorkload';
import {
  Users,
  FolderGit2,
  GitFork,
  GitPullRequest,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  GitCommit,
} from 'lucide-react';

interface SummaryOverviewProps {
  currentRole: Role;
  members: Member[];
  teams: Team[];
  repositories: Repository[];
  settings: SystemSettings;
  onNavigate: (tab: any) => void;
  onOpenRoleModalForMember?: (member: Member) => void;
}

export const SummaryOverview: React.FC<SummaryOverviewProps> = ({
  currentRole,
  members,
  teams,
  repositories,
  settings,
  onNavigate,
  onOpenRoleModalForMember,
}) => {
  const activeMembers = members.filter(m => m.isActive && m.role !== 'UNASSIGNED');
  const unassignedMembers = members.filter(m => m.role === 'UNASSIGNED');
  const activeTeams = teams.filter(t => !t.isArchived);
  const activeRepos = repositories.filter(r => !r.isIgnored);
  const totalOpenPrs = activeRepos.reduce((acc, r) => acc + r.openPrs, 0);

  // Calculate workloads based on settings
  const highWorkloadMembers = members.filter(
    m => m.isActive && getWorkloadStatus(m.activeTasksCount, settings.workloadThresholds) === 'Tinggi'
  );

  return (
    <div className="space-y-6">
      {/* Alert banner if UNASSIGNED user exists */}
      {unassignedMembers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Perhatian Admin
                </span>
                <span className="text-xs text-slate-500 font-medium">1 Pendaftaran Baru</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {unassignedMembers[0].name} Menunggu Penetapan Role
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pengguna telah login via GitHub (@{unassignedMembers[0].githubUsername}). Berikan role untuk mengaktifkan akses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onOpenRoleModalForMember) {
                  onOpenRoleModalForMember(unassignedMembers[0]);
                } else {
                  onNavigate('members');
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Beri Role Sekarang
            </button>
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Lihat Anggota
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Anggota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Anggota Aktif
            </p>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
              {activeMembers.length}
            </h4>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Semua tim beroperasi</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Tim Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tim Engineering
            </p>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
              {activeTeams.length}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Product, Platform, QA
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <FolderGit2 className="w-6 h-6" />
          </div>
        </div>

        {/* Repositori Terhubung */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Repositori Aktif
            </p>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
              {activeRepos.length}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              GitHub & GitLab
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <GitFork className="w-6 h-6" />
          </div>
        </div>

        {/* Pull Requests Terbuka */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              PR Terbuka
            </p>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalOpenPrs}
            </h4>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              Menunggu code review
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
            <GitPullRequest className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Beban Kerja Tim & Aktivitas Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Matriks Beban Kerja Developer */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Distribusi Beban Kerja Engineer
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Berdasarkan batas ambang sistem: Rendah (≤ {settings.workloadThresholds.low}),
                Sedang ({settings.workloadThresholds.mediumMin}-{settings.workloadThresholds.mediumMax}),
                Tinggi (&gt; {settings.workloadThresholds.mediumMax})
              </p>
            </div>
            {(currentRole === 'SUPERADMIN' || currentRole === 'ADMIN') && (
              <button
                type="button"
                onClick={() => onNavigate('members')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Kelola</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {members
              .filter(m => m.role !== 'UNASSIGNED')
              .map(member => {
                const status = getWorkloadStatus(member.activeTasksCount, settings.workloadThresholds);
                const percent = Math.min(Math.round((member.activeTasksCount / 12) * 100), 100);

                let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                let barColor = 'bg-emerald-500';
                if (status === 'Sedang') {
                  badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                  barColor = 'bg-blue-500';
                } else if (status === 'Tinggi') {
                  badgeColor = 'bg-red-100 text-red-800 border-red-200';
                  barColor = 'bg-red-500';
                }

                return (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {member.teamName || 'Belum ada tim'} • {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 max-w-xs hidden sm:block">
                      <div className="flex justify-between text-[11px] font-semibold mb-1 text-slate-600">
                        <span>{member.activeTasksCount} Tugas / PR Aktif</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-300`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${badgeColor}`}
                      >
                        Beban {status}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Kolom 3: Status Skuad & Repositori Singkat */}
        <div className="space-y-6">
          {/* Card Skuad Tim */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Tim Engineering ({activeTeams.length})</h3>
              <button
                type="button"
                onClick={() => onNavigate('teams')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>Semua</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {activeTeams.map(team => (
                <div
                  key={team.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{team.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Lead: {team.leadName}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-2xs">
                    {team.memberIds.length} Org
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card Repositori Teratas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Repositori Aktif</h3>
              <button
                type="button"
                onClick={() => onNavigate('repositories')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>Detail</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {activeRepos.slice(0, 3).map(repo => (
                <div
                  key={repo.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="truncate max-w-[170px]">
                    <span className="font-bold text-slate-900 truncate block">{repo.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{repo.platform}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                    {repo.openPrs} PR
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
