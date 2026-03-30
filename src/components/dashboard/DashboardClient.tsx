'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { WorkloadLevel } from '@/types'

interface DashboardMember {
  memberId: string
  name: string
  avatarUrl: string | null
  role: string
  teams: { id: string; name: string }[]
  currentLoad: number
  workloadLevel: WorkloadLevel
}

const workloadColors: Record<WorkloadLevel, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default function DashboardClient() {
  const [members, setMembers] = useState<DashboardMember[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([])
  const [repoFilter, setRepoFilter] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/repositories?ignored=false').then((r) => r.json()),
    ]).then(([t, r]) => {
      setTeams(t as { id: string; name: string }[])
      setRepos(r as { id: string; name: string }[])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (teamFilter) params.set('teamId', teamFilter)
    if (repoFilter) params.set('repositoryId', repoFilter)
    if (platformFilter !== 'all') params.set('platform', platformFilter)
    fetch(`/api/dashboard?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => { setMembers(data as DashboardMember[]); setLoading(false) })
  }, [teamFilter, repoFilter, platformFilter])

  const totalOpen = members.reduce((s, m) => s + m.currentLoad, 0)
  const highCount = members.filter((m) => m.workloadLevel === 'high').length

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">Team Dashboard</h2>
        <p className="text-sm text-body dark:text-dark-6">Current workload across the team</p>
      </div>

      {/* Summary Bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Members', value: members.length },
          { label: 'Total Open Issues', value: totalOpen },
          { label: 'High Workload', value: highCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-stroke bg-white p-4 dark:border-stroke-dark dark:bg-gray-dark">
            <p className="text-sm text-body dark:text-dark-6">{stat.label}</p>
            <p className="text-2xl font-bold text-dark dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
        >
          <option value="">All Teams (member-driven)</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
        >
          <option value="">All Repositories</option>
          {repos.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
        >
          <option value="all">All Platforms</option>
          <option value="github">GitHub</option>
          <option value="gitlab">GitLab</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
        {loading ? (
          <div className="p-8 text-center text-body dark:text-dark-6">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-body dark:text-dark-6">No members found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-stroke bg-gray-2 dark:border-stroke-dark dark:bg-[#1a2535]">
                <th className="px-4 py-3 text-left text-sm font-medium text-body dark:text-dark-6">Member</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-body dark:text-dark-6">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-body dark:text-dark-6">Teams</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-body dark:text-dark-6">Open Issues</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-body dark:text-dark-6">Workload</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.memberId} className="border-b border-stroke last:border-0 hover:bg-gray-2/50 dark:border-stroke-dark dark:hover:bg-[#1a2535]/50">
                  <td className="px-4 py-3">
                    <Link href={`/members/${member.memberId}`} className="flex items-center gap-3 hover:text-primary">
                      {member.avatarUrl ? (
                        <Image src={member.avatarUrl} alt={member.name} width={32} height={32} className="rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {member.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-dark dark:text-white">{member.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-body dark:text-dark-6">
                    {member.teams.map((t) => t.name).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                    {member.currentLoad}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${workloadColors[member.workloadLevel]}`}>
                      {member.workloadLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
