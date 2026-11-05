import React from 'react';
import { Role } from '../types';
import {
  Activity,
  LayoutDashboard,
  FileBarChart2,
  Users,
  FolderGit2,
  GitFork,
  Settings,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Code,
  Briefcase,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export type AdminTab = 'summary' | 'reports' | 'members' | 'teams' | 'repositories' | 'settings';

interface SidebarProps {
  currentRole: Role;
  activeTab: AdminTab;
  onNavigate: (tab: AdminTab) => void;
  onOpenSync: () => void;
  lastSyncTime: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeTab,
  onNavigate,
  onOpenSync,
  lastSyncTime,
  onLogout,
}) => {
  // Only SUPERADMIN can see Pengaturan in sidebar!
  const showSettingsMenu = currentRole === 'SUPERADMIN';

  // Role badge display styling
  const renderRoleBadge = () => {
    switch (currentRole) {
      case 'SUPERADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            SUPERADMIN
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            MANAGER
          </span>
        );
      case 'DEVELOPER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            DEVELOPER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-slate-700 text-slate-300">
            {currentRole}
          </span>
        );
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-42px)]">
      {/* Top Branding & Hak Akses */}
      <div>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-none">
                Team Monitor
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">Engineering Activity</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Hak Akses:</span>
            {renderRoleBadge()}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {/* Main Menus */}
          <button
            type="button"
            onClick={() => onNavigate('summary')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Ringkasan</span>
            </div>
            {activeTab === 'summary' && <ChevronRight className="w-4 h-4 opacity-70" />}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileBarChart2 className="w-4 h-4" />
              <span>Laporan</span>
            </div>
            {activeTab === 'reports' && <ChevronRight className="w-4 h-4 opacity-70" />}
          </button>

          {/* Section: ADMINISTRASI (Shown for Admin/Superadmin or Admin Mode) */}
          {(currentRole === 'SUPERADMIN' || currentRole === 'ADMIN') && (
            <>
              <div className="pt-5 pb-2 px-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ADMINISTRASI
                </p>
              </div>

              {/* Anggota (/admin/members) */}
              <button
                type="button"
                onClick={() => onNavigate('members')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'members'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Anggota</span>
                </div>
                {activeTab === 'members' && <ChevronRight className="w-4 h-4 opacity-70" />}
              </button>

              {/* Tim (/admin/teams) */}
              <button
                type="button"
                onClick={() => onNavigate('teams')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'teams'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderGit2 className="w-4 h-4" />
                  <span>Tim</span>
                </div>
                {activeTab === 'teams' && <ChevronRight className="w-4 h-4 opacity-70" />}
              </button>

              {/* Repositori (/admin/repositories) */}
              <button
                type="button"
                onClick={() => onNavigate('repositories')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'repositories'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GitFork className="w-4 h-4" />
                  <span>Repositori</span>
                </div>
                {activeTab === 'repositories' && <ChevronRight className="w-4 h-4 opacity-70" />}
              </button>

              {/* Pengaturan (/admin/settings) - ONLY VISIBLE IF SUPERADMIN */}
              {showSettingsMenu && (
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    activeTab === 'settings'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span>Pengaturan</span>
                  </div>
                  {activeTab === 'settings' && <ChevronRight className="w-4 h-4 opacity-70" />}
                </button>
              )}
            </>
          )}
        </nav>
      </div>

      {/* Bottom Area: Sync Button & Logged User Info */}
      <div className="p-3 border-t border-slate-800 space-y-3">
        {/* Sinkronkan Data Button */}
        <button
          type="button"
          onClick={onOpenSync}
          className="w-full bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between group transition"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-400 group-hover:rotate-180 transition-transform duration-500" />
            <span>Sinkronkan Data</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">Sync</span>
        </button>

        <div className="px-2 text-[10px] text-slate-400 truncate">
          Sinkron terakhir: <span className="text-slate-300 font-medium">{lastSyncTime}</span>
        </div>

        {/* Current profile info */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={
                currentRole === 'SUPERADMIN'
                  ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
                  : currentRole === 'ADMIN'
                  ? 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80'
                  : currentRole === 'MANAGER'
                  ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'
              }
              alt="Profil"
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
            />
            <div className="text-left">
              <p className="text-xs font-bold text-slate-200 leading-tight">
                {currentRole === 'SUPERADMIN'
                  ? 'Siti Nurhaliza'
                  : currentRole === 'ADMIN'
                  ? 'Ahmad Fadillah'
                  : currentRole === 'MANAGER'
                  ? 'Rian Pratama'
                  : 'Dewi Lestari'}
              </p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Online</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
