import { requireAdmin } from '@/lib/session'
import { redirect } from 'next/navigation'
import MemberForm from '@/components/admin/members/MemberForm'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'

export default async function NewMemberPage() {
  await requireAdmin()
  if (isKerjabaikSyncEnabled()) redirect('/admin/members')
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">Add Member</h2>
      <MemberForm />
    </div>
  )
}
