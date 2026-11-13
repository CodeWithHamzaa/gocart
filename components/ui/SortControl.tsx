import { buttonClasses } from '@/components/ui/Button'
import { SORTS, SORT_LABELS, type CategorySort } from '@/lib/category-filters'

// Milestone 119: the sort choice for the shop listing, with the category page's four options. A plain
// GET form, so it works without JavaScript and every result is a shareable address. `keep` carries
// the search words through, so sorting never drops the search. The category page has its own
// sort-and-filter panel (CategoryControls); the shop has no price or discount filter yet.
const field = 'min-h-11 rounded-full border border-line-input bg-surface px-4 text-sm font-semibold text-ink'

export default function SortControl({ action, sort, keep = {} }: { action: string; sort: CategorySort; keep?: Record<string, string> }) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-center gap-2">
      {Object.entries(keep).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="shop-sort" className="text-sm font-semibold text-ink">Sort by</label>
      <select id="shop-sort" name="sort" defaultValue={sort} className={field}>
        {SORTS.map((s) => (
          <option key={s} value={s}>{SORT_LABELS[s]}</option>
        ))}
      </select>
      <button type="submit" className={buttonClasses({ variant: 'outline' })}>Apply</button>
    </form>
  )
}
