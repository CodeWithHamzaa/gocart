'use client'

// M36: guest order lookup form (ADR-024). Calls only the lookupOrderAction server
// action — no REST fetch, and the order number/phone never appear in the URL.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { readLastOrder } from '@/lib/order-confirmation'
import { lookupOrderAction } from './actions'
import type { LookupOrderActionResult } from './actions'
import OrderItem from '@/components/OrderItem'

const inputClass = 'w-full min-h-11 rounded border border-slate-300 p-2 px-4 outline-none focus:border-slate-500'

export function OrderLookup() {
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<LookupOrderActionResult | null>(null)

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
      setResult(await lookupOrderAction({ orderNumber: orderNumber.trim(), phone: phone.trim() }))
    } catch {
      setResult({
        ok: false,
        code: 'SERVER_ERROR',
        message: 'We could not look up your order right now. Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-6 my-12 min-h-[60vh] text-slate-600">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-800 sm:text-3xl">Check your order</h1>
        <p className="mt-2">Enter your order number and the phone number you used when ordering.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
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
              className={`${inputClass} font-mono`}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Phone number
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              pattern="(0[0-9]{10}|\+923[0-9]{9})"
              title="Phone number you ordered with, e.g. 03001234567 or +923001234567"
              placeholder="03XXXXXXXXX"
              className={inputClass}
              required
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded bg-slate-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {pending ? 'Checking...' : 'Check order'}
          </button>
        </form>

        <div aria-live="polite" className="mt-6">
          {result && !result.ok && (
            <p className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {result.message}
            </p>
          )}
          {result && result.ok && <OrderItem order={result.order} />}
        </div>
      </div>
    </div>
  )
}
