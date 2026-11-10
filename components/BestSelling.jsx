import Title from './Title'
import ProductCard from './ProductCard'
import { DEFAULT_CONTENT } from '@/lib/storefront-content'
import FeaturedTabs from './ui/FeaturedTabs'

// M23: server component fed by real Payload data. Its products are the ones an
// admin flagged `isFeatured` — not a computed ranking. There is no sales-count
// field and nothing aggregates Orders, and the dummy data's original basis
// (review count) is out of scope for v1 (ADR-016). See ADR-022.
//
// Renders nothing when no products are flagged, rather than an empty section
// with a heading and a "View more" link that would lead to an unrelated list.
// M45a: same grid as LatestProducts.
// M62: titled "Featured": the admin's `isFeatured` flag is a curated list, not a sales ranking, so
// "Best Selling" was never true (ADR-022 left the label as a copy decision; the owner chose "Featured").
// M68: category tabs. The page already fetched the featured products and the top-level categories, so the
// tabs cost no query: each product maps to its top-level category (its own category's parent when it is a
// child, else the category itself), and a tab exists only for a top-level category that has at least one
// featured product, so no tab is ever empty. Every card stays in the HTML; FeaturedTabs only hides them.
// M101: the description says what the section is, not a listing count.
// M102 (ADR-048): categories are flat, so each product's tab is simply its own category.
// M110: a plain grid of up to twelve products instead of a slider (4 columns on a wide screen = 3 rows, 3 on a
// tablet = 4 rows, 2 on a phone = 6 rows), with a "View all" link in the heading (the duplicate button under the grid was removed).
// M111: the grid uses the listing ProductCard (the same card and 2/3/4 grid as shop, category and wishlist).
// The heading, description and link words come from the admin's Storefront content.
// Two columns on a phone, four from `md`: the rows the home page fills (multiples of four) leave no gap.
const FEATURED_GRID = 'mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-6'

const BestSelling = ({ products = [], categories = [], content = DEFAULT_CONTENT }) => {

    if (products.length === 0) return null

    const topLevelOf = (product) => {
        const category = typeof product.category === 'object' && product.category ? product.category : null
        if (!category) return null
        return String(category.id)
    }

    // The home page passes complete rows (flagged products topped up with the newest, app/(public)/page.jsx),
    // so every product given is shown.
    const items = products.map((product) => ({
        key: product.id,
        categoryId: topLevelOf(product),
        node: <ProductCard product={product} />,
    }))
    const present = new Set(items.map((item) => item.categoryId).filter(Boolean))
    const tabs = categories
        .filter((category) => present.has(String(category.id)))
        .map((category) => ({ id: String(category.id), label: category.title }))

    return (
        <section className='mx-4 mt-16 sm:mx-6 lg:mt-24'>
            <div className='mx-auto max-w-7xl'>
                <Title title={content.featuredTitle} description={content.featuredDescription} href='/shop' linkLabel={content.featuredLinkLabel} />
                <FeaturedTabs tabs={tabs} items={items} gridClassName={FEATURED_GRID} />
            </div>
        </section>
    )
}

export default BestSelling
