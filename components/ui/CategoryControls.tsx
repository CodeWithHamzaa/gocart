import Link from 'next/link'
import { DISCOUNT_STEPS, SORTS, SORT_LABELS, hasActiveFilters, isRefined, type CategoryFilters } from '@/lib/category-filters'

// M92: sort and filter for a category listing (design: Category / CategoryMobile). A plain GET
// form, so it works without JavaScript and every result is a shareable URL. It is a native
// <details> panel on every width, open when something is applied. Only fields the catalogue really
// has are offered: price and discount (price against MRP). The design's size, colour and delivery
// filters have no data behind them (docs/CATEGORY_REQUIREMENTS.md), so they are not built.
// M101: the home page's look: a lavender panel with white pill fields and pill buttons, no ring.
const field = 'min-h-11 w-full rounded-full border border-line-input bg-surface px-4 text-ink'

// From `lg` the panel is an always-open toolbar (the closed <details> content is made visible with
// ::details-content, and the summary stops toggling); browsers without ::details-content keep the
// collapsible panel. Below `lg` it stays collapsible so it does not push the products down.
export default function CategoryControls({ basePath, filters }: { basePath: string; filters: CategoryFilters }) {
  const active = isRefined(filters)
  return (
    <details open={active} className="group rounded-card border border-line bg-surface lg:[&::details-content]:[content-visibility:visible] lg:[&::details-content]:block">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-semibold text-ink lg:pointer-events-none lg:cursor-default [&::-webkit-details-marker]:hidden">
        <span>Sort &amp; filter{active ? ' (applied)' : ''}</span>
        <span aria-hidden="true" className="text-lg text-primary group-open:hidden lg:hidden">+</span>
        <span aria-hidden="true" className="hidden text-lg text-primary group-open:inline lg:!hidden">&minus;</span>
      </summary>
      <form method="get" action={basePath} className="flex flex-col gap-4 border-t border-line p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Sort by
            <select name="sort" defaultValue={filters.sort} className={field}>
              {SORTS.map((s) => (
                <option key={s} value={s}>{SORT_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <legend className="mb-1.5 text-sm font-semibold text-ink">Price (Rs.)</legend>
            <div className="flex items-center gap-2">
              <input name="min" type="number" inputMode="numeric" min={0} step={1} defaultValue={filters.minPrice} placeholder="Min" aria-label="Minimum price" className={field} />
              <span aria-hidden="true" className="text-muted">&ndash;</span>
              <input name="max" type="number" inputMode="numeric" min={0} step={1} defaultValue={filters.maxPrice} placeholder="Max" aria-label="Maximum price" className={field} />
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold text-ink">Discount</legend>
            <div className="flex flex-wrap gap-2">
              {[undefined, ...DISCOUNT_STEPS].map((step) => (
                <label key={step ?? 'any'} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-input bg-surface px-4 text-sm font-semibold text-ink-2 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
                  <input type="radio" name="off" value={step ?? ''} defaultChecked={filters.minDiscount === step} className="sr-only" />
                  {step ? `${step}% and above` : 'Any'}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-dark active:scale-95">Apply</button>
          {(active || hasActiveFilters(filters)) && (
            <Link href={basePath} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-primary-dark">Clear all</Link>
          )}
        </div>
      </form>
    </details>
  )
}
