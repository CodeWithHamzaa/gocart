'use client'
import { SearchIcon, ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";

// M61: the redesign's header. One row on a desktop (store name, search, Shop, Cart) and two on a
// phone (store name, Shop and Cart above a full-width search). The control set is what e2e/mobile.spec.ts
// expects at 320px: a visible Shop link, a "Search" button and a link named "Cart, N items", each at
// least 44px. The Search button is type="button" and asks the form to submit: the header is on every
// page, and /orders' e2e expects its own form to hold the only type=submit button. Enter in the field
// submits as before. The category row (CategoryNav, a server component) arrives as `children`.
// Left out on purpose: Sign in (admin-only auth, no customer accounts), the wishlist, notification
// bell and menu button (none of them has a destination in this store).
const Navbar = ({ storeName = 'GoCart', children }) => {

    const router = useRouter();

    const formRef = useRef(null)
    const [search, setSearch] = useState('')
    const cartCount = useSelector(state => state.cart.total)

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${encodeURIComponent(search.trim())}`)
    }

    return (
        <header className="border-b border-line bg-white">
            <nav aria-label="Primary" className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:gap-x-8 lg:py-4">

                <Link href="/" className="flex min-h-11 min-w-0 flex-1 items-center text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-[26px] lg:flex-none">
                    <span className="truncate">{storeName}</span><span className="text-primary" aria-hidden="true">.</span>
                </Link>

                <form ref={formRef} onSubmit={handleSearch} role="search" className="order-last flex h-[50px] w-full items-center gap-2.5 rounded-field border border-line-2 bg-white pl-3.5 pr-1 text-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary lg:order-none lg:w-auto lg:flex-1">
                    <SearchIcon size={20} className="shrink-0 text-muted" aria-hidden="true" />
                    <input aria-label="Search products" className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted" type="text" enterKeyHint="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                    <button type="button" onClick={() => formRef.current?.requestSubmit()} aria-label="Search" className="flex h-11 min-w-11 items-center justify-center rounded-control bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark sm:px-5">
                        <SearchIcon size={18} className="sm:hidden" aria-hidden="true" />
                        <span className="hidden sm:inline">Search</span>
                    </button>
                </form>

                <Link href="/shop" className="flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-semibold text-ink hover:text-primary">Shop</Link>

                <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative flex size-11 items-center justify-center rounded-control text-ink hover:text-primary">
                    <ShoppingCartIcon size={22} strokeWidth={1.8} aria-hidden="true" />
                    {cartCount > 0 && (
                        <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white">{cartCount}</span>
                    )}
                </Link>
            </nav>
            {children}
        </header>
    )
}

export default Navbar
