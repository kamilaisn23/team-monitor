import React, { useState } from 'react';
import { Member, Role, Team } from '../types';
import {
  UserPlus,
  Search,
  CheckCircle2,
  Github,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  Code,
  Clock,
  X,
  UserCheck,
} from 'lucide-react';

interface MemberManagementProps {
  members: Member[];
  teams: Team[];
  onUpdateMemberRole: (memberId: string, newRole: Role, teamId?: string, teamName?: string) => void;
  onToggleMemberActive: (memberId: string) => void;
  onAddMember: (newMember: Omit<Member, 'id' | 'joinDate' | 'activeTasksCount'>) => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  members,
  teams,
  onUpdateMemberRole,
  onToggleMemberActive,
  onAddMember,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal for "Beri Role" (e.g. for Budi Santoso or any UNASSIGNED)
  const [roleModalMember, setRoleModalMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('DEVELOPER');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('team-pe');

  // Modal for "Tambah Anggota"
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    email: '',
    githubUsername: '',
    gitlabUsername: '',
    role: 'DEVELOPER' as Role,
    teamId: 'team-pe',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    isActive: true,
  });

  const showNotification = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  const handleOpenRoleModal = (member: Member) => {
    setRoleModalMember(member);
    setSelectedRole('DEVELOPER');
    setSelectedTeamId(member.teamId || 'team-pe');
  };

  const handleConfirmRole = () => {
    if (!roleModalMember) return;
    const team = teams.find(t => t.id === selectedTeamId);
    onUpdateMemberRole(
      roleModalMember.id,
      selectedRole,
      selectedTeamId,
      team ? team.name : undefined
    );

    showNotification(
      `Role ${selectedRole} berhasil diberikan kepada ${roleModalMember.name}!`
    );
    setRoleModalMember(null);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name || !newForm.email) return;

    const team = teams.find(t => t.id === newForm.teamId);
    onAddMember({
      name: newForm.name,
      email: newForm.email,
      githubUsername: newForm.githubUsername || newForm.name.toLowerCase().replace(/\s+/g, ''),
      gitlabUsername: newForm.gitlabUsername || newForm.name.toLowerCase().replace(/\s+/g, '.'),
      role: newForm.role,
      teamId: newForm.teamId,
      teamName: team?.name,
      avatar: newForm.avatar,
      isActive: newForm.isActive,
    });

    showNotification(`Anggota baru ${newForm.name} berhasil ditambahkan!`);
    setIsAddModalOpen(false);
    setNewForm({
      name: '',
      email: '',
      githubUsername: '',
      gitlabUsername: '',
      role: 'DEVELOPER',
      teamId: 'team-pe',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    });
  };

  // Filtered members list
  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.githubUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.gitlabUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const renderBadge = (role: Role) => {
    switch (role) {
      case 'SUPERADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            SUPERADMIN
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            MANAGER
          </span>
        );
      case 'DEVELOPER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <Code className="w-3.5 h-3.5 text-sky-600" />
            DEVELOPER
          </span>
        );
      case 'UNASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            UNASSIGNED
          </span>
        );
      default:
        return <span>{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-14 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
          <span className="text-sm font-semibold">{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-200 hover:text-white ml-2 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Anggota
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola hak akses role, akun GitHub & GitLab, dan status aktif anggota tim engineering.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-sm transition self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Anggota</span>
        </button>
      </div>

      {/* Alert banner if any UNASSIGNED users exist */}
      {members.some(m => m.role === 'UNASSIGNED') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Terdapat 1 Pengguna Baru Berstatus UNASSIGNED
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Budi Santoso baru saja mendaftar via GitHub dan membutuhkan penetapan role & tim sebelum bisa berkolaborasi.
              </p>
            </div>
          </div>

          {members.find(m => m.role === 'UNASSIGNED') && (
            <button
              type="button"
              onClick={() => handleOpenRoleModal(members.find(m => m.role === 'UNASSIGNED')!)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0"
            >
              Beri Role Sekarang
            </button>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, email, username GitHub/GitLab..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Role</option>
            <option value="SUPERADMIN">SUPERADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="DEVELOPER">DEVELOPER</option>
            <option value="UNASSIGNED">UNASSIGNED</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Anggota
                </th>
                <th scope="col" className="px-5 py-3.5">
                  GitHub
                </th>
                <th scope="col" className="px-5 py-3.5">
                  GitLab
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Role
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Status Aktif
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Tindakan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map(member => {
                const isBudi = member.id === 'user-budi' || member.role === 'UNASSIGNED';
                return (
                  <tr
                    key={member.id}
                    className={`transition-colors ${
                      isBudi ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Foto & Nama */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{member.name}</span>
                            {member.teamName && (
                              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {member.teamName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* GitHub */}
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        <Github className="w-3.5 h-3.5 text-slate-800" />
                        <span>@{member.githubUsername}</span>
                      </div>
                    </td>

                    {/* GitLab */}
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        <GitBranch className="w-3.5 h-3.5 text-orange-600" />
                        <span>@{member.gitlabUsername}</span>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-5 py-4">{renderBadge(member.role)}</td>

                    {/* Toggle Status Aktif */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onToggleMemberActive(member.id)}
                        className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                        title="Klik untuk mengubah status aktif"
                      >
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${
                            member.isActive ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                              member.isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                            }`}
                          ></div>
                        </div>
                        <span className={member.isActive ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {member.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    </td>

                    {/* Actions: Dropdown Role or "Beri Role" Button */}
                    <td className="px-5 py-4 text-right">
                      {member.role === 'UNASSIGNED' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenRoleModal(member)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Beri Role
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={e => {
                              const newRole = e.target.value as Role;
                              onUpdateMemberRole(member.id, newRole);
                              showNotification(`Role ${member.name} diubah menjadi ${newRole}`);
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="SUPERADMIN">SUPERADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="DEVELOPER">DEVELOPER</option>
                            <option value="UNASSIGNED">UNASSIGNED</option>
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Beri Role (for Budi Santoso / UNASSIGNED member) */}
      {roleModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Beri Role & Penugasan Tim</h3>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalMember(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                <img
                  src={roleModalMember.avatar}
                  alt={roleModalMember.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-300"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{roleModalMember.name}</h4>
                  <p className="text-xs text-slate-500">{roleModalMember.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                      GitHub: @{roleModalMember.githubUsername}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Pilih Role Akses
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['DEVELOPER', 'MANAGER', 'ADMIN', 'SUPERADMIN'] as Role[]).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`p-3 rounded-xl border text-left font-semibold text-xs flex flex-col gap-1 transition ${
                        selectedRole === role
                          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{role}</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {role === 'DEVELOPER'
                          ? 'Mengerjakan tugas & PR'
                          : role === 'MANAGER'
                          ? 'Memantau sprint & tim'
                          : role === 'ADMIN'
                          ? 'Kelola anggota, tim, repo'
                          : 'Akses penuh + pengaturan'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Pilih Penugasan Tim
                </label>
                <select
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoleModalMember(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRole}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                Konfirmasi & Beri Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Anggota */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Tambah Anggota Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mis. Hendra Wijaya"
                    value={newForm.name}
                    onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Kantor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="hendra@perusahaan.co.id"
                    value={newForm.email}
                    onChange={e => setNewForm({ ...newForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username GitHub
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-sm">@</span>
                    <input
                      type="text"
                      placeholder="hendraw"
                      value={newForm.githubUsername}
                      onChange={e => setNewForm({ ...newForm, githubUsername: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username GitLab
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-sm">@</span>
                    <input
                      type="text"
                      placeholder="hendra.w"
                      value={newForm.gitlabUsername}
                      onChange={e => setNewForm({ ...newForm, gitlabUsername: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role Hak Akses
                  </label>
                  <select
                    value={newForm.role}
                    onChange={e => setNewForm({ ...newForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
                  >
                    <option value="DEVELOPER">DEVELOPER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                    <option value="UNASSIGNED">UNASSIGNED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tim</label>
                  <select
                    value={newForm.teamId}
                    onChange={e => setNewForm({ ...newForm, teamId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
