import Link from "next/link"

// M40: a server component. It used to be a client component that fetched the categories from
// the REST API after hydration (M27), which left the links out of the initial HTML where a
// crawler (and a slow connection) never sees them. The home page now passes the real
// categories in as props, so the links are plain server-rendered anchors (M27a: a crawler
// cannot follow a click handler). The scrolling is pure CSS.
const CategoriesMarquee = ({ categories = [] }) => {

    if (categories.length === 0) return null

    const items = [...categories, ...categories, ...categories, ...categories]

    return (
        <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
            <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
            <div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4" >
                {items.map((category, index) => (
                    <Link key={`${category.id}-${index}`} href={`/category/${category.slug}`} className="inline-flex items-center min-h-11 px-5 bg-slate-100 rounded-lg text-slate-600 text-xs sm:text-sm hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300">
                        {category.title}
                    </Link>
                ))}
            </div>
            <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
    );
};

export default CategoriesMarquee;
