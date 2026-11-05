import React, { useState, useEffect } from 'react';
import {
  Member,
  Repository,
  Role,
  SystemSettings,
  Team,
} from './types';
import {
  INITIAL_MEMBERS,
  INITIAL_TEAMS,
  INITIAL_REPOSITORIES,
  INITIAL_SETTINGS,
} from './data/initialData';
import {
  assignRoleToMember,
  toggleMemberActive,
  toggleRepoIgnored,
  assignRepoToTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  toggleTeamArchived,
  canAccessSettings,
} from './utils/rolesAndWorkload';

import { SimulatorBar } from './components/SimulatorBar';
import { Sidebar, AdminTab } from './components/Sidebar';
import { SyncModal } from './components/SyncModal';
import { MemberManagement } from './components/MemberManagement';
import { TeamManagement } from './components/TeamManagement';
import { RepoManagement } from './components/RepoManagement';
import { SettingsView } from './components/SettingsView';
import { UnassignedPendingView } from './components/UnassignedPendingView';
import { SummaryOverview } from './components/SummaryOverview';
import { ReportsView } from './components/ReportsView';
import { ManagerDashboard } from './components/ManagerDashboard';
import { DeveloperDashboard } from './components/DeveloperDashboard';

export default function App() {
  // Global State
  const [currentRole, setCurrentRole] = useState<Role>('SUPERADMIN');
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Hari ini, 19:15 WIB');

  // Application Data State
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [repositories, setRepositories] = useState<Repository[]>(INITIAL_REPOSITORIES);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // Sync URL hash with active state for bookmarking/navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'pending') {
        setCurrentRole('UNASSIGNED');
      } else if (hash === 'admin/members') {
        setActiveTab('members');
      } else if (hash === 'admin/teams') {
        setActiveTab('teams');
      } else if (hash === 'admin/repositories') {
        setActiveTab('repositories');
      } else if (hash === 'admin/settings') {
        setActiveTab('settings');
      } else if (hash === 'summary') {
        setActiveTab('summary');
      } else if (hash === 'reports') {
        setActiveTab('reports');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when tab or role changes
  const navigateToTab = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'members') window.location.hash = 'admin/members';
    else if (tab === 'teams') window.location.hash = 'admin/teams';
    else if (tab === 'repositories') window.location.hash = 'admin/repositories';
    else if (tab === 'settings') window.location.hash = 'admin/settings';
    else if (tab === 'summary') window.location.hash = 'summary';
    else if (tab === 'reports') window.location.hash = 'reports';
  };

  const handleRoleSelect = (role: Role) => {
    setCurrentRole(role);
    if (role === 'UNASSIGNED') {
      window.location.hash = 'pending';
    } else {
      if (window.location.hash === '#pending') {
        window.location.hash = 'admin/members';
      }
      // If moving from Superadmin to Admin while on settings, or navigating
      if (role === 'ADMIN' && activeTab === 'settings') {
        // Will show "Akses Ditolak" screen inside SettingsView!
      }
    }
  };

  const handleLoginWithGithub = () => {
    setCurrentRole('UNASSIGNED');
    window.location.hash = 'pending';
  };

  const handleLogout = () => {
    // Return to simulator selector or default role
    setCurrentRole('ADMIN');
    setActiveTab('summary');
    window.location.hash = 'summary';
  };

  // Member Handlers
  const handleUpdateMemberRole = (
    memberId: string,
    newRole: Role,
    teamId?: string,
    teamName?: string
  ) => {
    setMembers(prevMembers =>
      prevMembers.map(m => {
        if (m.id === memberId) {
          return assignRoleToMember(m, newRole, teamId, teamName);
        }
        return m;
      })
    );

    // If a team was assigned, also update team's memberIds
    if (teamId) {
      setTeams(prevTeams =>
        prevTeams.map(t => {
          if (t.id === teamId) {
            return addMemberToTeam(t, memberId);
          }
          return removeMemberFromTeam(t, memberId);
        })
      );
    }
  };

  const handleToggleMemberActive = (memberId: string) => {
    setMembers(prev =>
      prev.map(m => (m.id === memberId ? toggleMemberActive(m) : m))
    );
  };

  const handleAddMember = (
    newMemberData: Omit<Member, 'id' | 'joinDate' | 'activeTasksCount'>
  ) => {
    const newId = `user-${Date.now()}`;
    const newMember: Member = {
      ...newMemberData,
      id: newId,
      joinDate: new Date().toISOString().split('T')[0],
      activeTasksCount: 0,
    };

    setMembers(prev => [newMember, ...prev]);

    if (newMember.teamId) {
      setTeams(prev =>
        prev.map(t => (t.id === newMember.teamId ? addMemberToTeam(t, newId) : t))
      );
    }
  };

  // Team Handlers
  const handleAddTeam = (
    newTeamData: Omit<Team, 'id' | 'memberIds' | 'repoIds' | 'isArchived'>
  ) => {
    const newTeam: Team = {
      ...newTeamData,
      id: `team-${Date.now()}`,
      memberIds: [],
      repoIds: [],
      isArchived: false,
    };
    setTeams(prev => [...prev, newTeam]);
  };

  const handleToggleArchiveTeam = (teamId: string) => {
    setTeams(prev =>
      prev.map(t => (t.id === teamId ? toggleTeamArchived(t) : t))
    );
  };

  const handleToggleTeamMember = (teamId: string, memberId: string) => {
    setTeams(prev =>
      prev.map(t => {
        if (t.id === teamId) {
          const isMember = t.memberIds.includes(memberId);
          return isMember
            ? removeMemberFromTeam(t, memberId)
            : addMemberToTeam(t, memberId);
        }
        return t;
      })
    );

    // Update member's teamName as well
    const team = teams.find(t => t.id === teamId);
    setMembers(prev =>
      prev.map(m => {
        if (m.id === memberId) {
          const isCurrentlyInTeam = teams
            .find(t => t.id === teamId)
            ?.memberIds.includes(memberId);
          return {
            ...m,
            teamId: isCurrentlyInTeam ? undefined : teamId,
            teamName: isCurrentlyInTeam ? undefined : team?.name,
          };
        }
        return m;
      })
    );
  };

  // Repository Handlers
  const handleTagRepoToTeam = (repoId: string, teamId: string) => {
    setRepositories(prev =>
      prev.map(r => (r.id === repoId ? assignRepoToTeam(r, teamId) : r))
    );
  };

  const handleToggleIgnoreRepo = (repoId: string) => {
    setRepositories(prev =>
      prev.map(r => (r.id === repoId ? toggleRepoIgnored(r) : r))
    );
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
  };

  // --- UNASSIGNED MODE RENDER ---
  // As per requirement 8:
  // "Mode Unassigned: setelah 'Login dengan GitHub', tampilkan halaman tunggu (/pending)
  // berisi ikon jam, judul 'Akun Menunggu Persetujuan', penjelasan bahwa admin harus memberi role,
  // nama dan username GitHub user, dan tombol 'Keluar'. Tidak ada sidebar atau data lain."
  if (currentRole === 'UNASSIGNED') {
    const budiMember = members.find(m => m.id === 'user-budi');

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <SimulatorBar
          currentRole={currentRole}
          onSelectRole={handleRoleSelect}
          onLoginGithub={handleLoginWithGithub}
        />
        <UnassignedPendingView
          unassignedUser={budiMember}
          onLogout={handleLogout}
          onSwitchToAdmin={() => handleRoleSelect('ADMIN')}
        />
      </div>
    );
  }

  // --- MAIN APP RENDER (SUPERADMIN, ADMIN, MANAGER, DEVELOPER) ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* 1. Simulator Bar at top */}
      <SimulatorBar
        currentRole={currentRole}
        onSelectRole={handleRoleSelect}
        onLoginGithub={handleLoginWithGithub}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 2. Navy Sidebar */}
        <Sidebar
          currentRole={currentRole}
          activeTab={activeTab}
          onNavigate={navigateToTab}
          onOpenSync={() => setIsSyncModalOpen(true)}
          lastSyncTime={lastSyncTime}
          onLogout={handleLogout}
        />

        {/* 3. Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-h-[calc(100vh-42px)]">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* MANAGER View */}
            {currentRole === 'MANAGER' && activeTab === 'summary' && (
              <ManagerDashboard
                members={members}
                teams={teams}
                repositories={repositories}
                settings={settings}
              />
            )}

            {/* DEVELOPER View */}
            {currentRole === 'DEVELOPER' && activeTab === 'summary' && (
              <DeveloperDashboard
                currentMember={members.find(m => m.id === 'user-dewi')}
                repositories={repositories}
              />
            )}

            {/* Ringkasan (Admin / Superadmin default or tab) */}
            {activeTab === 'summary' &&
              currentRole !== 'MANAGER' &&
              currentRole !== 'DEVELOPER' && (
                <SummaryOverview
                  currentRole={currentRole}
                  members={members}
                  teams={teams}
                  repositories={repositories}
                  settings={settings}
                  onNavigate={navigateToTab}
                  onOpenRoleModalForMember={member => {
                    setActiveTab('members');
                  }}
                />
              )}

            {/* Laporan */}
            {activeTab === 'reports' && (
              <ReportsView repositories={repositories} settings={settings} />
            )}

            {/* Administrasi: Anggota (/admin/members) */}
            {activeTab === 'members' && (
              <MemberManagement
                members={members}
                teams={teams}
                onUpdateMemberRole={handleUpdateMemberRole}
                onToggleMemberActive={handleToggleMemberActive}
                onAddMember={handleAddMember}
              />
            )}

            {/* Administrasi: Tim (/admin/teams) */}
            {activeTab === 'teams' && (
              <TeamManagement
                teams={teams}
                members={members}
                onAddTeam={handleAddTeam}
                onToggleArchiveTeam={handleToggleArchiveTeam}
                onToggleTeamMember={handleToggleTeamMember}
              />
            )}

            {/* Administrasi: Repositori (/admin/repositories) */}
            {activeTab === 'repositories' && (
              <RepoManagement
                repositories={repositories}
                teams={teams}
                onTagRepoToTeam={handleTagRepoToTeam}
                onToggleIgnoreRepo={handleToggleIgnoreRepo}
              />
            )}

            {/* Administrasi: Pengaturan (/admin/settings) */}
            {activeTab === 'settings' && (
              <SettingsView
                currentRole={currentRole}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onNavigateToSummary={() => navigateToTab('summary')}
              />
            )}
          </div>
        </main>
      </div>

      {/* 4. Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        lastSyncTime={lastSyncTime}
        onSyncComplete={newTime => setLastSyncTime(newTime)}
      />
    </div>
  );
}
