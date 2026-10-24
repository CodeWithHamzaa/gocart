import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'

// M23: server component fed by real Payload data. Sorting/limiting happens in
// the page's query (sort: '-createdAt'), not here — previously this pulled the
// whole dummy list out of Redux and sorted it client-side.
// M45a: a real grid (two columns on a phone, four on a desktop) instead of a wrapping row.
// M62: the redesign's grid: two columns on a phone, then as many 210px+ columns as fit.
const LatestProducts = ({ products = [], total = 0 }) => {

    return (
        <section className='mx-4 sm:mx-6 mt-12 sm:mt-14'>
            <div className='max-w-7xl mx-auto'>
                <Title title='Latest products' description={`Showing ${products.length} of ${total} products`} href='/shop' />
                <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4'>
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default LatestProducts
