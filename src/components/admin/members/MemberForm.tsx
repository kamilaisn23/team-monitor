'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
}

interface MemberFormProps {
  memberId?: string
}

export default function MemberForm({ memberId }: MemberFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [usernameGithub, setUsernameGithub] = useState('')
  const [usernameGitlab, setUsernameGitlab] = useState('')
  const [role, setRole] = useState('DEVELOPER')
  const [isActive, setIsActive] = useState(true)
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/teams').then((r) => r.json()).then((t) => setTeams(t as Team[]))
    if (memberId) {
      fetch(`/api/members/${memberId}`)
        .then((r) => r.json())
        .then((data) => {
          const m = data as { name: string; usernameGithub: string | null; usernameGitlab: string | null; role: string; isActive: boolean; teams: { id: string }[] }
          setName(m.name)
          setUsernameGithub(m.usernameGithub ?? '')
          setUsernameGitlab(m.usernameGitlab ?? '')
          setRole(m.role)
          setIsActive(m.isActive)
          setSelectedTeams(m.teams.map((t) => t.id))
        })
    }
  }, [memberId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Display name is required'); return }

    setLoading(true)
    const body = {
      name: name.trim(),
      usernameGithub: usernameGithub.trim() || undefined,
      usernameGitlab: usernameGitlab.trim() || undefined,
      role,
      ...(memberId ? { isActive } : {}),
    }

    const url = memberId ? `/api/members/${memberId}` : '/api/members'
    const method = memberId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json() as { error: string }
      setError(data.error)
      setLoading(false)
      return
    }

    const saved = await res.json() as { id: string }
    const savedId = memberId ?? saved.id

    // Update team memberships
    if (memberId) {
      // Get current teams
      const memberData = await fetch(`/api/members/${savedId}`).then((r) => r.json()) as { teams: { id: string }[] }
      const currentTeamIds = new Set(memberData.teams.map((t) => t.id))
      const newTeamIds = new Set(selectedTeams)

      // Add new memberships
      for (const teamId of newTeamIds) {
        if (!currentTeamIds.has(teamId)) {
          await fetch(`/api/teams/${teamId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId: savedId }),
          })
        }
      }
      // Remove old memberships
      for (const teamId of currentTeamIds) {
        if (!newTeamIds.has(teamId)) {
          await fetch(`/api/teams/${teamId}/members/${savedId}`, { method: 'DELETE' })
        }
      }
    } else {
      // Add all selected teams for new member
      for (const teamId of selectedTeams) {
        await fetch(`/api/teams/${teamId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: savedId }),
        })
      }
    }

    router.push('/admin/members')
  }

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-stroke bg-white p-6 dark:border-stroke-dark dark:bg-gray-dark">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
            placeholder="Full name"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">GitHub Username</label>
          <input
            type="text"
            value={usernameGithub}
            onChange={(e) => setUsernameGithub(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
            placeholder="github-username"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">GitLab Username</label>
          <input
            type="text"
            value={usernameGitlab}
            onChange={(e) => setUsernameGitlab(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
            placeholder="gitlab-username"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
          >
            <option value="MANAGER">Manager</option>
            <option value="DEVELOPER">Developer</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>
        </div>

        {memberId && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
              Status
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isActive ? 'text-green-600 dark:text-green-400' : 'text-body dark:text-dark-6'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        )}

        {teams.length > 0 && (
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Teams</label>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedTeams.includes(team.id)
                      ? 'bg-primary text-white'
                      : 'border border-stroke bg-white text-body hover:bg-gray-2 dark:border-stroke-dark dark:bg-gray-dark dark:text-dark-6'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : memberId ? 'Save Changes' : 'Add Member'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/members')}
            className="rounded-lg border border-stroke px-6 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-stroke-dark dark:text-white dark:hover:bg-[#1a2535]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
