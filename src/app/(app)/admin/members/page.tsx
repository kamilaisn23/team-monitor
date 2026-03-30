import { requireSuperadmin } from '@/lib/session'
import AdminMembersClient from '@/components/admin/members/AdminMembersClient'

export default async function AdminMembersPage() {
  await requireSuperadmin()
  return <AdminMembersClient />
}
