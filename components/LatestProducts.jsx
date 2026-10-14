import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'

// M23: server component fed by real Payload data. Sorting/limiting happens in
// the page's query (sort: '-createdAt'), not here — previously this pulled the
// whole dummy list out of Redux and sorted it client-side.
// M45a: a real grid (two columns on a phone, four on a desktop) instead of a wrapping row.
const LatestProducts = ({ products = [], total = 0 }) => {

    return (
        <section className='mx-4 sm:mx-6 mt-14 sm:mt-20'>
            <div className='max-w-7xl mx-auto'>
                <Title title='Latest Products' description={`Showing ${products.length} of ${total} products`} href='/shop' />
                <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4'>
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default LatestProducts
