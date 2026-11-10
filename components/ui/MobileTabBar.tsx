'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSelector } from 'react-redux'
import { HouseIcon, LayoutGridIcon, PackageIcon, ShoppingCartIcon, StoreIcon, type LucideIcon } from 'lucide-react'

// M61: the phone tab bar (below `lg`). Five tabs: Home, Categories, Shop, Cart and Orders. The header is not
// sticky, so Cart is here too: once a shopper scrolls, the bar is the only way to the cart, and it carries
// the same item count as the header (read from the same cart state, no new logic). Hidden on pages that
// have their own bottom action bar (product, cart) and on the order confirmation.
const TABS: Array<{ href: string; label: string; Icon: LucideIcon; match: (path: string) => boolean; cart?: boolean }> = [
  { href: '/', label: 'Home', Icon: HouseIcon, match: (path) => path === '/' },
  { href: '/categories', label: 'Categories', Icon: LayoutGridIcon, match: (path) => path === '/categories' || path.startsWith('/category/') },
  { href: '/shop', label: 'Shop', Icon: StoreIcon, match: (path) => path === '/shop' },
  { href: '/cart', label: 'Cart', Icon: ShoppingCartIcon, match: (path) => path === '/cart', cart: true },
  { href: '/orders', label: 'Orders', Icon: PackageIcon, match: (path) => path === '/orders' },
]

const ACTION_BAR_PAGES = ['/product/', '/cart']

export default function MobileTabBar() {
  const path = usePathname() ?? '/'
  const cartCount = useSelector((state: { cart: { total: number } }) => state.cart.total)
  const hasActionBar = ACTION_BAR_PAGES.some((prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
  const showTabs = !hasActionBar && !path.startsWith('/order-confirmation')

  return (
    <>
      {(showTabs || hasActionBar) && <div aria-hidden="true" className="h-24 lg:hidden" />}
      {showTabs && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-bar backdrop-blur lg:hidden">
          {TABS.map(({ href, label, Icon, match, cart }) => {
            const active = match(path)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={cart ? `Cart, ${cartCount} items` : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-tile text-xs ${active ? 'bg-accent-soft font-semibold text-primary-dark' : 'font-medium text-muted'}`}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" className={active ? 'fill-accent' : ''} />
                  {cart && cartCount > 0 && (
                    <span aria-hidden="true" className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold leading-none text-white">{cartCount}</span>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
