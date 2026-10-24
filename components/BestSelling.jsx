import Title from './Title'
import ProductCard from './ProductCard'
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
const BestSelling = ({ products = [], total = 0, categories = [] }) => {

    if (products.length === 0) return null

    const topLevelOf = (product) => {
        const category = typeof product.category === 'object' && product.category ? product.category : null
        if (!category) return null
        const parentId = category.parent && typeof category.parent === 'object' ? category.parent.id : category.parent
        return String(parentId ?? category.id)
    }

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
        <section className='mx-4 sm:mx-6 mt-12 sm:mt-14'>
            <div className='max-w-7xl mx-auto'>
                <Title title='Featured' description={`Showing ${products.length} of ${total} products`} href='/shop' />
                <FeaturedTabs
                    tabs={tabs}
                    items={items}
                    gridClassName='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4'
                />
            </div>
        </section>
    )
}

export default BestSelling
