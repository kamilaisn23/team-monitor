import React, { useState } from 'react';
import { Role, SystemSettings } from '../types';
import {
  ShieldAlert,
  Settings,
  Sliders,
  Clock,
  Save,
  CheckCircle2,
  Lock,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

interface SettingsViewProps {
  currentRole: Role;
  settings: SystemSettings;
  onSaveSettings: (newSettings: SystemSettings) => void;
  onNavigateToSummary: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentRole,
  settings,
  onSaveSettings,
  onNavigateToSummary,
}) => {
  const isSuperadmin = currentRole === 'SUPERADMIN';

  // Form states initialized from settings
  const [lowThreshold, setLowThreshold] = useState(settings.workloadThresholds.low);
  const [medMin, setMedMin] = useState(settings.workloadThresholds.mediumMin);
  const [medMax, setMedMax] = useState(settings.workloadThresholds.mediumMax);
  const [highThreshold, setHighThreshold] = useState(settings.workloadThresholds.high);
  const [staleDays, setStaleDays] = useState(settings.staleIssueDays);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // If role is ADMIN or non-superadmin: Show "Akses Ditolak" screen as requested!
  if (!isSuperadmin) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200/80 shadow-lg p-8 max-w-lg w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold tracking-wider uppercase">
              <Lock className="w-3.5 h-3.5" />
              Akses Ditolak (403 Forbidden)
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Izin Khusus Superadmin Diperlukan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hanya pengguna dengan peran <strong className="text-purple-700 font-semibold">SUPERADMIN</strong> yang
              memiliki wewenang untuk mengubah pengaturan sistem, batas beban kerja tim, dan parameter isu mengendap.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-left text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Peran Anda saat ini:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {currentRole}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Akses modul:</span>
              <span className="font-semibold text-red-600">Terbatas (Hanya Baca / Ditolak)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToSummary}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Ringkasan</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      workloadThresholds: {
        low: Number(lowThreshold),
        mediumMin: Number(medMin),
        mediumMax: Number(medMax),
        high: Number(highThreshold),
      },
      staleIssueDays: Number(staleDays),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pengaturan Sistem
            </h2>
            <p className="text-sm text-slate-500">
              Konfigurasi ambang batas beban kerja engineer dan kriteria peringatan aktivitas.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">
            Pengaturan berhasil disimpan dan langsung diterapkan ke seluruh sistem Team Monitor!
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Ambang Batas Beban Kerja */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Batas Ambang Beban Kerja Developer
                </h3>
                <p className="text-xs text-slate-500">
                  Digunakan untuk mengkategorikan kapasitas kerja engineer pada dashboard & laporan
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Khusus Superadmin
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Rendah (<= 3) */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Beban Rendah
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  ≤ {lowThreshold} Tugas
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Engineer memiliki kapasitas lebih untuk menerima tugas sprint baru.
              </p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maksimal Tugas Rendah:
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={lowThreshold}
                  onChange={e => setLowThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Sedang (4 - 7) */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Beban Sedang
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                  {medMin} - {medMax} Tugas
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Kapasitas optimal dan seimbang untuk ritme pengerjaan fitur standar.
              </p>
              <div className="pt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Batas Bawah:
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={medMin}
                    onChange={e => setMedMin(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Batas Atas:
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={medMax}
                    onChange={e => setMedMax(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Tinggi (> 7) */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-800">
                  Beban Tinggi
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                  &gt; {medMax} Tugas
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Peringatan potensi kelelahan (burnout) atau hambatan review pull request.
              </p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ambang Beban Tinggi (&gt;):
                </label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={highThreshold}
                  onChange={e => setHighThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-white border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card: Batas Hari Isu Mengendap */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Batas Hari Isu Mengendap (Stale Issues Threshold)
              </h3>
              <p className="text-xs text-slate-500">
                Isu atau PR tanpa aktivitas melebihi batas ini akan ditandai sebagai peringatan
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-sm font-bold text-slate-800">
                Batas Hari Tidak Ada Aktivitas:
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai standar rekomendasi adalah 30 hari kalender.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="number"
                min={7}
                max={120}
                value={staleDays}
                onChange={e => setStaleDays(Number(e.target.value))}
                className="w-24 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">Hari</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
