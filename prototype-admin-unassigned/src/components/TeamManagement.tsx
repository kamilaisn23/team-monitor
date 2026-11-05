import React, { useState } from 'react';
import { Member, Team } from '../types';
import {
  Users,
  FolderGit2,
  Plus,
  Archive,
  ArchiveRestore,
  UserCheck,
  CheckCircle2,
  X,
  UserMinus,
  UserPlus,
} from 'lucide-react';

interface TeamManagementProps {
  teams: Team[];
  members: Member[];
  onAddTeam: (team: Omit<Team, 'id' | 'memberIds' | 'repoIds' | 'isArchived'>) => void;
  onToggleArchiveTeam: (teamId: string) => void;
  onToggleTeamMember: (teamId: string, memberId: string) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  teams,
  members,
  onAddTeam,
  onToggleArchiveTeam,
  onToggleTeamMember,
}) => {
  // Modal for managing members in a team
  const [managingTeam, setManagingTeam] = useState<Team | null>(null);

  // Modal for creating team
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamLeadId, setNewTeamLeadId] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const lead = members.find(m => m.id === newTeamLeadId);

    onAddTeam({
      name: newTeamName.trim(),
      description: newTeamDesc.trim() || 'Tim pengembangan perangkat lunak',
      leadId: newTeamLeadId || members[0]?.id || '',
      leadName: lead?.name || members[0]?.name || 'Belum ditentukan',
    });

    showNotification(`Tim "${newTeamName.trim()}" berhasil dibuat!`);
    setIsCreateModalOpen(false);
    setNewTeamName('');
    setNewTeamDesc('');
    setNewTeamLeadId('');
  };

  const currentManagingTeam = teams.find(t => t.id === managingTeam?.id) || managingTeam;

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
            Daftar & Manajemen Tim
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola pembagian skuad engineering, penugasan lead, dan alokasi anggota tim.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Tim</span>
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map(team => {
          const teamMembers = members.filter(m => team.memberIds.includes(m.id));

          return (
            <div
              key={team.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between p-5 relative overflow-hidden ${
                team.isArchived
                  ? 'border-slate-200/60 bg-slate-50/70 opacity-75'
                  : 'border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              {team.isArchived && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-600 uppercase tracking-wider">
                  Diarsipkan
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`p-3 rounded-xl ${
                      team.isArchived
                        ? 'bg-slate-200 text-slate-500'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}
                  >
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {team.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lead: <strong className="text-slate-700">{team.leadName}</strong>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4 min-h-[38px]">
                  {team.description}
                </p>

                {/* Member count & Avatar stack */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-500" />
                      Jumlah Anggota
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                      {team.memberIds.length} Anggota
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex -space-x-2 overflow-hidden">
                      {teamMembers.slice(0, 5).map(m => (
                        <img
                          key={m.id}
                          src={m.avatar}
                          alt={m.name}
                          title={m.name}
                          className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                        />
                      ))}
                      {teamMembers.length > 5 && (
                        <div className="flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 text-[10px] font-bold">
                          +{teamMembers.length - 5}
                        </div>
                      )}
                      {teamMembers.length === 0 && (
                        <span className="text-xs text-slate-400 italic">Belum ada anggota</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setManagingTeam(team)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Kelola Anggota
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleArchiveTeam(team.id);
                    showNotification(
                      team.isArchived
                        ? `Tim ${team.name} berhasil dipulihkan.`
                        : `Tim ${team.name} berhasil diarsipkan.`
                    );
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                    team.isArchived
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                  title={team.isArchived ? 'Pulihkan Tim' : 'Arsipkan Tim'}
                >
                  {team.isArchived ? (
                    <>
                      <ArchiveRestore className="w-3.5 h-3.5" />
                      <span>Pulihkan</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" />
                      <span>Arsipkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Kelola Anggota Tim */}
      {currentManagingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Kelola Anggota: {currentManagingTeam.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tambahkan atau keluarkan anggota dari skuad ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingTeam(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                Daftar Semua Engineer ({members.length})
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {members.map(member => {
                  const isInTeam = currentManagingTeam.memberIds.includes(member.id);

                  return (
                    <div
                      key={member.id}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono">@{member.githubUsername}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 font-medium">
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleTeamMember(currentManagingTeam.id, member.id);
                          showNotification(
                            isInTeam
                              ? `${member.name} dikeluarkan dari ${currentManagingTeam.name}`
                              : `${member.name} dimasukkan ke ${currentManagingTeam.name}`
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          isInTeam
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
                      >
                        {isInTeam ? (
                          <>
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Keluarkan</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Masukkan</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingTeam(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buat Tim */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Buat Tim Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Tim <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. Data Platform & Analytics"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Tim
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsikan ruang lingkup pekerjaan dan tanggung jawab tim ini..."
                  value={newTeamDesc}
                  onChange={e => setNewTeamDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Team Lead / Engineering Manager
                </label>
                <select
                  value={newTeamLeadId}
                  onChange={e => setNewTeamLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  <option value="">Pilih Lead Tim...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                >
                  Buat Tim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
