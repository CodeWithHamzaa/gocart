'use client'

// M52b: Cloudflare Turnstile widget for the two guest forms that hit rate-limited server
// actions — Place Order (components/OrderSummary.jsx) and the order lookup
// (app/(public)/orders/OrderLookup.tsx). ADR-035 decision 8. Cloudflare's script is injected
// lazily on mount, once per page load, and never from a layout, so no indexable page loads it
// (/cart and /orders are noindex). Explicit render, appearance 'interaction-only' (most
// visitors see nothing). The parent disables its submit button only while the status is
// 'loading', for at most 10 s; when the widget fails or there is no site key the form still
// submits and the server degrades to today's strict per-IP limit (the owner's outage policy).
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const LOAD_CAP_MS = 10_000
const FLEXIBLE_MIN_WIDTH = 300
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export type TurnstileStatus = 'disabled' | 'loading' | 'verified' | 'failed'
export type TurnstileState = { token: string | null; status: TurnstileStatus }
export type TurnstileHandle = { reset: () => void }

type RenderOptions = {
  sitekey: string
  action: string
  appearance: 'interaction-only'
  size: 'compact' | 'flexible'
  theme: 'light'
  language: 'auto'
  'refresh-expired': 'auto'
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => boolean
  'timeout-callback': () => void
}

type TurnstileApi = {
  render: (container: HTMLElement, options: RenderOptions) => string | undefined
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/** Initial state for a parent's useState, consistent between server and client renders. */
export function initialTurnstileState(): TurnstileState {
  return { token: null, status: SITE_KEY ? 'loading' : 'disabled' }
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')))
    script.onerror = () => {
      script.remove()
      reject(new Error('turnstile script failed to load'))
    }
    document.head.appendChild(script)
  })
  // A failed load may be retried by a later mount (e.g. the next page visit).
  scriptPromise.catch(() => {
    scriptPromise = null
  })
  return scriptPromise
}

const STATUS_TEXT: Partial<Record<TurnstileStatus, string>> = {
  loading: 'Running a quick security check…',
  failed: "The security check couldn't load. You can still continue.",
}

export function TurnstileWidget({
  action,
  onChange,
  ref,
  className = '',
}: {
  action: 'place_order' | 'order_lookup'
  onChange: (state: TurnstileState) => void
  ref?: Ref<TurnstileHandle>
  className?: string
}) {
  const [status, setStatus] = useState<TurnstileStatus>(() => initialTurnstileState().status)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const report = (next: TurnstileState) => {
    setStatus(next.status)
    onChangeRef.current(next)
  }
  const clearCap = () => {
    if (capTimerRef.current) clearTimeout(capTimerRef.current)
    capTimerRef.current = null
  }
  // 'loading' never lasts more than 10 s: after that the form may submit and the server degrades.
  const startLoading = () => {
    clearCap()
    report({ token: null, status: 'loading' })
    capTimerRef.current = setTimeout(() => report({ token: null, status: 'failed' }), LOAD_CAP_MS)
  }
  const reportRef = useRef({ report, clearCap, startLoading })
  reportRef.current = { report, clearCap, startLoading }

  useImperativeHandle(ref, () => ({
    // Tokens are single-use: the parent calls this after every submission that does not
    // navigate away. Without a rendered widget (script failed, no site key) nothing changes.
    reset() {
      const id = widgetIdRef.current
      if (!id || !window.turnstile) return
      reportRef.current.startLoading()
      window.turnstile.reset(id)
    },
  }))

  useEffect(() => {
    const r = reportRef.current
    if (!SITE_KEY) {
      r.report({ token: null, status: 'disabled' })
      return
    }
    let cancelled = false
    r.startLoading()
    loadTurnstile()
      .then((api) => {
        const container = containerRef.current
        if (cancelled || !container) return
        const fail = () => {
          reportRef.current.clearCap()
          reportRef.current.report({ token: null, status: 'failed' })
        }
        const id = api.render(container, {
          sitekey: SITE_KEY,
          action,
          appearance: 'interaction-only',
          // 'flexible' needs about 300 px; the 320 px phone layout gets 'compact'.
          size: container.clientWidth < FLEXIBLE_MIN_WIDTH ? 'compact' : 'flexible',
          theme: 'light',
          language: 'auto',
          'refresh-expired': 'auto',
          callback: (token) => {
            reportRef.current.clearCap()
            reportRef.current.report({ token, status: 'verified' })
          },
          'expired-callback': () => reportRef.current.startLoading(),
          'error-callback': () => {
            fail()
            return true // handled: do not throw in the console
          },
          'timeout-callback': fail,
        })
        if (id === undefined) fail()
        else widgetIdRef.current = id
      })
      .catch(() => {
        if (cancelled) return
        reportRef.current.clearCap()
        reportRef.current.report({ token: null, status: 'failed' })
      })

    return () => {
      cancelled = true
      reportRef.current.clearCap()
      const id = widgetIdRef.current
      widgetIdRef.current = null
      if (id && window.turnstile) window.turnstile.remove(id)
    }
  }, [action])

  return (
    <div data-turnstile-status={status} className={`max-w-full ${className}`}>
      <div ref={containerRef} className="max-w-full" />
      <p aria-live="polite" className="text-xs text-slate-500">
        {STATUS_TEXT[status] ?? ''}
      </p>
    </div>
  )
}
