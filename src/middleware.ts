import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  // Public design preview contains only fictional, browser-local data.
  if (pathname === '/preview') return NextResponse.next()
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  // Not authenticated → redirect to login
  if (!session) {
    if (pathname === '/login') return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Authenticated on login page → redirect to dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const role = session.user.role
  const isSuperadmin = session.user.isSuperadmin

  // Unassigned → pending page only
  if (role === 'UNASSIGNED' && !isSuperadmin) {
    if (pathname === '/pending') return NextResponse.next()
    return NextResponse.redirect(new URL('/pending', req.url))
  }

  // Developer access restrictions (admin pages only)
  if (role === 'DEVELOPER' && !isSuperadmin) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Manager cannot access admin pages (except members/teams reading which is allowed in UI)
  if (role === 'MANAGER' && !isSuperadmin) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Admin role has the same access as superadmin, except Settings
  if (role === 'ADMIN' && !isSuperadmin) {
    if (pathname.startsWith('/admin/settings')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts|images).*)'],
}
