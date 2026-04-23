import { requireSuperadmin } from '@/lib/session'
import { redirect } from 'next/navigation'
import MemberForm from '@/components/admin/members/MemberForm'
import { isKerjabaikSyncEnabled } from '@/lib/kerjabaik-flag'

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperadmin()
  if (isKerjabaikSyncEnabled()) redirect('/admin/members')
  const { id } = await params
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">Edit Member</h2>
      <MemberForm memberId={id} />
    </div>
  )
}
