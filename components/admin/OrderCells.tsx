'use client'
// M96: the Orders list cells. The status and paid cells save straight to the order through
// Payload's own update endpoint, as the signed-in admin (so access rules still apply); the
// amount cell is display only.
import { useState } from 'react'

type CellProps = {
  cellData?: unknown
  rowData?: { id?: number | string }
}

const STATUSES: Array<[string, string]> = [
  ['PLACED', 'Order placed'],
  ['CONFIRMED', 'Confirmed'],
  ['PROCESSING', 'Processing'],
  ['SHIPPED', 'Shipped'],
  ['DELIVERED', 'Delivered'],
  ['CANCELLED', 'Cancelled'],
  ['RETURNED', 'Returned'],
]

async function patchOrder(id: number | string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export function StatusCell({ cellData, rowData }: CellProps) {
  const id = rowData?.id
  const [value, setValue] = useState(typeof cellData === 'string' ? cellData : 'PLACED')
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')

  if (id === undefined) return null

  async function change(next: string) {
    const previous = value
    setValue(next)
    setState('saving')
    const ok = await patchOrder(id as number | string, { status: next })
    if (ok) {
      setState('idle')
    } else {
      setValue(previous)
      setState('error')
    }
  }

  return (
    <span className="mirza-inline">
      <select
        className={`mirza-pill mirza-pill--select mirza-pill--${value.toLowerCase()}`}
        value={value}
        disabled={state === 'saving'}
        aria-label="Order status"
        onChange={(e) => change(e.target.value)}
      >
        {STATUSES.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      {state === 'error' && (
        <span role="alert" className="mirza-inline__error">
          Not saved
        </span>
      )}
    </span>
  )
}

export function PaidCell({ cellData, rowData }: CellProps) {
  const id = rowData?.id
  const [paid, setPaid] = useState(cellData === true)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')

  if (id === undefined) return null

  async function toggle() {
    const next = !paid
    setPaid(next)
    setState('saving')
    const ok = await patchOrder(id as number | string, { isPaid: next })
    if (ok) {
      setState('idle')
    } else {
      setPaid(!next)
      setState('error')
    }
  }

  return (
    <span className="mirza-inline">
      <button
        type="button"
        className={`mirza-pill mirza-pill--toggle ${paid ? 'mirza-pill--delivered' : 'mirza-pill--placed'}`}
        aria-pressed={paid}
        disabled={state === 'saving'}
        onClick={toggle}
      >
        {paid ? 'Paid' : 'Unpaid'}
      </button>
      {state === 'error' && (
        <span role="alert" className="mirza-inline__error">
          Not saved
        </span>
      )}
    </span>
  )
}
