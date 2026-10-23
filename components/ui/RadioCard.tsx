import type { ReactNode } from 'react'

// M61: a selectable card for delivery and payment (M65). It wraps a real radio input so keyboard
// and screen-reader behaviour is the browser's own; the store has one option for each today, so
// it renders checked and read-only.
export default function RadioCard({ name, value, checked, title, description, trailing }: { name: string; value: string; checked: boolean; title: string; description?: string; trailing?: ReactNode }) {
  return (
    <label className="flex cursor-default items-center gap-3 rounded-tile border border-line-3 bg-lavender-tile p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
      <input type="radio" name={name} value={value} checked={checked} readOnly className="size-5 shrink-0 accent-primary" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
      {trailing && <span className="shrink-0 text-sm font-bold text-ink">{trailing}</span>}
    </label>
  )
}
