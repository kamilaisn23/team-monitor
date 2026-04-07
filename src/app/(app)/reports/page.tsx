import { requireRole } from '@/lib/session'
import ReportsClient from '@/components/reports/ReportsClient'

export default async function ReportsPage() {
  await requireRole('MANAGER', 'DEVELOPER')
  return <ReportsClient />
}
