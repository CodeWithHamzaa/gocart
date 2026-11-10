'use client'
import { ShoppingCartIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { addToCart } from '@/lib/features/cart/cartSlice'

// M61: the round add-to-cart button on a product card. It dispatches the same `addToCart` the
// product page uses. It is a sibling of the card's link, never inside it. The label is "Add {name}
// to cart" so it never matches the product page's single "Add to Cart" button (e2e). An
// out-of-stock product gets a disabled button that says so, the same fail-closed rule as checkout.
// M111: `variant="solid"` is the listing card's filled brand-colour circle in its price row (dimmed
// when out of stock); the default `outline` stays the white chip floated on the home rail's photos.
const VARIANTS = {
  outline: {
    base: 'bg-surface shadow-chip ring-1 ring-line',
    enabled: 'text-primary hover:bg-primary hover:text-white',
    disabled: 'bg-surface text-disabled',
  },
  solid: {
    base: 'bg-primary text-white',
    enabled: 'hover:bg-primary-dark',
    disabled: 'opacity-40',
  },
}

export default function QuickAddButton({ productId, name, disabled = false, variant = 'outline', className = '' }: { productId: number | string; name: string; disabled?: boolean; variant?: keyof typeof VARIANTS; className?: string }) {
  const dispatch = useDispatch()
  const look = VARIANTS[variant]

  const base = `flex size-11 shrink-0 items-center justify-center rounded-full transition ${look.base} ${className}`

  if (disabled) {
    return (
      <button type="button" disabled aria-label={`${name} is out of stock`} className={`${base} cursor-not-allowed ${look.disabled}`}>
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
      className={`${base} ${look.enabled} active:scale-95`}
    >
      <ShoppingCartIcon size={20} aria-hidden="true" />
    </button>
  )
}
