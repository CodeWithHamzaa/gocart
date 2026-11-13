'use client'
import { HeartIcon, PackageSearchIcon, SearchIcon, ShoppingCartIcon, XIcon } from "lucide-react";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

// M61: the redesign's header. One row on a desktop (store name, search, Shop, Cart) and two on a
// phone (store name, Shop and Cart above a full-width search). The control set is what e2e/mobile.spec.ts
// expects at 320px: a visible Shop link, a "Search" button and a link named "Cart, N items", each at
// least 44px. The Search button is type="button" and asks the form to submit: the header is on every
// page, and /orders' e2e expects its own form to hold the only type=submit button. Enter in the field
// submits as before.
// M91: the wishlist heart (browser-only, ADR-041) sits before the cart.
// M101: the search field and its button are pills, like every other action in the owner-approved style.
// Milestone 122: the search field follows what current storefronts and product sites share: one calm white pill
// with a hairline, the magnifier as the (44px) submit button at the start, no coloured block, a soft violet
// glow on focus, a clear button once something is typed, and on a desktop a "/" key hint (the key focuses
// the field). It is centred between the logo and the actions on a desktop and full width below them on a phone.
// "Track order" moved here from the announcement strip, as a labelled soft button from `lg` (below that the
// tab bar's Orders tab is always on screen); an admin can still hide it (Storefront content). The category
// row under the header was removed: the home page's category circles and the Categories tab do that job.
// Left out on purpose: Sign in (admin-only auth, no customer accounts), notification
// bell and menu button (none of them has a destination in this store).
const Navbar = ({ storeName = 'Mirza Cart', showTrackOrder = true }) => {

    const router = useRouter();

    const formRef = useRef(null)
    const inputRef = useRef(null)
    const [search, setSearch] = useState('')
    const cartCount = useSelector(state => state.cart.total)
    const wishCount = useSelector(state => state.wishlist.ids.length)

    // "/" moves the keyboard to the search field from anywhere that is not already a text field.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
            const el = e.target
            if (el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
            e.preventDefault()
            inputRef.current?.focus()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${encodeURIComponent(search.trim())}`)
    }

    // M98: 83rem = the pages' max-w-7xl (80rem) plus this bar's own 1.5rem side padding, so the logo
    // lines up with the page content below it (the bar, footer and category row use the same width).
    return (
        <header className="border-b border-line bg-surface">
            <nav aria-label="Primary" className="mx-auto flex max-w-[83rem] flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 sm:px-6 lg:gap-x-3 lg:py-4">

                <Link href="/" className="flex min-h-11 min-w-0 flex-1 items-center text-[1.375rem] tracking-tighter text-ink lg:mr-6 lg:flex-none">
                    <BrandLogo name={storeName} />
                </Link>

                <form ref={formRef} onSubmit={handleSearch} role="search" className="group order-last flex h-12 w-full items-center rounded-full border border-line-2 bg-surface pr-1.5 transition hover:border-line-3 focus-within:border-primary focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_16%,transparent)] hover:focus-within:border-primary lg:order-none lg:mx-auto lg:w-auto lg:max-w-xl lg:flex-1">
                    <button type="button" onClick={() => formRef.current?.requestSubmit()} aria-label="Search" className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-primary group-focus-within:text-primary">
                        <SearchIcon size={20} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <input ref={inputRef} aria-label="Search products" className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted" type="text" enterKeyHint="search" placeholder="Search for products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                    {search ? (
                        <button type="button" onClick={() => { setSearch(''); inputRef.current?.focus() }} aria-label="Clear search" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-ink">
                            <XIcon size={16} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    ) : (
                        <kbd aria-hidden="true" className="mr-2 hidden h-6 min-w-6 items-center justify-center rounded-md border border-line-2 bg-surface-muted px-1.5 font-sans text-xs font-semibold text-muted group-focus-within:hidden lg:flex">/</kbd>
                    )}
                </form>

                <Link href="/shop" className="flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface-muted">Shop</Link>

                {showTrackOrder && (
                    <Link href="/orders" className="hidden min-h-11 items-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-semibold text-primary-dark transition hover:bg-accent lg:flex">
                        <PackageSearchIcon size={18} strokeWidth={2} aria-hidden="true" />
                        Track order
                    </Link>
                )}

                <Link href="/wishlist" aria-label={`Wishlist, ${wishCount} items`} className="relative flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface-muted">
                    <HeartIcon size={22} strokeWidth={1.8} aria-hidden="true" />
                    {wishCount > 0 && (
                        <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold leading-none text-on-primary">{wishCount}</span>
                    )}
                </Link>

                <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface-muted">
                    <ShoppingCartIcon size={22} strokeWidth={1.8} aria-hidden="true" />
                    {cartCount > 0 && (
                        <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold leading-none text-white">{cartCount}</span>
                    )}
                </Link>
            </nav>
        </header>
    )
}

export default Navbar
