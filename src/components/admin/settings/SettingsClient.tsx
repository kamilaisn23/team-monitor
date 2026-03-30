'use client'

import { useState, useEffect } from 'react'
import { getWorkloadLevel } from '@/lib/settings'
import type { WorkloadThresholds } from '@/lib/settings'

const workloadColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const PREVIEW_COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20]

export default function SettingsClient() {
  const [lowMax, setLowMax] = useState(3)
  const [mediumMax, setMediumMax] = useState(7)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const d = data as WorkloadThresholds
        setLowMax(d.lowMax)
        setMediumMax(d.mediumMax)
        setLoading(false)
      })
  }, [])

  const validate = (): string => {
    if (!Number.isInteger(lowMax) || lowMax < 1) return 'Low max must be a positive integer.'
    if (!Number.isInteger(mediumMax) || mediumMax < 1) return 'Medium max must be a positive integer.'
    if (lowMax >= mediumMax) return 'Low max must be less than Medium max.'
    return ''
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lowMax, mediumMax }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json() as { error: string }
      setError(d.error)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const preview: WorkloadThresholds = { lowMax, mediumMax }
  const validationError = validate()

  if (loading) {
    return <div className="p-8 text-center text-body dark:text-dark-6">Loading...</div>
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark dark:text-white">Settings</h2>
        <p className="text-sm text-body dark:text-dark-6">Configure system-wide thresholds and behaviour</p>
      </div>

      {/* Workload thresholds card */}
      <div className="rounded-xl border border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
        <div className="border-b border-stroke px-6 py-4 dark:border-stroke-dark">
          <h3 className="font-semibold text-dark dark:text-white">Workload Thresholds</h3>
          <p className="mt-0.5 text-sm text-body dark:text-dark-6">
            Define how many open issues put a member into each workload band.
          </p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Inputs */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Low max */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                Low — up to
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={lowMax}
                  onChange={(e) => {
                    setSaved(false)
                    setLowMax(parseInt(e.target.value, 10) || 0)
                  }}
                  className="w-24 rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                />
                <span className="text-sm text-body dark:text-dark-6">open issues</span>
              </div>
              <p className="mt-1 text-xs text-body dark:text-dark-6">
                0 – {isNaN(lowMax) ? '?' : lowMax} issues → <span className="font-medium text-green-700 dark:text-green-400">Low</span>
              </p>
            </div>

            {/* Medium max */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Medium — up to
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  value={mediumMax}
                  onChange={(e) => {
                    setSaved(false)
                    setMediumMax(parseInt(e.target.value, 10) || 0)
                  }}
                  className="w-24 rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-stroke-dark dark:bg-gray-dark dark:text-white"
                />
                <span className="text-sm text-body dark:text-dark-6">open issues</span>
              </div>
              <p className="mt-1 text-xs text-body dark:text-dark-6">
                {isNaN(lowMax) ? '?' : lowMax + 1} – {isNaN(mediumMax) ? '?' : mediumMax} issues → <span className="font-medium text-yellow-700 dark:text-yellow-400">Medium</span>
              </p>
            </div>
          </div>

          {/* High description — derived */}
          <div className="rounded-lg border border-stroke bg-gray-2/60 px-4 py-3 dark:border-stroke-dark dark:bg-[#1a2535]">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-dark dark:text-white">High</span>
              <span className="text-sm text-body dark:text-dark-6">
                — {isNaN(mediumMax) ? '?' : mediumMax + 1}+ open issues
              </span>
            </div>
            <p className="mt-1 text-xs text-body dark:text-dark-6">
              This band is automatic: anything above Medium max is High.
            </p>
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
          )}
          {error && !validationError && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Preview table */}
          <div>
            <p className="mb-2 text-sm font-medium text-dark dark:text-white">Live Preview</p>
            <div className="overflow-hidden rounded-lg border border-stroke dark:border-stroke-dark">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-gray-2 dark:border-stroke-dark dark:bg-[#1a2535]">
                    <th className="px-4 py-2 text-left font-medium text-body dark:text-dark-6">Open Issues</th>
                    <th className="px-4 py-2 text-left font-medium text-body dark:text-dark-6">Workload Level</th>
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_COUNTS.map((count) => {
                    const level = validationError ? null : getWorkloadLevel(count, preview)
                    return (
                      <tr key={count} className="border-b border-stroke last:border-0 dark:border-stroke-dark">
                        <td className="px-4 py-2 text-dark dark:text-white">{count}</td>
                        <td className="px-4 py-2">
                          {level ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${workloadColors[level]}`}>
                              {level}
                            </span>
                          ) : (
                            <span className="text-xs text-body dark:text-dark-6">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !!validationError}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
