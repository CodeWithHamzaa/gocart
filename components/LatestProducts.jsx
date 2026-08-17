import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'

// M23: server component fed by real Payload data. Sorting/limiting happens in
// the page's query (sort: '-createdAt'), not here — previously this pulled the
// whole dummy list out of Redux and sorted it client-side.
const LatestProducts = ({ products = [], total = 0 }) => {

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Latest Products' description={`Showing ${products.length} of ${total} products`} href='/shop' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default LatestProducts
