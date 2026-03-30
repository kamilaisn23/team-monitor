import { workerData, parentPort } from 'worker_threads'
import path from 'path'
import dotenv from 'dotenv'

// Load env vars — worker threads don't inherit the module cache so we need this
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
  if (!parentPort) {
    console.error('[sync-worker] No parentPort — must be run as a worker thread')
    process.exit(1)
  }

  const port = parentPort

  // Register tsconfig-paths so @/ aliases resolve
  require('tsconfig-paths/register')

  const { runSync } = await import('../src/lib/sync')

  try {
    await runSync((event) => {
      port.postMessage(event)
    })
  } catch (err: unknown) {
    port.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

main()
