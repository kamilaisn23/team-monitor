import { requireManagerOrAbove } from '@/lib/session'
import ReportsClient from '@/components/reports/ReportsClient'

export default async function ReportsPage() {
  await requireManagerOrAbove()
  return <ReportsClient />
}
