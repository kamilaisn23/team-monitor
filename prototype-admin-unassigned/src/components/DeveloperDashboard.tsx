import React from 'react';
import { Member, Repository } from '../types';
import {
  Code,
  GitPullRequest,
  CheckSquare,
  GitCommit,
  GitBranch,
  Calendar,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface DeveloperDashboardProps {
  currentMember?: Member;
  repositories: Repository[];
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  currentMember,
  repositories,
}) => {
  const memberName = currentMember?.name || 'Dewi Lestari';
  const githubUser = currentMember?.githubUsername || 'dewilestari';
  const gitlabUser = currentMember?.gitlabUsername || 'dewi.l';

  const myTasks = [
    {
      id: 'TASK-210',
      title: 'Refaktor komponen navigasi dan dropdown tim pada admin panel',
      status: 'In Progress',
      repo: 'team-monitor/frontend-core',
      pr: '#142',
      due: 'Besok, 17:00 WIB',
    },
    {
      id: 'TASK-208',
      title: 'Integrasi webhook GitHub untuk event pull_request_review',
      status: 'Reviewing',
      repo: 'team-monitor/api-gateway',
      pr: '#78',
      due: 'Jumat, 12:00 WIB',
    },
    {
      id: 'TASK-199',
      title: 'Penyesuaian respons endpoint /api/teams dengan filter arsip',
      status: 'Done',
      repo: 'team-monitor/payment-service',
      pr: '#55',
      due: 'Selesai kemarin',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
              Dashboard Developer
            </span>
            <span className="text-xs text-slate-500">
              {memberName} • GitHub: @{githubUser} • GitLab: @{gitlabUser}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ruang Kerja Engineer Saya
          </h2>
          <p className="text-sm text-slate-500">
            Daftar tugas sprint aktif, pull request yang perlu di-review, dan commit hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <Flame className="w-4 h-4 text-amber-600" />
            <span>Streak Commit: 9 Hari Berturut-turut</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tugas Sprint Saya
          </p>
          <h3 className="text-3xl font-extrabold text-blue-600 mt-1">3 Tugas</h3>
          <p className="text-xs text-slate-500 mt-1">2 sedang berjalan, 1 review</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            PR Butuh Review Saya
          </p>
          <h3 className="text-3xl font-extrabold text-amber-600 mt-1">2 PR</h3>
          <p className="text-xs text-slate-500 mt-1">Dari rekan satu skuad</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Commit Hari Ini
          </p>
          <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">5 Commit</h3>
          <p className="text-xs text-slate-500 mt-1">Terakhir 25 menit lalu</p>
        </div>
      </div>

      {/* My Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Tugas Sprint Aktif</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">Sprint 42</span>
        </div>

        <div className="divide-y divide-slate-100">
          {myTasks.map(task => (
            <div
              key={task.id}
              className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {task.id}
                  </span>
                  <span className="font-semibold text-sm text-slate-900">{task.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="font-mono">{task.repo}</span>
                  <span>•</span>
                  <span className="text-blue-600 font-medium">PR {task.pr}</span>
                  <span>•</span>
                  <span>Target: {task.due}</span>
                </div>
              </div>

              <div className="shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    task.status === 'Done'
                      ? 'bg-emerald-100 text-emerald-800'
                      : task.status === 'Reviewing'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
