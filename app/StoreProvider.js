'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { hydrateCart } from '../lib/features/cart/cartSlice'

// M30 (ADR-023): the cart is guest-only with no server identity to key it on,
// so localStorage is the persistence layer. Key is namespaced to avoid
// colliding with anything else that might use this origin's storage.
const CART_STORAGE_KEY = 'gocart:cart'

function readPersistedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    // Validate per-entry rather than trusting the whole object — one bad
    // entry (e.g. from a future format change) shouldn't blank the rest.
    const cartItems = {}
    for (const [productId, quantity] of Object.entries(parsed)) {
      if (Number.isInteger(quantity) && quantity > 0) {
        cartItems[productId] = quantity
      }
    }
    return cartItems
  } catch {
    // Malformed JSON or inaccessible storage (private browsing, disabled
    // storage) — start from an empty cart rather than crashing every
    // storefront route, since this provider wraps the whole public layout.
    return {}
  }
}

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  useEffect(() => {
    // Hydrate after mount, not during initial state: reading localStorage
    // while rendering would make the server's HTML (always an empty cart)
    // mismatch the client's first render and break hydration on every
    // storefront route. `hydrateCart` recomputes `total` from the restored
    // `cartItems` rather than trusting a persisted total.
    storeRef.current.dispatch(hydrateCart({ cartItems: readPersistedCart() }))

    // Persist on every state change, including clearCart — no special case
    // needed for it to clear storage too, since it writes {} like any other
    // mutation.
    const unsubscribe = storeRef.current.subscribe(() => {
      try {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(storeRef.current.getState().cart.cartItems),
        )
      } catch {
        // localStorage unavailable or full — the cart still works for this
        // session, it just won't survive a reload.
      }
    })

    return unsubscribe
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}