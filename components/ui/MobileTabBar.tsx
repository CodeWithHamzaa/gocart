'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HouseIcon, LayoutGridIcon, PackageIcon, StoreIcon, type LucideIcon } from 'lucide-react'

// M61: the fixed bottom tab bar below `lg`. Four real destinations: Home, Categories, Products
// (/shop) and Orders (the guest lookup, ADR-024). There is deliberately no Cart, Shop or Search
// here: the header owns those, and e2e/mobile.spec.ts expects exactly one of each. The product page
// and the cart have their own bottom action bar, so the tab bar steps aside there, and a spacer
// keeps the end of the page clear of whichever bar is showing.
const TABS: Array<{ href: string; label: string; Icon: LucideIcon; match: (path: string) => boolean }> = [
  { href: '/', label: 'Home', Icon: HouseIcon, match: (path) => path === '/' },
  { href: '/categories', label: 'Categories', Icon: LayoutGridIcon, match: (path) => path === '/categories' || path.startsWith('/category/') },
  { href: '/shop', label: 'Products', Icon: StoreIcon, match: (path) => path === '/shop' },
  { href: '/orders', label: 'Orders', Icon: PackageIcon, match: (path) => path === '/orders' },
]

const ACTION_BAR_PAGES = ['/product/', '/cart']

export default function MobileTabBar() {
  const path = usePathname() ?? '/'
  const hasActionBar = ACTION_BAR_PAGES.some((prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
  const showTabs = !hasActionBar && !path.startsWith('/order-confirmation')

  return (
    <>
      {(showTabs || hasActionBar) && <div aria-hidden="true" className="h-24 lg:hidden" />}
      {showTabs && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-bar lg:hidden">
          {TABS.map(({ href, label, Icon, match }) => {
            const active = match(path)
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-control text-[11px] ${active ? 'font-bold text-primary' : 'font-medium text-muted'}`}>
                <Icon size={22} strokeWidth={1.8} aria-hidden="true" className={active ? 'fill-primary-soft' : ''} />
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
