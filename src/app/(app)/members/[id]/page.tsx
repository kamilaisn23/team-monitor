import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import MemberProfileClient from '@/components/members/MemberProfileClient'

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  // Developer: redirect to own profile
  if (!session.user.isSuperadmin && session.user.role === 'DEVELOPER' && session.user.id !== id) {
    redirect(session.user.id ? `/members/${session.user.id}` : '/pending')
  }

  return <MemberProfileClient memberId={id} />
}
