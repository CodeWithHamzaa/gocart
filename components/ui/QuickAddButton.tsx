'use client'
import { ShoppingCartIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { addToCart } from '@/lib/features/cart/cartSlice'

// M61: the round add-to-cart button on a product card. It dispatches the same `addToCart` the
// product page uses. It is a sibling of the card's link, never inside it. The label is "Add {name}
// to cart" so it never matches the product page's single "Add to Cart" button (e2e). An
// out-of-stock product gets a disabled button that says so, the same fail-closed rule as checkout.
export default function QuickAddButton({ productId, name, disabled = false, className = '' }: { productId: number | string; name: string; disabled?: boolean; className?: string }) {
  const dispatch = useDispatch()

  const base = `flex size-11 items-center justify-center rounded-full shadow-chip transition ${className}`

  if (disabled) {
    return (
      <button type="button" disabled aria-label={`${name} is out of stock`} className={`${base} cursor-not-allowed bg-white text-disabled`}>
        <ShoppingCartIcon size={20} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={`Add ${name} to cart`}
      onClick={() => {
        dispatch(addToCart({ productId }))
        toast.success('Added to cart')
      }}
      className={`${base} bg-primary-soft text-primary hover:bg-lavender-2 active:scale-95`}
    >
      <ShoppingCartIcon size={20} aria-hidden="true" />
    </button>
  )
}
