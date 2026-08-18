'use client'
import { useEffect, useState } from "react"
import Link from "next/link"

// M27: data source only — swapped the hardcoded `categories` array from
// assets/assets.js for the real Categories collection.
//
// This component is nested inside Hero.jsx, which is 'use client' (Hero's
// own server-component conversion is M40's pass, not this one). A client
// component can't use lib/payload/categories.ts's Local API, so this fetches
// Payload's public-read REST API directly instead, per the sanctioned
// pattern documented in lib/payload/categories.ts.
//
// M27a: items are now real next/link anchors to /category/[slug] — a
// crawler can't follow a click handler, and neither can a keyboard user.
const CategoriesMarquee = () => {

    const [categories, setCategories] = useState([])

    useEffect(() => {
        const controller = new AbortController()

        fetch('/api/categories?limit=0&sort=displayOrder,title&depth=0', { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => setCategories(data.docs || []))
            .catch((error) => {
                if (error.name !== 'AbortError') console.error(error)
            })

        return () => controller.abort()
    }, [])

    if (categories.length === 0) return null

    const items = [...categories, ...categories, ...categories, ...categories]

    return (
        <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
            <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
            <div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4" >
                {items.map((category, index) => (
                    <Link key={`${category.id}-${index}`} href={`/category/${category.slug}`} className="px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300">
                        {category.title}
                    </Link>
                ))}
            </div>
            <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
    );
};

export default CategoriesMarquee;
