'use client'
import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

// M68: category tabs for the home page's Featured section. Every card is rendered once, by the server,
// into the initial HTML (crawlers see all of them, ADR-007); a tab only toggles the `hidden` attribute
// on the cards outside its category, so no extra query or request is made. WAI-ARIA tabs: one tablist,
// roving tabindex, arrow keys plus Home/End, selection follows focus. With fewer than two tabs the
// section renders no tablist at all (a control that does nothing is not offered).
export type FeaturedTab = { id: string; label: string }
export type FeaturedItem = { key: string | number; categoryId: string | null; node: ReactNode }

const ALL = 'all'

export default function FeaturedTabs({ tabs, items, gridClassName }: { tabs: FeaturedTab[]; items: FeaturedItem[]; gridClassName: string }) {
  const [active, setActive] = useState(ALL)
  const uid = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const all: FeaturedTab[] = [{ id: ALL, label: 'All' }, ...tabs]

  const select = (id: string, focus = false) => {
    setActive(id)
    if (focus) refs.current[id]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = all.findIndex((tab) => tab.id === active)
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % all.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + all.length) % all.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = all.length - 1
    if (next === -1) return
    event.preventDefault()
    select(all[next].id, true)
  }

  const panelId = `${uid}-panel`

  return (
    <div>
      {tabs.length >= 2 && (
        <div
          role="tablist"
          aria-label="Filter featured products by category"
          onKeyDown={onKeyDown}
          className="no-scrollbar mt-4 flex max-w-full gap-1.5 self-start overflow-x-auto rounded-[14px] border border-line bg-white p-1"
        >
          {all.map((tab) => {
            const selected = tab.id === active
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  refs.current[tab.id] = node
                }}
                id={`${uid}-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.id)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-control px-4 text-sm font-semibold transition ${selected ? 'bg-primary text-white' : 'text-ink-2 hover:bg-primary-soft'}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}
      <div
        id={panelId}
        role={tabs.length >= 2 ? 'tabpanel' : undefined}
        aria-labelledby={tabs.length >= 2 ? `${uid}-tab-${active}` : undefined}
        tabIndex={tabs.length >= 2 ? 0 : undefined}
      >
        <ul className={gridClassName}>
          {items.map((item) => (
            <li key={item.key} hidden={active !== ALL && item.categoryId !== active} className="min-w-0">
              {item.node}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
