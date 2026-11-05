import Image from 'next/image'
import Link from 'next/link'
import { formatPKR } from '@/lib/currency'
import Badge from './ui/Badge'
import QuickAddButton from './ui/QuickAddButton'
import WishlistButton from './ui/WishlistButton'
import { discountPercent, statusBadge } from '@/lib/product-badges'
import type { Product } from '@/lib/payload/products'

// M101: the home page's large product card (the owner chose the "V3" mockup's card size): a light-grey
// panel with the category, the name as a heading-sized line, the price, and the photo at the bottom.
// Same rules as ProductCard: ONE link to the product (stretched over the card; e2e finds a product by
// that link), the heart and quick-add are siblings above it, badges come from lib/product-badges.ts, and
// the discount is computed, never invented. Fixed width so a rail shows whole cards; the rail scrolls.
// M110: `fluid` makes the card fill its grid cell instead of the fixed rail width (the Featured grid).
export default function RailCard({ product, priority = false, fluid = false }: { product: Product; priority?: boolean; fluid?: boolean }) {
  const first = product.images?.[0]
  const imageUrl = typeof first === 'string' ? first : first && typeof first === 'object' ? first.url : null
  const alt = first && typeof first === 'object' ? (first.alt ?? '') : ''
  const discount = discountPercent(product.mrp, product.price)
  const status = statusBadge(product)
  const outOfStock = product.inStock !== true
  const category = product.category && typeof product.category === 'object' ? product.category.title : null

  return (
    <article className={`group relative flex h-full flex-col rounded-card bg-lavender p-4 sm:p-6 ${fluid ? 'w-full min-w-0' : 'w-[248px] shrink-0 p-5 sm:w-[300px]'}`}>
      <WishlistButton productId={product.id} name={product.name} className="absolute right-2 top-2 z-10" />
      {category && <p className="pr-10 text-[13px] text-muted">{category}</p>}
      <Link
        href={`/product/${product.id}`}
        className="mt-1 pr-6 text-lg font-semibold leading-snug tracking-[-0.02em] text-ink outline-none [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-card group-hover:underline group-hover:underline-offset-4 focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary sm:text-[21px]"
      >
        {product.name}
      </Link>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[15px]">
        <span className="whitespace-nowrap font-semibold text-ink">{formatPKR(product.price)}</span>
        {discount > 0 && (
          <>
            <s className="whitespace-nowrap text-[13px] text-strike"><span className="sr-only">Was </span>{formatPKR(product.mrp)}</s>
            <Badge tone="off" className="self-center">{discount}% off</Badge>
          </>
        )}
      </p>
      <div className="relative mt-auto pt-5">
        <span className="block aspect-square overflow-hidden rounded-tile bg-white">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={alt}
              width={600}
              height={600}
              sizes={fluid ? '(min-width: 1280px) 260px, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 44vw' : '(min-width: 640px) 252px, 208px'}
              priority={priority}
              className={`size-full object-cover transition duration-500 group-hover:scale-[1.03] ${outOfStock ? 'opacity-60 grayscale' : ''}`}
            />
          )}
        </span>
        {status && <Badge tone={status.tone} className="absolute left-3 top-8">{status.text}</Badge>}
        <QuickAddButton productId={product.id} name={product.name} disabled={outOfStock} className="absolute bottom-3 right-3 z-10" />
      </div>
    </article>
  )
}
