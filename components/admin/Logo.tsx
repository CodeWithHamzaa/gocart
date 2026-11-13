// M95: the admin's logo (login page and sidebar header): the storefront's mark and the
// store name. Server component; the name is the Settings `storeName`, like the storefront, with a
// plain fallback so the login page still renders if Settings cannot be read.
import { getSettings } from '@/lib/payload/settings'
import { CART_GLYPH } from '@/components/ui/BrandLogo'

export default async function AdminLogo() {
  let name = 'Store'
  try {
    name = (await getSettings()).storeName || name
  } catch {
    // keep the fallback
  }
  // Milestone 122 (ADR-053): the storefront's cart mark (components/ui/BrandLogo.tsx), drawn with plain
  // colours because the admin does not load the storefront's Tailwind utilities.
  return (
    <span className="mirza-logo">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#5F42EC" />
        <g transform="translate(3.4 3.6) scale(.79)" fill="#fff">
          <path d={CART_GLYPH.handle} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={CART_GLYPH.basket} />
          <circle cx="13.6" cy="26.3" r="2.2" />
          <circle cx="23.4" cy="26.3" r="2.2" />
        </g>
      </svg>
      <span className="mirza-logo__name">{name}</span>
      <span className="mirza-logo__tag">Admin</span>
    </span>
  )
}
