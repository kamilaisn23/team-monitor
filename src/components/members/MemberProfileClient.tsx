'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dayjs from 'dayjs'

interface Member {
  id: string
  name: string
  usernameGithub: string | null
  usernameGitlab: string | null
  role: string
  avatarUrl: string | null
  lastLoginAt: string | null
  teams: { id: string; name: string }[]
}

interface Stats {
  currentLoad: number
  issuesCreated: number
  issuesAssigned: number
  issuesResolved: number
}

interface Issue {
  id: string
  title: string
  url: string
  state: string
  platform: string
  repository: { id: string; name: string }
  createdAt: string
  closedAt: string | null
  isCreator: boolean
  isAssignee: boolean
}

export default function MemberProfileClient({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<Member | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [issueTotal, setIssueTotal] = useState(0)
  const [platform, setPlatform] = useState('all')
  const [tab, setTab] = useState<'open' | 'resolved' | 'created'>('open')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const currentMonth = dayjs().format('YYYY-MM')

  useEffect(() => {
    fetch(`/api/members/${memberId}`)
      .then((r) => r.json())
      .then((data) => setMember(data as Member))
  }, [memberId])

  useEffect(() => {
    const params = new URLSearchParams({ month: currentMonth, platform })
    fetch(`/api/members/${memberId}/stats?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setStats(data as Stats))
  }, [memberId, platform, currentMonth])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ platform, page: String(page), limit: '20' })
    if (tab === 'open') params.set('state', 'open')
    else if (tab === 'resolved') { params.set('state', 'closed'); params.set('type', 'assigned') }
    else if (tab === 'created') params.set('type', 'created')
    fetch(`/api/members/${memberId}/issues?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const d = data as { data: Issue[]; total: number }
        setIssues(d.data)
        setIssueTotal(d.total)
        setLoading(false)
      })
  }, [memberId, platform, tab, page])

  if (!member) return <div className="p-8 text-center text-body">Loading...</div>

  return (
    <div>
      {/* Header */}
      <div className="mb-6 rounded-xl border border-stroke bg-white p-6 dark:border-stroke-dark dark:bg-gray-dark">
        <div className="flex items-start gap-4">
          {member.avatarUrl ? (
            <Image src={member.avatarUrl} alt={member.name} width={64} height={64} className="rounded-full" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {member.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-dark dark:text-white">{member.name}</h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {member.role}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-body dark:text-dark-6">
              {member.usernameGithub && (
                <a href={`https://github.com/${member.usernameGithub}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  GitHub: @{member.usernameGithub}
                </a>
              )}
              {member.usernameGitlab && (
                <span>GitLab: @{member.usernameGitlab}</span>
              )}
            </div>
            {member.teams.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {member.teams.map((t) => (
                  <span key={t.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-body dark:bg-[#1a2535] dark:text-dark-6">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
            {member.lastLoginAt && (
              <p className="mt-2 text-xs text-body dark:text-dark-6">
                Last login: {dayjs(member.lastLoginAt).format('MMM D, YYYY')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Platform filter */}
      <div className="mb-4 flex gap-2">
        {['all', 'github', 'gitlab'].map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
              platform === p
                ? 'bg-primary text-white'
                : 'bg-white text-body hover:bg-gray-2 dark:bg-gray-dark dark:text-dark-6 dark:hover:bg-[#1a2535]'
            }`}
          >
            {p === 'all' ? 'All Platforms' : p}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Open Issues', value: stats?.currentLoad ?? '—' },
          { label: 'Created This Month', value: stats?.issuesCreated ?? '—' },
          { label: 'Assigned This Month', value: stats?.issuesAssigned ?? '—' },
          { label: 'Resolved This Month', value: stats?.issuesResolved ?? '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-stroke bg-white p-4 dark:border-stroke-dark dark:bg-gray-dark">
            <p className="text-sm text-body dark:text-dark-6">{stat.label}</p>
            <p className="text-2xl font-bold text-dark dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Issue list */}
      <div className="rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
        <div className="flex border-b border-stroke dark:border-stroke-dark">
          {(['open', 'resolved', 'created'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1) }}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-body hover:text-dark dark:text-dark-6 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-body">Loading...</div>
        ) : issues.length === 0 ? (
          <div className="p-8 text-center text-body">No issues found.</div>
        ) : (
          <div>
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-3 border-b border-stroke p-4 last:border-0 dark:border-stroke-dark">
                <div className="flex-1 min-w-0">
                  <a href={issue.url} target="_blank" rel="noopener noreferrer" className="font-medium text-dark hover:text-primary dark:text-white dark:hover:text-primary truncate block">
                    {issue.title}
                  </a>
                  <div className="mt-1 flex items-center gap-2 text-xs text-body dark:text-dark-6">
                    <span>{issue.repository.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 font-medium ${
                      issue.platform === 'GITHUB' ? 'bg-gray-100 dark:bg-[#1a2535]' : 'bg-orange-50 dark:bg-orange-900/20'
                    }`}>{issue.platform}</span>
                    <span>{dayjs(issue.createdAt).format('MMM D, YYYY')}</span>
                    {issue.closedAt && <span>Closed: {dayjs(issue.closedAt).format('MMM D, YYYY')}</span>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  issue.state === 'OPEN' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-[#1a2535] dark:text-dark-6'
                }`}>
                  {issue.state}
                </span>
              </div>
            ))}
            {issueTotal > 20 && (
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-body dark:text-dark-6">{issueTotal} total</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded px-3 py-1 text-sm disabled:opacity-50">← Prev</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= issueTotal} className="rounded px-3 py-1 text-sm disabled:opacity-50">Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
