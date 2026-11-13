'use client'

// M36: guest order lookup form (ADR-024). Calls only the lookupOrderAction server
// action — no REST fetch, and the order number/phone never appear in the URL.
// M52b (ADR-035/036): sends a Turnstile token; the button stays disabled until the check has
// produced one (an unreachable check means no lookup - the message says to contact the store).
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { readLastOrder } from '@/lib/order-confirmation'
import { lookupOrderAction } from './actions'
import type { LookupOrderActionResult } from './actions'
import OrderItem from '@/components/OrderItem'
import { buttonClasses } from '@/components/ui/Button'
import { TurnstileWidget, initialTurnstileState } from '@/components/TurnstileWidget'
import type { TurnstileHandle, TurnstileState } from '@/components/TurnstileWidget'

// Milestone 120: each field has a one-line hint linked with aria-describedby. Still one form with one submit button;
// the answer for a wrong number and a wrong phone is the same message, as before (the server decides).
// M66: the redesign's field style (tokens, visible focus).
// Milestone 121: the fields keep the site's 2px focus ring (the earlier outline-none plus a 1px ring was too faint).
// M101 (owner-approved home style): a lavender panel with pill fields and a pill button, no shadow.
const inputClass = 'w-full min-h-12 rounded-full border border-line-input bg-surface px-5 text-ink placeholder:text-muted focus:border-primary'

export function OrderLookup() {
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<LookupOrderActionResult | null>(null)
  const [turnstile, setTurnstile] = useState<TurnstileState>(initialTurnstileState)
  const turnstileRef = useRef<TurnstileHandle>(null)

  // Prefill from this tab's own last order (sessionStorage), in an effect to avoid a
  // hydration mismatch.
  useEffect(() => {
    const last = readLastOrder()
    if (last) {
      setOrderNumber(last.orderNumber)
      setPhone(last.delivery.phone)
    }
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setResult(null)
    try {
      setResult(
        await lookupOrderAction({
          orderNumber: orderNumber.trim(),
          phone: phone.trim(),
          turnstileToken: turnstile.token,
        }),
      )
    } catch {
      setResult({
        ok: false,
        code: 'SERVER_ERROR',
        message: 'We could not look up your order right now. Please try again.',
      })
    } finally {
      setPending(false)
      // Tokens are single-use; this page never navigates away, so always fetch a fresh one.
      turnstileRef.current?.reset()
    }
  }

  return (
    <div className="mx-4 my-8 min-h-[60vh] text-ink-2 sm:mx-6 sm:my-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-panel bg-surface-muted p-5 sm:p-8">
        <h1 className="text-3xl font-semibold leading-tight tracking-tighter text-ink sm:text-4xl">Check your order</h1>
        <p className="mt-2 text-muted">Enter your order number and the phone number you used when ordering.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Order number
            <input
              name="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="GC-XXXXXXXX-XXXXXXXX"
              aria-describedby="order-number-hint"
              className={`${inputClass} font-mono`}
              required
            />
            <span id="order-number-hint" className="text-xs font-normal text-muted">It starts with GC and is on your order confirmation.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Phone number
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              pattern="(0[0-9]{10}|\+923[0-9]{9})"
              title="Phone number you ordered with, e.g. 03001234567 or +923001234567"
              placeholder="03XXXXXXXXX"
              aria-describedby="phone-hint"
              className={inputClass}
              required
            />
            <span id="phone-hint" className="text-xs font-normal text-muted">The number you gave when you ordered.</span>
          </label>
          <TurnstileWidget ref={turnstileRef} action="order_lookup" onChange={setTurnstile} />
          <button
            type="submit"
            disabled={pending || turnstile.status !== 'verified'}
            className={buttonClasses({ size: 'lg' })}
          >
            {pending ? 'Checking...' : 'Check order'}
          </button>
        </form>
        </div>

        <div aria-live="polite" className="mt-6">
          {result && !result.ok && (
            <p className="rounded-tile bg-accent-soft px-5 py-4 text-sm text-ink">
              {result.message}
            </p>
          )}
          {result && result.ok && <OrderItem order={result.order} />}
        </div>
      </div>
    </div>
  )
}
