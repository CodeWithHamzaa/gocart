import Title from './Title'
import ProductCard from './ProductCard'

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
const BestSelling = ({ products = [], total = 0 }) => {

    if (products.length === 0) return null

    return (
        <section className='mx-4 sm:mx-6 mt-12 sm:mt-14'>
            <div className='max-w-7xl mx-auto'>
                <Title title='Featured' description={`Showing ${products.length} of ${total} products`} href='/shop' />
                <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4'>
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default BestSelling
