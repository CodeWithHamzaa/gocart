import { Trash2Icon } from 'lucide-react'

// M60: the pill quantity stepper (cart lines and the product page). Each button names its product, so a
// cart with several lines reads unambiguously. At quantity 1 the minus becomes a bin labelled "Remove":
// pressing it already removed the line (cartSlice deletes a line that reaches 0), so it now says so.
export default function QuantityStepper({ value, name = '', onIncrease, onDecrease }: { value: number; name?: string; onIncrease: () => void; onDecrease: () => void }) {
  const of = name ? ` of ${name}` : ''
  const last = value <= 1
  return (
    <div className="inline-flex shrink-0 items-center rounded-full border border-line-2 bg-surface text-primary-dark">
      <button type="button" aria-label={last ? `Remove ${name || 'item'}` : `Decrease quantity${of}`} onClick={onDecrease} className="flex size-11 select-none items-center justify-center rounded-full text-xl font-semibold transition hover:bg-accent-soft">
        {last ? <Trash2Icon size={17} aria-hidden="true" /> : <span aria-hidden="true">&minus;</span>}
      </button>
      <span className="min-w-8 text-center font-bold tabular-nums text-ink" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Increase quantity${of}`} onClick={onIncrease} className="flex size-11 select-none items-center justify-center rounded-full text-xl font-semibold transition hover:bg-accent-soft">
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
}
