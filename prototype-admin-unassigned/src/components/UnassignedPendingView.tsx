import React from 'react';
import { Clock, LogOut, Github, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Member } from '../types';

interface UnassignedPendingViewProps {
  unassignedUser?: Member;
  onLogout: () => void;
  onSimulateAdminApproval?: () => void;
  onSwitchToAdmin?: () => void;
}

export const UnassignedPendingView: React.FC<UnassignedPendingViewProps> = ({
  unassignedUser,
  onLogout,
  onSimulateAdminApproval,
  onSwitchToAdmin,
}) => {
  const userName = unassignedUser?.name || 'Budi Santoso';
  const githubUser = unassignedUser?.githubUsername || 'budisantoso';
  const userEmail = unassignedUser?.email || 'budi.santoso@perusahaan.co.id';
  const avatar =
    unassignedUser?.avatar ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto my-auto">
        {/* Waiting Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-8 sm:p-10 text-center space-y-6">
          {/* Hourglass / Clock Icon with pulsing effect */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-amber-100 animate-ping opacity-25"></div>
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-inner relative">
              <Clock className="w-10 h-10 animate-pulse text-amber-600" />
            </div>
          </div>

          {/* Title & Explanation */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              STATUS: UNASSIGNED
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Akun Menunggu Persetujuan
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              Autentikasi akun GitHub Anda berhasil dilakukan. Namun, Administrator sistem
              harus memberikan hak akses (role) dan menetapkan skuad tim Anda sebelum Anda dapat mengakses dashboard.
            </p>
          </div>

          {/* User Details Box */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center gap-3.5">
              <img
                src={avatar}
                alt={userName}
                className="w-12 h-12 rounded-full object-cover border border-slate-300 shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md w-fit">
                  <Github className="w-3.5 h-3.5 text-slate-800" />
                  <span>@{githubUser}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Pemberitahuan:</span>
              <span className="font-semibold text-amber-700">Menunggu review Admin</span>
            </div>
          </div>

          {/* Primary Action: Keluar */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>

            {/* Quick interactive helpers for simulator / review */}
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="w-full text-xs text-slate-500 hover:text-blue-600 font-medium py-1.5 flex items-center justify-center gap-1 transition"
              >
                <span>Beralih ke Admin untuk memberi role user ini</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        Team Monitor • Sistem Manajemen Aktivitas & Skuad Engineering
      </div>
    </div>
  );
};
