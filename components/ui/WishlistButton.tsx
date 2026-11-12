'use client'
import { HeartIcon } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlist } from '@/lib/features/wishlist/wishlistSlice'

// M91 (ADR-041): the heart on a product card. A toggle button (fixed label + aria-pressed), a sibling
// of the card's link and never inside it. Saved in this browser only; no account is involved.
// M117 (ADR-052): a saved heart is violet (a selected state), not the sale pink, which is for real discounts only.
export default function WishlistButton({ productId, name, className = '' }: { productId: number | string; name: string; className?: string }) {
  const dispatch = useDispatch()
  const saved = useSelector((state: { wishlist: { ids: string[] } }) => state.wishlist.ids.includes(String(productId)))

  return (
    <button
      type="button"
      aria-label={`Save ${name} to wishlist`}
      aria-pressed={saved}
      onClick={() => dispatch(toggleWishlist({ productId }))}
      className={`flex size-11 items-center justify-center rounded-full ${className}`}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-surface shadow-chip transition active:scale-95 motion-reduce:transition-none">
        <HeartIcon size={17} strokeWidth={2} aria-hidden="true" className={saved ? 'fill-primary text-primary' : 'text-ink'} />
      </span>
    </button>
  )
}
