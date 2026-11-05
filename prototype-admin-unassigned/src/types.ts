export type Role = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'DEVELOPER' | 'UNASSIGNED';

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
  githubUsername: string;
  gitlabUsername: string;
  role: Role;
  isActive: boolean;
  teamId?: string;
  teamName?: string;
  activeTasksCount: number;
  joinDate: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  leadId: string;
  leadName: string;
  memberIds: string[];
  repoIds: string[];
  isArchived: boolean;
}

export type Platform = 'github' | 'gitlab';

export interface Repository {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  url: string;
  teamId?: string;
  isIgnored: boolean;
  openPrs: number;
  defaultBranch: string;
  lastActivity: string;
}

export interface WorkloadThresholds {
  low: number;     // e.g. <= 3
  mediumMin: number; // e.g. 4
  mediumMax: number; // e.g. 7
  high: number;    // e.g. > 7
}

export interface SystemSettings {
  workloadThresholds: WorkloadThresholds;
  staleIssueDays: number; // default 30
}

export interface SyncState {
  lastSync: string;
  isSyncing: boolean;
  progress: number;
  currentStep: string;
  completedAt?: string;
}
