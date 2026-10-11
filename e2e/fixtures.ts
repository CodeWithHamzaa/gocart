import { test as base, expect } from '@playwright/test'

// ADR-036: `next start` runs in production mode, where the order guard refuses a request with no valid
// client IP (in production the tunnel always sets cf-connecting-ip). A documentation-range address
// stands in for it, but ONLY on requests to the app under test: a context-wide extraHTTPHeaders would
// also add a non-standard header to Cloudflare's widget requests (cross-origin, so a CORS preflight
// could fail) - and that must stay a faithful browser.
export const TEST_CLIENT_IP = '203.0.113.7'
const APP_ORIGIN = `http://localhost:${process.env.E2E_PORT ?? 3100}`

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(`${APP_ORIGIN}/**`, (route) =>
      route.fallback({ headers: { ...route.request().headers(), 'cf-connecting-ip': TEST_CLIENT_IP } }),
    )
    await use(context)
  },
  // On a failing test, print what the browser saw (console errors, failed requests, Cloudflare traffic)
  // straight into the CI log: a bare "status was failed" cannot be debugged without a browser.
  page: async ({ page }, use, testInfo) => {
    const lines: string[] = []
    page.on('console', (m) => {
      if (['error', 'warning'].includes(m.type())) lines.push(`console.${m.type()}: ${m.text().slice(0, 300)}`)
    })
    page.on('pageerror', (e) => lines.push(`pageerror: ${String(e.message).slice(0, 300)}`))
    page.on('requestfailed', (r) => lines.push(`requestfailed: ${r.method()} ${r.url().slice(0, 160)} - ${r.failure()?.errorText}`))
    page.on('response', (r) => {
      if (r.url().includes('challenges.cloudflare.com')) lines.push(`cloudflare: ${r.status()} ${r.url().slice(0, 140)}`)
    })
    await use(page)
    if (testInfo.status !== testInfo.expectedStatus) {
      console.log(`--- browser diagnostics for "${testInfo.title}" ---\n${lines.slice(0, 60).join('\n')}\n--- end ---`)
    }
  },
})

export { expect }
