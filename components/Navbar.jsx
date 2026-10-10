'use client'
import { Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";

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
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4  transition-all">

                    <Link href="/" className="relative inline-flex items-center min-h-11 text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">go</span>cart<span className="text-green-600 text-5xl leading-0">.</span>
                        <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-700">
                            plus
                        </p>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        <Link href="/" className="inline-flex items-center min-h-11 min-w-11 justify-center">Home</Link>
                        <Link href="/shop" className="inline-flex items-center min-h-11 min-w-11 justify-center">Shop</Link>
                        <Link href="/categories" className="inline-flex items-center min-h-11">Categories</Link>

                        <form onSubmit={handleSearch} role="search" className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 rounded-full">
                            <Search size={18} className="text-slate-600" />
                            <input aria-label="Search products" className="w-full min-h-11 bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>

                        <Link href="/cart" className="relative inline-flex items-center gap-2 min-h-11 text-slate-600">
                            <ShoppingCart size={18} />
                            Cart
                            <span className="absolute top-0.5 left-3 text-[11px] leading-none text-white bg-slate-700 size-[18px] rounded-full flex items-center justify-center">{cartCount}</span>
                        </Link>

                    </div>

                    {/* Mobile Menu — cart access was missing entirely below `sm` until this */}
                    {/* M44: every target is at least 44x44 (the guidance for touch). */}
                    <div className="flex sm:hidden items-center text-slate-600">
                        <Link href="/shop" className="inline-flex items-center justify-center min-h-11 px-3 text-sm">Shop</Link>

                        <button aria-label="Search" aria-expanded={showMobileSearch} onClick={() => setShowMobileSearch((prev) => !prev)} className="inline-flex items-center justify-center size-11">
                            <Search size={20} />
                        </button>

                        <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative inline-flex items-center justify-center size-11 text-slate-600">
                            <ShoppingCart size={20} />
                            <span aria-hidden="true" className="absolute top-1 right-0 text-[11px] leading-none text-white bg-slate-700 size-[18px] rounded-full flex items-center justify-center">{cartCount}</span>
                        </Link>
                    </div>
                </div>

                {showMobileSearch && (
                    <form onSubmit={handleSearch} role="search" className="sm:hidden flex items-center gap-2 bg-slate-100 px-4 rounded-full mb-4 text-sm">
                        <Search size={16} className="text-slate-600" />
                        <input autoFocus aria-label="Search products" className="w-full min-h-11 bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                    </form>
                )}
            </div>
            <hr className="border-gray-300" />
        </nav>
    )
}

export default Navbar
