// Milestone 122 (ADR-053): the Mirza Cart logo. The mark is an abstract shopping cart (a filled,
// forward-leaning basket, a short handle and two wheels) on a rounded violet tile; on the dark surface the
// tile is white and the cart violet. The wordmark is the store name in Plus Jakarta Sans: the first word
// heavy, the rest medium ("Mirza" + "Cart"). The name is still the Settings `storeName`, never hard-coded,
// so renaming the store in /admin renames the logo. The same mark is the favicon (app/icon.svg,
// app/favicon.ico, app/apple-icon.png) and the admin logo (components/admin/Logo.tsx).
export const CART_GLYPH = {
  handle: 'M3.5 6.5h3.3a1.6 1.6 0 0 1 1.55 1.2L9 10',
  basket: 'M8.2 9.6h19.2a1.2 1.2 0 0 1 1.15 1.55l-2.7 8.9a1.9 1.9 0 0 1-1.82 1.35H13.1a1.9 1.9 0 0 1-1.84-1.42z',
}

export function BrandMark({ size = 32, inverse = false, className = '' }: { size?: number; inverse?: boolean; className?: string }) {
  const tile = inverse ? 'fill-on-inverse' : 'fill-primary'
  const glyph = inverse ? 'fill-primary' : 'fill-on-primary'
  const stroke = inverse ? 'stroke-primary' : 'stroke-on-primary'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="8" className={tile} />
      <g transform="translate(3.4 3.6) scale(.79)">
        <path d={CART_GLYPH.handle} fill="none" className={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d={CART_GLYPH.basket} className={glyph} />
        <circle cx="13.6" cy="26.3" r="2.2" className={glyph} />
        <circle cx="23.4" cy="26.3" r="2.2" className={glyph} />
      </g>
    </svg>
  )
}

export default function BrandLogo({ name, mark = true, inverse = false }: { name: string; mark?: boolean; inverse?: boolean }) {
  const [first, ...rest] = name.trim().split(/\s+/)
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {mark && <BrandMark inverse={inverse} />}
      <span className={`truncate tracking-tight ${inverse ? 'text-on-inverse' : 'text-ink'}`}>
        <span className="font-extrabold">{first}</span>
        {rest.length > 0 && <span className="font-medium"> {rest.join(' ')}</span>}
      </span>
    </span>
  )
}
