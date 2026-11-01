import Title from './Title'
import RailCard from './RailCard'
import { RAIL_ROW } from './ProductRail'
import FeaturedTabs from './ui/FeaturedTabs'
import ScrollRail from './ui/ScrollRail'

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
const BestSelling = ({ products = [], categories = [] }) => {

    if (products.length === 0) return null

    const topLevelOf = (product) => {
        const category = typeof product.category === 'object' && product.category ? product.category : null
        if (!category) return null
        return String(category.id)
    }

    const items = products.map((product) => ({
        key: product.id,
        categoryId: topLevelOf(product),
        node: <RailCard product={product} />,
    }))
    const present = new Set(items.map((item) => item.categoryId).filter(Boolean))
    const tabs = categories
        .filter((category) => present.has(String(category.id)))
        .map((category) => ({ id: String(category.id), label: category.title }))

    // M101: the large home cards in a swipeable row; the category tabs (M68) still filter it.
    return (
        <section className='mx-4 mt-16 sm:mx-6 sm:mt-24'>
            <div className='mx-auto max-w-7xl'>
                <Title title='Featured' description='Picked by the store, across every category.' href='/shop' />
                <ScrollRail label='Featured'>
                    <FeaturedTabs tabs={tabs} items={items} gridClassName={`${RAIL_ROW} mt-6`} />
                </ScrollRail>
            </div>
        </section>
    )
}

export default BestSelling
