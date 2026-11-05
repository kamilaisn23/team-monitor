import React from 'react';
import { Member, Repository, SystemSettings, Team } from '../types';
import { getWorkloadStatus } from '../utils/rolesAndWorkload';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GitPullRequest,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';

interface ManagerDashboardProps {
  members: Member[];
  teams: Team[];
  repositories: Repository[];
  settings: SystemSettings;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  members,
  teams,
  repositories,
  settings,
}) => {
  const activeDevelopers = members.filter(
    m => m.isActive && m.role === 'DEVELOPER'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Dashboard Manager
            </span>
            <span className="text-xs text-slate-500">Rian Pratama • Engineering Manager</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ringkasan Sprint & Kapasitas Skuad
          </h2>
          <p className="text-sm text-slate-500">
            Monitoring progres pengiriman fitur, pemantauan kapasitas developer, dan review bottleneck.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-right shadow-2xs">
            <p className="text-[11px] text-slate-500 font-medium">Sprint 42 Berjalan</p>
            <p className="text-sm font-bold text-slate-900">7 Hari Tersisa (68% Selesai)</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Developer Tim
          </p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{activeDevelopers.length} Dev</h3>
          <p className="text-xs text-slate-500 mt-1">Product Engineering Skuad</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tugas Sprint Aktif
          </p>
          <h3 className="text-2xl font-extrabold text-blue-600 mt-1">21 Task</h3>
          <p className="text-xs text-emerald-600 font-semibold mt-1">14 Dalam Review PR</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            PR Butuh Approval
          </p>
          <h3 className="text-2xl font-extrabold text-amber-600 mt-1">6 PR</h3>
          <p className="text-xs text-slate-500 mt-1">Prioritas review sprint ini</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Target Deployment
          </p>
          <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">94%</h3>
          <p className="text-xs text-slate-500 mt-1">Sesuai timeline milestone</p>
        </div>
      </div>

      {/* Workload Status Matrix per Developer */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Evaluasi Kapasitas Beban Kerja Developer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan data ini untuk penugasan story point sprint berikutnya
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Threshold: Rendah (≤{settings.workloadThresholds.low}) • Sedang ({settings.workloadThresholds.mediumMin}-{settings.workloadThresholds.mediumMax}) • Tinggi (&gt;{settings.workloadThresholds.mediumMax})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {activeDevelopers.map(dev => {
            const workload = getWorkloadStatus(dev.activeTasksCount, settings.workloadThresholds);
            let color = 'bg-emerald-50 border-emerald-200 text-emerald-800';
            let badgeBg = 'bg-emerald-100 text-emerald-800';
            if (workload === 'Sedang') {
              color = 'bg-blue-50/50 border-blue-200 text-blue-900';
              badgeBg = 'bg-blue-100 text-blue-800';
            } else if (workload === 'Tinggi') {
              color = 'bg-red-50/60 border-red-200 text-red-900';
              badgeBg = 'bg-red-100 text-red-800';
            }

            return (
              <div
                key={dev.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${color}`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={dev.avatar}
                    alt={dev.name}
                    className="w-11 h-11 rounded-full object-cover border border-white shadow-2xs"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{dev.name}</h4>
                    <p className="text-xs text-slate-500">
                      GitHub: @{dev.githubUsername} • {dev.teamName}
                    </p>
                    <p className="text-xs font-semibold text-slate-700 mt-1">
                      {dev.activeTasksCount} Tugas / PR sedang berjalan
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${badgeBg}`}>
                    Beban {workload}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
