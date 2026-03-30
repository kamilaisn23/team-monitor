import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { AppRole } from '@/types'

export async function getSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

export async function requireSuperadmin() {
  const session = await getSession()
  if (!session.user.isSuperadmin) redirect('/dashboard')
  return session
}

export async function requireManager() {
  const session = await getSession()
  const role = session.user.role as AppRole
  if (!session.user.isSuperadmin && role !== 'MANAGER') redirect('/dashboard')
  return session
}

export async function requireManagerOrAbove() {
  const session = await getSession()
  const role = session.user.role as AppRole
  const allowed = session.user.isSuperadmin || role === 'MANAGER'
  if (!allowed) redirect('/dashboard')
  return session
}

export async function requireRole(...roles: AppRole[]) {
  const session = await getSession()
  const role = session.user.role as AppRole
  const allowed = session.user.isSuperadmin || roles.includes(role)
  if (!allowed) redirect('/dashboard')
  return session
}
