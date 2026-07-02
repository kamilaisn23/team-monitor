import { requireAdmin } from '@/lib/session'
import AdminReposClient from '@/components/admin/repositories/AdminReposClient'

export default async function AdminRepositoriesPage() {
  await requireAdmin()
  return <AdminReposClient />
}
