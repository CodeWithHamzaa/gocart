import { getPayload } from 'payload'
import config from '@payload-config'

// M53 / ADR-038: readiness probe for the container healthcheck. Public and unauthenticated, so it
// returns no detail: 200 {status:'ok'} when the app can query the database, 503 {status:'unavailable'}
// otherwise. The cause is logged server-side only.
export const dynamic = 'force-dynamic'

const DB_TIMEOUT_MS = 3000
const headers = { 'Cache-Control': 'no-store' }

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // Initialisation (the database connect) is inside the bound too, not just the query.
    await Promise.race([
      getPayload({ config }).then((payload) => payload.count({ collection: 'categories' })),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`database check timed out after ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS)
      }),
    ])
    return Response.json({ status: 'ok' }, { headers })
  } catch (err) {
    console.error('[health] check failed:', err instanceof Error ? err.message : 'unknown error')
    return Response.json({ status: 'unavailable' }, { status: 503, headers })
  } finally {
    clearTimeout(timer)
  }
}
