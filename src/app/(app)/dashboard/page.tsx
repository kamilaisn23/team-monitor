import { requireRole } from '@/lib/session'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  await requireRole('MANAGER', 'DEVELOPER')
  return <DashboardClient />
}
