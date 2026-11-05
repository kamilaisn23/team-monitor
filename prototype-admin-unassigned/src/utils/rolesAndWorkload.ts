import { Member, Repository, Role, SystemSettings, Team, WorkloadThresholds } from '../types';

export const DEFAULT_THRESHOLDS: WorkloadThresholds = {
  low: 3,
  mediumMin: 4,
  mediumMax: 7,
  high: 8,
};

export const DEFAULT_SETTINGS: SystemSettings = {
  workloadThresholds: DEFAULT_THRESHOLDS,
  staleIssueDays: 30,
};

/**
 * Checks if a role is allowed to view and modify settings.
 * Only SUPERADMIN is granted access.
 */
export function canAccessSettings(role: Role): boolean {
  return role === 'SUPERADMIN';
}

/**
 * Calculates workload level based on configured thresholds:
 * Rendah (<= low), Sedang (mediumMin - mediumMax), Tinggi (>= high)
 */
export function getWorkloadStatus(
  activeTasks: number,
  thresholds: WorkloadThresholds = DEFAULT_THRESHOLDS
): 'Rendah' | 'Sedang' | 'Tinggi' {
  if (activeTasks <= thresholds.low) {
    return 'Rendah';
  }
  if (activeTasks >= thresholds.mediumMin && activeTasks <= thresholds.mediumMax) {
    return 'Sedang';
  }
  return 'Tinggi';
}

/**
 * Assigns a new role and optional team to a member.
 */
export function assignRoleToMember(
  member: Member,
  newRole: Role,
  teamId?: string,
  teamName?: string
): Member {
  return {
    ...member,
    role: newRole,
    teamId: teamId !== undefined ? teamId : member.teamId,
    teamName: teamName !== undefined ? teamName : member.teamName,
  };
}

/**
 * Toggles a member's active status.
 */
export function toggleMemberActive(member: Member): Member {
  return {
    ...member,
    isActive: !member.isActive,
  };
}

/**
 * Toggles repository ignored status.
 */
export function toggleRepoIgnored(repo: Repository): Repository {
  return {
    ...repo,
    isIgnored: !repo.isIgnored,
  };
}

/**
 * Assigns a repository to a team.
 */
export function assignRepoToTeam(repo: Repository, teamId?: string): Repository {
  return {
    ...repo,
    teamId: teamId === '' ? undefined : teamId,
  };
}

/**
 * Adds a member to a team's memberIds.
 */
export function addMemberToTeam(team: Team, memberId: string): Team {
  if (team.memberIds.includes(memberId)) {
    return team;
  }
  return {
    ...team,
    memberIds: [...team.memberIds, memberId],
  };
}

/**
 * Removes a member from a team's memberIds.
 */
export function removeMemberFromTeam(team: Team, memberId: string): Team {
  return {
    ...team,
    memberIds: team.memberIds.filter(id => id !== memberId),
  };
}

/**
 * Toggles a team's archived status.
 */
export function toggleTeamArchived(team: Team): Team {
  return {
    ...team,
    isArchived: !team.isArchived,
  };
}
