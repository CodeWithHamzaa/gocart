import { defineConfig, devices } from '@playwright/test'

// M56a: one golden-path E2E test against a production build (`next start`) backed by a
// freshly seeded PostgreSQL. Locally: seed a throwaway database, `npm run build`, then
// `npm run test:e2e` (it starts the server itself). In CI the workflow does the same.
//
// Needs DATABASE_URI and PAYLOAD_SECRET in the environment — the same ones the app uses.
// The port is 3100 so a dev server on 3000 does not collide with the test server.
const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  // The tests create orders and share one database: run them one at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0, // a retry would hide a flaky money path; a failure is a failure
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Mobile-first store: the golden path runs at a phone viewport.
    ...devices['Pixel 7'],
    // Root in a container (this sandbox) cannot use Chromium's sandbox; CI runners can.
    launchOptions: { args: process.env.CI ? [] : ['--no-sandbox'] },
  },
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
