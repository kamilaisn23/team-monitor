import { requireSuperadmin } from '@/lib/session'
import MemberForm from '@/components/admin/members/MemberForm'

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperadmin()
  const { id } = await params
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">Edit Member</h2>
      <MemberForm memberId={id} />
    </div>
  )
}
