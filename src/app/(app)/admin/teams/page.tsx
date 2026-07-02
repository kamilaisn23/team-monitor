import { requireAdmin } from '@/lib/session'
import AdminTeamsClient from '@/components/admin/teams/AdminTeamsClient'
import { isKerjabaikSyncEnabled, kerjabaikBaseUrl } from '@/lib/kerjabaik-flag'

export default async function AdminTeamsPage() {
  await requireAdmin()
  return (
    <AdminTeamsClient
      kerjabaikEnabled={isKerjabaikSyncEnabled()}
      kerjabaikBaseUrl={kerjabaikBaseUrl()}
    />
  )
}
