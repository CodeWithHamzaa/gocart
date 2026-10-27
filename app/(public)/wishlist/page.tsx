'use client'
import { useEffect, useState } from 'react'
import { HeartIcon } from 'lucide-react'
import { useSelector } from 'react-redux'
import ProductCard from '@/components/ProductCard'
import EmptyState from '@/components/ui/EmptyState'

// M91 (ADR-041): the browser-only wishlist. The saved ids come from Redux (hydrated from
// localStorage by StoreProvider); the products are read through Payload's public REST API, as the
// cart does (client components never import lib/payload). A saved product that no longer exists is
// simply not returned. Un-saving a heart removes its card at once.
type WishProduct = { id: number | string } & Record<string, unknown>

export default function WishlistPage() {
  const ids = useSelector((state: { wishlist: { ids: string[] } }) => state.wishlist.ids)
  const key = ids.join(',')
  const [products, setProducts] = useState<WishProduct[] | null>(null)

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    const query = key.split(',').map((id, i) => `where[id][in][${i}]=${encodeURIComponent(id)}`).join('&')
    fetch(`/api/products?limit=0&depth=1&${query}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((data) => setProducts(data.docs ?? []))
      .catch((error) => { if (error.name !== 'AbortError') setProducts([]) })
    return () => controller.abort()
  }, [key])

  const shown = (key ? products ?? [] : []).filter((product) => ids.includes(String(product.id)))

  return (
    <div className="mx-4 my-8 sm:mx-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[28px]">Your wishlist</h1>
        <p className="mt-1 text-sm text-muted">Saved in this browser only. There are no accounts, so it does not follow you to another device.</p>
        {key && products === null ? (
          <p role="status" className="mt-8 text-sm text-muted">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={<HeartIcon size={28} />} title="Nothing saved yet" text="Tap the heart on a product to keep it here." action={{ href: '/shop', label: 'Browse products' }} />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">
            {shown.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
