import type { ReactNode } from 'react'

// M61: the fixed bottom bar below `lg` for the product page (M64) and the cart (M65). It replaces
// the tab bar on those pages. The page's own children are the actions; there is one set of them in
// the DOM, so the bar never duplicates a button. Safe-area padding keeps it clear of a phone's
// home indicator.
// M64: `inline` makes the same element a plain, unstyled block from `lg` (the product page's action
// group sits in the column there); without it the bar is hidden from `lg`.
export default function MobileActionBar({ children, label, inline = false }: { children: ReactNode; label: string; inline?: boolean }) {
  const desktop = inline ? 'lg:static lg:z-auto lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none' : 'lg:hidden'
  return (
    <div role="group" aria-label={label} className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-bar ${desktop}`}>
      {children}
    </div>
  )
}
