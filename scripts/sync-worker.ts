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
  const source: string = workerData?.source ?? 'all'

  // Register tsconfig-paths so @/ aliases resolve
  require('tsconfig-paths/register')

  try {
    if (source === 'kerjabaik') {
      const { runKerjabaikSync } = await import('../src/lib/sync-kerjabaik')
      await runKerjabaikSync((event) => port.postMessage(event))
    } else if (source === 'github' || source === 'gitlab') {
      const { runSync } = await import('../src/lib/sync')
      await runSync((event) => port.postMessage(event), source)
    } else {
      // 'all' (default): kerjabaik first, then github+gitlab
      const { runKerjabaikSync } = await import('../src/lib/sync-kerjabaik')
      const { runSync } = await import('../src/lib/sync')
      await runKerjabaikSync((event) => port.postMessage(event))
      await runSync((event) => port.postMessage(event))
    }
  } catch (err: unknown) {
    port.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

main()
