import React from 'react';
import { Repository, SystemSettings } from '../types';
import {
  FileBarChart2,
  Clock,
  GitPullRequest,
  GitCommit,
  AlertTriangle,
  Calendar,
  CheckCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface ReportsViewProps {
  repositories: Repository[];
  settings: SystemSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  repositories,
  settings,
}) => {
  const staleThreshold = settings.staleIssueDays;

  // Stale issues / repos (e.g. legacy or inactive)
  const staleItems = [
    {
      id: 'issue-102',
      title: 'Migrasi dependensi OAuth legacy Google & GitLab v12',
      repo: 'team-monitor/legacy-monolith-v1',
      daysInactive: 45,
      assignee: 'Ahmad Fadillah',
      status: 'TERTUNDA',
    },
    {
      id: 'issue-88',
      title: 'Optimalisasi cache Redis untuk response query analytics',
      repo: 'team-monitor/api-gateway',
      daysInactive: 32,
      assignee: 'Kevin Sanjaya',
      status: 'TERTUNDA',
    },
    {
      id: 'issue-64',
      title: 'Automasi screenshot visual test per commit di CI pipeline',
      repo: 'team-monitor/qa-automation-e2e',
      daysInactive: 18,
      assignee: 'Nadia Amalia',
      status: 'NORMAL',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Laporan Kinerja & Kecepatan Tim
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Analisis siklus Pull Request, produktivitas commit, dan monitoring isu mengendap (&gt; {staleThreshold} hari).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1.5 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Sprint Berjalan: 28 Okt - 11 Nov 2026</span>
          </span>
        </div>
      </div>

      {/* Highlights Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Rata-rata Waktu Review PR</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">4.2 Jam</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>18% lebih cepat dibanding sprint lalu</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Tingkat Kelulusan PR Pertama Kali</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">86.4%</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Kualitas kode stabil sesuai linter</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Isu Mengendap (&gt; {staleThreshold} Hari)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-600">
            {staleItems.filter(i => i.daysInactive >= staleThreshold).length} Isu
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Berdasarkan konfigurasi Superadmin
          </p>
        </div>
      </div>

      {/* Stale Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Daftar Isu Mengendap Tanpa Aktivitas
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Batas ambang sistem: <strong className="text-slate-800">{staleThreshold} Hari</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5">Judul Isu / Task</th>
                <th scope="col" className="px-5 py-3.5">Repositori</th>
                <th scope="col" className="px-5 py-3.5">Hari Mengendap</th>
                <th scope="col" className="px-5 py-3.5">Penanggung Jawab</th>
                <th scope="col" className="px-5 py-3.5">Peringatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staleItems.map(item => {
                const isOverThreshold = item.daysInactive >= staleThreshold;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isOverThreshold ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <span className="text-[11px] font-mono text-slate-400">ID: #{item.id}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-700">{item.repo}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`font-bold text-sm ${
                          isOverThreshold ? 'text-red-700' : 'text-slate-700'
                        }`}
                      >
                        {item.daysInactive} Hari
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-800">{item.assignee}</td>
                    <td className="px-5 py-4">
                      {isOverThreshold ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          LEWAT BATAS
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                          Aman
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
