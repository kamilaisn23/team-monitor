import { requireSuperadmin } from '@/lib/session'
import AdminTeamsClient from '@/components/admin/teams/AdminTeamsClient'

export default async function AdminTeamsPage() {
  await requireSuperadmin()
  return <AdminTeamsClient />
}
