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

const linkButton =
  'inline-flex items-center justify-center rounded px-6 py-2.5 text-sm font-medium transition active:scale-95'

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
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-12 w-full rounded bg-slate-200" />
          <div className="h-40 w-full rounded bg-slate-200" />
        </div>
      </div>
    )
  }

  if (state === 'missing' || !order) {
    return (
      <div className="mx-6 my-16 min-h-[60vh]">
        <div className="mx-auto max-w-2xl text-slate-600">
          <h1 className="text-2xl font-semibold text-slate-800 sm:text-3xl">
            We couldn&apos;t find a recent order in this browser
          </h1>
          <p className="mt-4">
            Order details are only kept in the tab where you placed the order. You can still
            check your order with your order number and phone number.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/orders" className={`${linkButton} bg-slate-800 text-white hover:bg-slate-900`}>
              Check order status
            </Link>
            <Link href="/shop" className={`${linkButton} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { delivery } = order

  return (
    <div className="mx-6 my-12 text-slate-600">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="shrink-0 text-green-600" size={32} aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-slate-800 sm:text-3xl">Order placed!</h1>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/30 p-5">
          <p className="text-xs text-slate-400">Your order number</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="break-all font-mono text-xl font-semibold text-slate-800 sm:text-2xl">
              {order.orderNumber}
            </p>
            <button
              type="button"
              onClick={copyOrderNumber}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100 active:scale-95"
            >
              Copy
            </button>
          </div>
          <p className="mt-4 text-sm">
            Pay in cash when your order is delivered. Keep this order number and your phone number
            to check your order status on the Orders page.
          </p>
        </div>

        <h2 className="mt-8 text-lg font-medium text-slate-700">Items</h2>
        <ul className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="break-words text-slate-700">
                  {item.name} <span className="text-slate-400">x {item.quantity}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {formatPKR(item.unitPrice)} each
                </p>
              </div>
              <p className="shrink-0 font-medium">
                {formatPKR(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">Subtotal</dt>
            <dd className="font-medium">
              {formatPKR(order.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Shipping</dt>
            <dd className="font-medium">
              {order.shippingCost === 0 ? 'Free' : formatPKR(order.shippingCost)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base text-slate-800">
            <dt>Total to pay on delivery</dt>
            <dd className="font-semibold">
              {formatPKR(order.orderTotal)}
            </dd>
          </div>
        </dl>

        <h2 className="mt-8 text-lg font-medium text-slate-700">Delivery details</h2>
        <div className="mt-2 space-y-1 text-sm">
          <p className="text-slate-700">{delivery.name}</p>
          <p>{delivery.phone}</p>
          <p>{delivery.address}</p>
          {delivery.area && <p>{delivery.area}</p>}
          <p>{delivery.city}</p>
        </div>

        <h2 className="mt-8 text-lg font-medium text-slate-700">Payment method</h2>
        <p className="mt-2 text-sm">Cash on Delivery (COD)</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop" className={`${linkButton} bg-slate-800 text-white hover:bg-slate-900`}>
            Continue shopping
          </Link>
          <Link href="/orders" className={`${linkButton} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
            Check order status
          </Link>
        </div>
      </div>
    </div>
  )
}
