import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, GitBranch, GitPullRequest, CheckSquare, X } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastSyncTime: string;
  onSyncComplete: (newSyncTime: string) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  lastSyncTime,
  onSyncComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep(1);
      setIsFinished(false);
      return;
    }

    // Start animated progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 4;
      if (currentProgress < 35) {
        setCurrentStep(1); // GitHub
      } else if (currentProgress < 75) {
        setCurrentStep(2); // GitLab
      } else if (currentProgress < 100) {
        setCurrentStep(3); // Kerjabaik
      } else {
        currentProgress = 100;
        setCurrentStep(4);
        setIsFinished(true);
        clearInterval(interval);
        const now = new Date();
        const formatted = `Hari ini, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
        onSyncComplete(formatted);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 120);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const restartSync = () => {
    setProgress(0);
    setCurrentStep(1);
    setIsFinished(false);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress < 35) {
        setCurrentStep(1);
      } else if (currentProgress < 75) {
        setCurrentStep(2);
      } else if (currentProgress < 100) {
        setCurrentStep(3);
      } else {
        currentProgress = 100;
        setCurrentStep(4);
        setIsFinished(true);
        clearInterval(interval);
        const now = new Date();
        const formatted = `Hari ini, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
        onSyncComplete(formatted);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400">
              <RefreshCw className={`w-5 h-5 ${!isFinished ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sinkronisasi Data Tim</h3>
              <p className="text-xs text-slate-400">Menghubungkan repositori kode dan pelacak tugas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <span className="text-slate-700">
                {isFinished ? 'Sinkronisasi Selesai!' : 'Proses Sinkronisasi Sedang Berjalan...'}
              </span>
              <span className="text-blue-600 font-mono text-sm">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Integration Statuses */}
          <div className="space-y-3">
            {/* GitHub */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentStep > 1 || isFinished
                  ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                  : currentStep === 1
                  ? 'bg-blue-50/80 border-blue-200 text-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-200 text-slate-800">
                  <GitPullRequest className="w-4 h-4 text-slate-900" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">GitHub Platform</h4>
                  <p className="text-xs text-slate-500">
                    {currentStep > 1 || isFinished
                      ? '5 repositori, 14 pull request & 42 commit tersinkron'
                      : currentStep === 1
                      ? 'Mengambil branch, webhook dan PR aktif...'
                      : 'Menunggu antrean...'}
                  </p>
                </div>
              </div>
              <div>
                {currentStep > 1 || isFinished ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : currentStep === 1 ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
                )}
              </div>
            </div>

            {/* GitLab */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentStep > 2 || isFinished
                  ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                  : currentStep === 2
                  ? 'bg-blue-50/80 border-blue-200 text-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-200 text-orange-600">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">GitLab Enterprise</h4>
                  <p className="text-xs text-slate-500">
                    {currentStep > 2 || isFinished
                      ? '2 repositori, 5 merge request & CI pipeline tersinkron'
                      : currentStep === 2
                      ? 'Mengunduh status pipeline & merge request...'
                      : 'Menunggu antrean...'}
                  </p>
                </div>
              </div>
              <div>
                {currentStep > 2 || isFinished ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : currentStep === 2 ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
                )}
              </div>
            </div>

            {/* Kerjabaik */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                isFinished
                  ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                  : currentStep === 3
                  ? 'bg-blue-50/80 border-blue-200 text-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-200 text-blue-600">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Kerjabaik Task Tracker</h4>
                  <p className="text-xs text-slate-500">
                    {isFinished
                      ? '18 tugas aktif, sprint velocity & absensi tersinkron'
                      : currentStep === 3
                      ? 'Menghubungkan kartu sprint dan beban kerja tim...'
                      : 'Menunggu antrean...'}
                  </p>
                </div>
              </div>
              <div>
                {isFinished ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : currentStep === 3 ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
                )}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
            <span className="font-medium">Keterangan:</span>
            <span className="text-slate-800 font-semibold">
              Sinkron terakhir: <span className="text-blue-700">{lastSyncTime}</span>
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={restartSync}
            disabled={!isFinished}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ulangi Sinkronisasi
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition"
          >
            {isFinished ? 'Tutup & Terapkan Data' : 'Batalkan'}
          </button>
        </div>
      </div>
    </div>
  );
};
