import { requireSuperadmin } from '@/lib/session'
import MemberForm from '@/components/admin/members/MemberForm'

export default async function NewMemberPage() {
  await requireSuperadmin()
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">Add Member</h2>
      <MemberForm />
    </div>
  )
}
