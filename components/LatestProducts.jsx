import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'

// M23: server component fed by real Payload data. Sorting/limiting happens in
// the page's query (sort: '-createdAt'), not here — previously this pulled the
// whole dummy list out of Redux and sorted it client-side.
// M45a: a real grid (two columns on a phone, four on a desktop) instead of a wrapping row.
// M62: the redesign's grid: two columns on a phone, then as many 210px+ columns as fit.
// M101: "New arrivals", without the listing-page count ("Showing 5 of 24 products"). The home page passes
// the newest products that are not already in Featured.
const LatestProducts = ({ products = [] }) => {

    if (products.length === 0) return null

    return (
        <section className='mx-4 sm:mx-6 mt-12 sm:mt-14'>
            <div className='max-w-7xl mx-auto'>
                <Title title='New arrivals' description='The latest additions to the store' href='/shop' />
                <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4'>
                    {/* M101: four on a phone (two full rows), up to five from `sm`. */}
                    {products.map((product, index) => (
                        <div key={product.id} className={index >= 4 ? 'max-sm:hidden' : undefined}>
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default LatestProducts
