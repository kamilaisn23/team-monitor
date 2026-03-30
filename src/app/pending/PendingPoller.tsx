'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PendingPoller() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/session')
        if (!res.ok) return
        const session = await res.json() as { user?: { role?: string; id?: string; isSuperadmin?: boolean } }
        const role = session?.user?.role
        if (role && role !== 'UNASSIGNED') {
          clearInterval(interval)
          if (role === 'DEVELOPER') {
            const id = session.user?.id
            router.push(id ? `/members/${id}` : '/dashboard')
          } else {
            router.push('/dashboard')
          }
        }
      } catch {
        // network error — silently retry next tick
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [router])

  return (
    <p className="mb-4 text-xs text-body dark:text-dark-6">
      This page will automatically redirect once your role is assigned.
    </p>
  )
}
