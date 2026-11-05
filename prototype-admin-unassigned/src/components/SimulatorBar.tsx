import React from 'react';
import { Role } from '../types';
import { ShieldCheck, ShieldAlert, Users, Code, Clock, Github } from 'lucide-react';

interface SimulatorBarProps {
  currentRole: Role;
  onSelectRole: (role: Role) => void;
  onLoginGithub: () => void;
}

export const SimulatorBar: React.FC<SimulatorBarProps> = ({
  currentRole,
  onSelectRole,
  onLoginGithub,
}) => {
  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-semibold tracking-wide text-slate-300 uppercase text-[11px]">
          Simulator Peran Pengguna:
        </span>
        <span className="text-slate-400 font-mono">
          Peran Aktif: <strong className="text-amber-400 font-bold">{currentRole}</strong>
        </span>
      </div>

      <nav aria-label="Demo role selector" className="flex items-center flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelectRole('MANAGER')}
          className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition ${
            currentRole === 'MANAGER'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Demo Manager
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('DEVELOPER')}
          className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition ${
            currentRole === 'DEVELOPER'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Demo Developer
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('ADMIN')}
          className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition ${
            currentRole === 'ADMIN'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Demo Admin
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('SUPERADMIN')}
          className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition ${
            currentRole === 'SUPERADMIN'
              ? 'bg-purple-600 text-white ring-2 ring-purple-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
          Demo Superadmin
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('UNASSIGNED')}
          className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition ${
            currentRole === 'UNASSIGNED'
              ? 'bg-amber-600 text-white ring-2 ring-amber-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-300" />
          Demo Unassigned
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1"></div>

        <button
          type="button"
          onClick={onLoginGithub}
          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 font-medium transition"
          title="Simulasi Login dengan GitHub untuk role UNASSIGNED"
        >
          <Github className="w-3.5 h-3.5 text-slate-300" />
          Login dengan GitHub
        </button>
      </nav>
    </header>
  );
};
