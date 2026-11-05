import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { AppRole } from '@/types'

export async function getSession() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

// Superadmin and ADMIN are merged: both have full access, including Settings.
export async function requireSuperadmin() {
  const session = await getSession()
  if (!isAdminRole(session)) redirect('/dashboard')
  return session
}

// isSuperadmin (env-based) OR the ADMIN role — both have identical, full access.
export function isAdminRole(session: { user: { isSuperadmin: boolean; role: AppRole } }) {
  return session.user.isSuperadmin || session.user.role === 'ADMIN'
}

export async function requireAdmin() {
  const session = await getSession()
  if (!isAdminRole(session)) redirect('/dashboard')
  return session
}

export async function requireManager() {
  const session = await getSession()
  const role = session.user.role as AppRole
  if (!isAdminRole(session) && role !== 'MANAGER') redirect('/dashboard')
  return session
}

export async function requireManagerOrAbove() {
  const session = await getSession()
  const role = session.user.role as AppRole
  const allowed = isAdminRole(session) || role === 'MANAGER' || role === 'DEVELOPER'
  if (!allowed) redirect('/dashboard')
  return session
}

export async function requireRole(...roles: AppRole[]) {
  const session = await getSession()
  const role = session.user.role as AppRole
  const allowed = isAdminRole(session) || roles.includes(role)
  if (!allowed) redirect('/dashboard')
  return session
}
