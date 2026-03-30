import cron from 'node-cron'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Dynamic import after env is loaded
async function main() {
  const { runSync } = await import('../src/lib/sync')

  // Run once on startup
  console.log('[sync] Running initial sync...')
  await runSync()

  // Schedule hourly
  cron.schedule('0 * * * *', async () => {
    console.log(`[sync] Starting scheduled sync at ${new Date().toISOString()}`)
    await runSync()
  })

  console.log('[sync] Scheduler started — next run at the top of the hour')
}

main().catch((err) => {
  console.error('[sync] Fatal error:', err)
  process.exit(1)
})
