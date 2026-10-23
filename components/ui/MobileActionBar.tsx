import type { ReactNode } from 'react'

// M61: the fixed bottom bar below `lg` for the product page (M64) and the cart (M65). It replaces
// the tab bar on those pages. The page's own children are the actions; there is one set of them in
// the DOM, so the bar never duplicates a button. Safe-area padding keeps it clear of a phone's
// home indicator.
export default function MobileActionBar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-bar lg:hidden">
      {children}
    </div>
  )
}
