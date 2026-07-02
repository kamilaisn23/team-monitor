import { requireAdmin } from '@/lib/session'
import AdminMembersClient from '@/components/admin/members/AdminMembersClient'
import { isKerjabaikSyncEnabled, kerjabaikBaseUrl } from '@/lib/kerjabaik-flag'

export default async function AdminMembersPage() {
  await requireAdmin()
  return (
    <AdminMembersClient
      kerjabaikEnabled={isKerjabaikSyncEnabled()}
      kerjabaikBaseUrl={kerjabaikBaseUrl()}
    />
  )
}
