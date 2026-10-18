'use client'
import { Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";

// M45a: a sticky, translucent header (premium storefront look). Same links, search and cart as
// before: the mobile row keeps Shop, Search and Cart at 44px or more (M44, e2e/mobile.spec.ts).
const Navbar = () => {

    const router = useRouter();

    const [search, setSearch] = useState('')
    const [showMobileSearch, setShowMobileSearch] = useState(false)
    const cartCount = useSelector(state => state.cart.total)

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${encodeURIComponent(search.trim())}`)
        setShowMobileSearch(false)
    }

    return (
        <nav className="sticky top-0 z-40 border-b border-line/80 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
            <div className="mx-4 sm:mx-6">
                <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto py-3">

                    <Link href="/" className="relative inline-flex items-center min-h-11 pr-9 text-[1.7rem] sm:text-3xl font-bold tracking-tight text-ink">
                        gocart<span className="text-brand-600">.</span>
                        <span className="absolute top-0.5 right-0 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                            plus
                        </span>
                    </Link>

                    {/* Desktop search sits in the middle, as on the large storefronts. */}
                    <form onSubmit={handleSearch} role="search" className="hidden lg:flex flex-1 max-w-md items-center gap-2 rounded-full border border-line bg-canvas px-4 text-sm focus-within:border-brand-500 focus-within:bg-white transition">
                        <Search size={18} className="text-muted" aria-hidden="true" />
                        <input aria-label="Search products" className="w-full min-h-11 bg-transparent outline-none placeholder-muted" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                    </form>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-2 lg:gap-4 text-sm font-medium text-ink-soft">
                        <Link href="/" className="inline-flex items-center min-h-11 min-w-11 justify-center px-2 rounded-full hover:text-ink transition">Home</Link>
                        <Link href="/shop" className="inline-flex items-center min-h-11 min-w-11 justify-center px-2 rounded-full hover:text-ink transition">Shop</Link>
                        <Link href="/categories" className="inline-flex items-center min-h-11 px-2 rounded-full hover:text-ink transition">Categories</Link>

                        {/* Tablets: the inline search only fits from `lg`, so the toggle covers sm–lg. */}
                        <button aria-label="Search" aria-expanded={showMobileSearch} onClick={() => setShowMobileSearch((prev) => !prev)} className="lg:hidden inline-flex items-center justify-center size-11 rounded-full hover:text-ink transition">
                            <Search size={19} />
                        </button>

                        <Link href="/cart" className="relative inline-flex items-center gap-2 min-h-11 ml-1 rounded-full bg-ink pl-4 pr-5 text-white hover:bg-ink-soft transition">
                            <ShoppingBag size={17} aria-hidden="true" />
                            Cart
                            <span className="absolute -top-1 -right-1 text-[11px] leading-none text-white bg-brand-700 ring-2 ring-white size-[20px] rounded-full flex items-center justify-center">{cartCount}</span>
                        </Link>

                    </div>

                    {/* Mobile Menu — cart access was missing entirely below `sm` until this */}
                    {/* M44: every target is at least 44x44 (the guidance for touch). */}
                    <div className="flex sm:hidden items-center text-ink">
                        <Link href="/shop" className="inline-flex items-center justify-center min-h-11 px-2 text-sm font-medium">Shop</Link>

                        <button aria-label="Search" aria-expanded={showMobileSearch} onClick={() => setShowMobileSearch((prev) => !prev)} className="inline-flex items-center justify-center size-11 rounded-full">
                            <Search size={21} />
                        </button>

                        <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative inline-flex items-center justify-center size-11 rounded-full text-ink">
                            <ShoppingBag size={21} />
                            <span aria-hidden="true" className="absolute top-0.5 right-0 text-[10px] leading-none text-white bg-brand-700 ring-2 ring-white size-[18px] rounded-full flex items-center justify-center">{cartCount}</span>
                        </Link>
                    </div>
                </div>

                {showMobileSearch && (
                    <form onSubmit={handleSearch} role="search" className="lg:hidden flex items-center gap-2 rounded-full border border-line bg-canvas px-4 mb-3 text-sm">
                        <Search size={16} className="text-muted" aria-hidden="true" />
                        <input autoFocus aria-label="Search products" className="w-full min-h-11 bg-transparent outline-none placeholder-muted" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                    </form>
                )}
            </div>
        </nav>
    )
}

export default Navbar
