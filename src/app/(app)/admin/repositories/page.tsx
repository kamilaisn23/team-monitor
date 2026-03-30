import { requireSuperadmin } from '@/lib/session'
import AdminReposClient from '@/components/admin/repositories/AdminReposClient'

export default async function AdminRepositoriesPage() {
  await requireSuperadmin()
  return <AdminReposClient />
}
