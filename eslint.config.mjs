// Next 16 removed `next lint`; ESLint runs directly (`npm run lint` = `eslint .`). eslint-config-next 16
// ships native flat configs, so FlatCompat is no longer needed. Same base rule set as before
// (next/core-web-vitals) and the same ignores.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'media/**', 'payload-types.ts', 'app/(payload)/**', 'migrations/**', 'test-results/**', 'playwright-report/**'] },
  ...nextCoreWebVitals,
  {
    // ADR-037: eslint-config-next 16 brings react-hooks v7, whose React Compiler rules flag patterns this
    // codebase uses on purpose (the Redux `storeRef.current ??= makeStore()` pattern, "latest ref" callbacks
    // in the Turnstile widget, reading sessionStorage in an effect to avoid a hydration mismatch). The app
    // does not use the React Compiler. They stay visible as warnings; rewriting verified checkout code is
    // not part of a framework upgrade.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Playwright fixtures and Node scripts are not React: their `use()` is not a hook.
    files: ['e2e/**', 'scripts/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
]

export default config
