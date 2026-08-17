import Title from './Title'
import ProductCard from './ProductCard'

// M23: server component fed by real Payload data. Its products are the ones an
// admin flagged `isFeatured` — not a computed ranking. There is no sales-count
// field and nothing aggregates Orders, and the dummy data's original basis
// (review count) is out of scope for v1 (ADR-016). See ADR-022.
//
// Renders nothing when no products are flagged, rather than an empty section
// with a heading and a "View more" link that would lead to an unrelated list.
const BestSelling = ({ products = [], total = 0 }) => {

    if (products.length === 0) return null

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Best Selling' description={`Showing ${products.length} of ${total} products`} href='/shop' />
            <div className='mt-12  grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default BestSelling
