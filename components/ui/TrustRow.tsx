import type { ReactNode } from 'react'

// M61: the value-prop strip (delivery, COD, guest checkout, order tracking). The caller passes
// only statements that are true for this store (ADR-004/005/024); there is no default content.
export type TrustItem = { icon: ReactNode; title: string; text: string; tint?: string }

export default function TrustRow({ items }: { items: TrustItem[] }) {
  if (items.length === 0) return null
  return (
    <ul className="grid grid-cols-1 gap-2 rounded-card bg-white p-5 shadow-card ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.title} className="flex items-center gap-3.5 p-2">
          <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-full ${item.tint ?? 'bg-primary-soft text-primary'}`} aria-hidden="true">{item.icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">{item.title}</span>
            <span className="block text-[13px] text-muted">{item.text}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
