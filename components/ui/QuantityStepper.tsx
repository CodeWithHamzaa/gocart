// M61: the presentational quantity control. Counter.jsx keeps the Redux logic and passes the
// handlers in; both buttons are 44px and named for assistive tech.
export default function QuantityStepper({ value, onIncrease, onDecrease }: { value: number; onIncrease: () => void; onDecrease: () => void }) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-control bg-primary-soft text-primary-dark">
      <button type="button" aria-label="Decrease quantity" onClick={onDecrease} className="size-11 select-none rounded-control text-xl font-bold transition hover:bg-lavender">
        <span aria-hidden="true">&minus;</span>
      </button>
      <span className="min-w-8 text-center font-bold tabular-nums text-ink" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" onClick={onIncrease} className="size-11 select-none rounded-control text-xl font-bold transition hover:bg-lavender">
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
}
