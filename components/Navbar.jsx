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
        router.push(`/shop?search=${search}`)
        setShowMobileSearch(false)
    }

    return (
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4  transition-all">

                    <Link href="/" className="relative text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">go</span>cart<span className="text-green-600 text-5xl leading-0">.</span>
                        <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                            plus
                        </p>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        <Link href="/">Home</Link>
                        <Link href="/shop">Shop</Link>
                        <Link href="/">About</Link>
                        <Link href="/">Contact</Link>

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
                            <Search size={18} className="text-slate-600" />
                            <input className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>

                        <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                            <ShoppingCart size={18} />
                            Cart
                            <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">{cartCount}</button>
                        </Link>

                    </div>

                    {/* Mobile Menu — cart access was missing entirely below `sm` until this */}
                    <div className="flex sm:hidden items-center gap-5 text-slate-600">
                        <Link href="/shop" className="text-sm">Shop</Link>

                        <button aria-label="Search" onClick={() => setShowMobileSearch((prev) => !prev)}>
                            <Search size={20} />
                        </button>

                        <Link href="/cart" className="relative flex items-center text-slate-600">
                            <ShoppingCart size={20} />
                            <span className="absolute -top-2 -right-2 text-[8px] text-white bg-slate-600 size-3.5 rounded-full flex items-center justify-center">{cartCount}</span>
                        </Link>
                    </div>
                </div>

                {showMobileSearch && (
                    <form onSubmit={handleSearch} className="sm:hidden flex items-center gap-2 bg-slate-100 px-4 py-2.5 rounded-full mb-4 text-sm">
                        <Search size={16} className="text-slate-600" />
                        <input autoFocus className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                    </form>
                )}
            </div>
            <hr className="border-gray-300" />
        </nav>
    )
}

export default Navbar
