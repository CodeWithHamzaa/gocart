'use client'

// M35: renders the last placed order from sessionStorage (ADR-027). Read in an effect,
// not during render, to avoid a hydration mismatch. No network calls for order data.
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { readLastOrder } from '@/lib/order-confirmation'
import type { LastOrder } from '@/lib/order-confirmation'
import { formatPKR } from '@/lib/currency'
import { buttonClasses } from '@/components/ui/Button'

// M66: the redesign's buttons (design: "Order placed"). The order number is never upper-cased by CSS:
// e2e reads it back from the page text. M101: pill buttons and a lavender order-number card.
// M115: the shared Button look (components/ui/Button.tsx).
// Milestone 120: the order number is the page's main fact, so it is larger and sits with one plain line that
// says what to do with it. It stays alone in its own element, as plain text. "Track order" opens the Orders
// page, which fills in this tab's last order number and phone by itself (OrderLookup reads the same saved order).
const primaryButton = buttonClasses({ size: 'lg' })
const secondaryButton = buttonClasses({ variant: 'soft', size: 'lg' })

export function OrderConfirmation() {
  const [state, setState] = useState<'loading' | 'found' | 'missing'>('loading')
  const [order, setOrder] = useState<LastOrder | null>(null)

  useEffect(() => {
    const found = readLastOrder()
    setOrder(found)
    setState(found ? 'found' : 'missing')
  }, [])

  const copyOrderNumber = async () => {
    if (!order) return
    try {
      await navigator.clipboard.writeText(order.orderNumber)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy. Please copy the number manually.')
    }
  }

  if (state === 'loading') {
    return (
      <div className="mx-6 my-16 min-h-[60vh]" aria-busy="true">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-9 w-56 rounded-full bg-surface-muted" />
          <div className="h-12 w-full rounded-full bg-surface-muted" />
          <div className="h-40 w-full rounded-card bg-surface-muted" />
        </div>
      </div>
    )
  }

  if (state === 'missing' || !order) {
    return (
      <div className="mx-6 my-16 min-h-[60vh]">
        <div className="mx-auto max-w-2xl text-muted">
          <h1 className="text-3xl font-semibold leading-tight tracking-tighter text-ink sm:text-4xl">
            We couldn&apos;t find a recent order in this browser
          </h1>
          <p className="mt-4">
            Order details are only kept in the tab where you placed the order. You can still
            check your order with your order number and phone number.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/orders" className={primaryButton}>
              Track order
            </Link>
            <Link href="/shop" className={secondaryButton}>
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { delivery } = order

  return (
    <div className="mx-4 my-8 text-ink-2 sm:mx-6 sm:my-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={36} aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tighter text-ink sm:text-4xl">Order placed!</h1>
          <p className="max-w-md text-sm text-muted">
            Pay in cash when your order is delivered.
          </p>
        </div>

        <div className="mt-6 rounded-card bg-surface-muted p-5 sm:p-6">
          <p className="text-xs font-semibold text-muted">Your order number</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="break-all font-mono text-2xl font-semibold text-ink sm:text-3xl">
              {order.orderNumber}
            </p>
            <button
              type="button"
              onClick={copyOrderNumber}
              className="inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-sm font-semibold text-primary-dark transition hover:bg-accent-soft active:scale-95"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-sm text-ink-2">Keep this number. With your phone number, it is how you track your order.</p>
          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line-2 pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Total to pay</dt>
              <dd className="font-semibold text-ink">{formatPKR(order.orderTotal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Payment</dt>
              <dd className="font-semibold text-ink">Cash on Delivery (COD)</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Delivery</dt>
              <dd className="font-semibold text-ink">{order.shippingCost === 0 ? 'Free' : formatPKR(order.shippingCost)}</dd>
            </div>
          </dl>
        </div>

        <h2 className="mt-8 text-xl font-semibold tracking-tight text-ink">Items</h2>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="break-words font-semibold text-ink">
                  {item.name} <span className="font-normal text-muted">x {item.quantity}</span>
                </p>
                <p className="text-xs text-muted">
                  {formatPKR(item.unitPrice)} each
                </p>
              </div>
              <p className="shrink-0 font-semibold text-ink">
                {formatPKR(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-semibold text-ink">
              {formatPKR(order.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd className="font-semibold text-ink">
              {order.shippingCost === 0 ? 'Free' : formatPKR(order.shippingCost)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base text-ink">
            <dt>Total to pay on delivery</dt>
            <dd className="font-semibold">
              {formatPKR(order.orderTotal)}
            </dd>
          </div>
        </dl>

        <h2 className="mt-8 text-xl font-semibold tracking-tight text-ink">Delivery details</h2>
        <div className="mt-2 space-y-1 text-sm">
          <p className="font-semibold text-ink">{delivery.name}</p>
          <p>{delivery.phone}</p>
          <p>{delivery.address}</p>
          {delivery.area && <p>{delivery.area}</p>}
          <p>{delivery.city}</p>
        </div>

        <h2 className="mt-8 text-xl font-semibold tracking-tight text-ink">Payment method</h2>
        <p className="mt-2 text-sm">Cash on Delivery (COD)</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/orders" className={primaryButton}>
            Track order
          </Link>
          <Link href="/shop" className={secondaryButton}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
