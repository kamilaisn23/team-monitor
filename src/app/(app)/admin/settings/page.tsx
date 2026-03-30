import { requireSuperadmin } from '@/lib/session'
import SettingsClient from '@/components/admin/settings/SettingsClient'

export default async function AdminSettingsPage() {
  await requireSuperadmin()
  return <SettingsClient />
}
