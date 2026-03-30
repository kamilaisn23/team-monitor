import { requireManagerOrAbove } from '@/lib/session'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  await requireManagerOrAbove()
  return <DashboardClient />
}
