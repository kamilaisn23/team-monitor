import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessSettings,
  getWorkloadStatus,
  assignRoleToMember,
  toggleMemberActive,
  toggleRepoIgnored,
  assignRepoToTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  DEFAULT_THRESHOLDS,
} from './rolesAndWorkload';
import { Member, Repository, Team } from '../types';

test('canAccessSettings grants access strictly to SUPERADMIN only', () => {
  assert.equal(canAccessSettings('SUPERADMIN'), true);
  assert.equal(canAccessSettings('ADMIN'), false);
  assert.equal(canAccessSettings('MANAGER'), false);
  assert.equal(canAccessSettings('DEVELOPER'), false);
  assert.equal(canAccessSettings('UNASSIGNED'), false);
});

test('getWorkloadStatus categorizes tasks according to thresholds', () => {
  // Low: <= 3
  assert.equal(getWorkloadStatus(0, DEFAULT_THRESHOLDS), 'Rendah');
  assert.equal(getWorkloadStatus(2, DEFAULT_THRESHOLDS), 'Rendah');
  assert.equal(getWorkloadStatus(3, DEFAULT_THRESHOLDS), 'Rendah');

  // Medium: 4 - 7
  assert.equal(getWorkloadStatus(4, DEFAULT_THRESHOLDS), 'Sedang');
  assert.equal(getWorkloadStatus(6, DEFAULT_THRESHOLDS), 'Sedang');
  assert.equal(getWorkloadStatus(7, DEFAULT_THRESHOLDS), 'Sedang');

  // High: > 7
  assert.equal(getWorkloadStatus(8, DEFAULT_THRESHOLDS), 'Tinggi');
  assert.equal(getWorkloadStatus(15, DEFAULT_THRESHOLDS), 'Tinggi');
});

test('assignRoleToMember updates role and team correctly', () => {
  const unassignedUser: Member = {
    id: 'user-budi',
    name: 'Budi Santoso',
    email: 'budi.santoso@company.co.id',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    githubUsername: 'budisantoso',
    gitlabUsername: 'budi.santoso',
    role: 'UNASSIGNED',
    isActive: true,
    activeTasksCount: 0,
    joinDate: '2026-11-01',
  };

  const updatedUser = assignRoleToMember(unassignedUser, 'DEVELOPER', 'team-pe', 'Product Engineering');
  assert.equal(updatedUser.role, 'DEVELOPER');
  assert.equal(updatedUser.teamId, 'team-pe');
  assert.equal(updatedUser.teamName, 'Product Engineering');
  assert.equal(updatedUser.isActive, true);
});

test('toggleMemberActive flips isActive boolean', () => {
  const member: Member = {
    id: '1',
    name: 'Test Member',
    email: 'test@company.co.id',
    avatar: '',
    githubUsername: 'test',
    gitlabUsername: 'test',
    role: 'DEVELOPER',
    isActive: true,
    activeTasksCount: 2,
    joinDate: '2026-01-01',
  };

  const deactivated = toggleMemberActive(member);
  assert.equal(deactivated.isActive, false);

  const reactivated = toggleMemberActive(deactivated);
  assert.equal(reactivated.isActive, true);
});

test('toggleRepoIgnored toggles repo ignore status', () => {
  const repo: Repository = {
    id: 'repo-1',
    name: 'frontend-core',
    description: 'Main web client',
    platform: 'github',
    url: 'https://github.com/company/frontend-core',
    isIgnored: false,
    openPrs: 5,
    defaultBranch: 'main',
    lastActivity: '2 jam lalu',
  };

  const ignored = toggleRepoIgnored(repo);
  assert.equal(ignored.isIgnored, true);

  const restored = toggleRepoIgnored(ignored);
  assert.equal(restored.isIgnored, false);
});

test('assignRepoToTeam tags repository to a team', () => {
  const repo: Repository = {
    id: 'repo-1',
    name: 'payment-gateway',
    description: 'Core billing API',
    platform: 'gitlab',
    url: 'https://gitlab.com/company/payment-gateway',
    isIgnored: false,
    openPrs: 3,
    defaultBranch: 'master',
    lastActivity: '1 hari lalu',
  };

  const tagged = assignRepoToTeam(repo, 'team-pe');
  assert.equal(tagged.teamId, 'team-pe');

  const unassigned = assignRepoToTeam(tagged, '');
  assert.equal(unassigned.teamId, undefined);
});

test('addMemberToTeam and removeMemberFromTeam mutate member list correctly', () => {
  const team: Team = {
    id: 'team-pe',
    name: 'Product Engineering',
    description: 'Core product development',
    leadId: 'user-1',
    leadName: 'Rian Pratama',
    memberIds: ['user-1', 'user-2'],
    repoIds: ['repo-1'],
    isArchived: false,
  };

  const added = addMemberToTeam(team, 'user-3');
  assert.deepEqual(added.memberIds, ['user-1', 'user-2', 'user-3']);

  // Does not duplicate
  const duplicate = addMemberToTeam(added, 'user-3');
  assert.deepEqual(duplicate.memberIds, ['user-1', 'user-2', 'user-3']);

  const removed = removeMemberFromTeam(duplicate, 'user-2');
  assert.deepEqual(removed.memberIds, ['user-1', 'user-3']);
});
