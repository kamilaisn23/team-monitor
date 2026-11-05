import React, { useState } from 'react';
import { Repository, Team } from '../types';
import {
  Github,
  GitBranch,
  Search,
  EyeOff,
  Eye,
  GitPullRequest,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';

interface RepoManagementProps {
  repositories: Repository[];
  teams: Team[];
  onTagRepoToTeam: (repoId: string, teamId: string) => void;
  onToggleIgnoreRepo: (repoId: string) => void;
}

export const RepoManagement: React.FC<RepoManagementProps> = ({
  repositories,
  teams,
  onTagRepoToTeam,
  onToggleIgnoreRepo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'github' | 'gitlab'>('ALL');
  const [showIgnoredOnly, setShowIgnoredOnly] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredRepos = repositories.filter(repo => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'ALL' || repo.platform === platformFilter;
    const matchesIgnored = showIgnoredOnly ? repo.isIgnored : true;

    return matchesSearch && matchesPlatform && matchesIgnored;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-14 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
          <span className="text-sm font-semibold">{notification}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-200 hover:text-white ml-2 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Repositori Terintegrasi
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Daftar repositori kode hasil sinkronisasi GitHub dan GitLab serta pemetaan skuad tim.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Tersinkron:</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
            {repositories.length} Repositori
          </span>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari repositori berdasarkan nama atau deskripsi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Platform</option>
            <option value="github">GitHub Saja</option>
            <option value="gitlab">GitLab Saja</option>
          </select>

          <button
            type="button"
            onClick={() => setShowIgnoredOnly(!showIgnoredOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              showIgnoredOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {showIgnoredOnly ? 'Menampilkan: Diabaikan' : 'Semua Status'}
          </button>
        </div>
      </div>

      {/* Repos Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Repositori & Platform
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Aktivitas & PR
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Tag ke Tim
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Status & Tindakan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRepos.map(repo => {
                const currentTeam = teams.find(t => t.id === repo.teamId);

                return (
                  <tr
                    key={repo.id}
                    className={`transition-all ${
                      repo.isIgnored
                        ? 'opacity-50 bg-slate-50/80 grayscale-[30%]'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Platform & Repo Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            repo.platform === 'github'
                              ? 'bg-slate-900 text-white'
                              : 'bg-orange-500 text-white'
                          }`}
                          title={`Platform: ${repo.platform.toUpperCase()}`}
                        >
                          {repo.platform === 'github' ? (
                            <Github className="w-4 h-4" />
                          ) : (
                            <GitBranch className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{repo.name}</span>
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            {repo.isIgnored && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-200 text-slate-600">
                                Diabaikan
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 max-w-md line-clamp-1">
                            {repo.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* PR & Activity */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                          <GitPullRequest className="w-3.5 h-3.5 text-blue-600" />
                          {repo.openPrs} PR Terbuka
                        </span>
                        <span className="text-slate-400">
                          Update: <strong className="text-slate-600">{repo.lastActivity}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Tag ke tim */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={repo.teamId || ''}
                          disabled={repo.isIgnored}
                          onChange={e => {
                            const newTeamId = e.target.value;
                            onTagRepoToTeam(repo.id, newTeamId);
                            const tName = teams.find(t => t.id === newTeamId)?.name;
                            showToast(
                              newTeamId
                                ? `Repositori ditag ke ${tName}`
                                : `Tag tim dilepas dari repositori`
                            );
                          }}
                          className={`bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                            currentTeam
                              ? 'border-blue-200 text-blue-900 bg-blue-50/50'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <option value="">-- Belum Ditag ke Tim --</option>
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>
                              Tag ke: {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Button Abaikan / Pulihkan */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleIgnoreRepo(repo.id);
                          showToast(
                            repo.isIgnored
                              ? `Repositori ${repo.name} dipulihkan.`
                              : `Repositori ${repo.name} sekarang diabaikan.`
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
                          repo.isIgnored
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {repo.isIgnored ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pulihkan</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            <span>Abaikan</span>
                          </>
                        )}
                      </button>
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
