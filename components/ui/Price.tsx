import { formatPKR } from '@/lib/currency'
import { discountPercent } from '@/lib/product-badges'

// M115: the one price block (brand kit price pattern): the price in ink, then, only for a real
// discount, the MRP struck through and "-27%" in the sale colour. Screen readers hear "Was Rs. 4,999"
// and "27% off". Inline <span>s only, so it can sit inside the card's link (e2e reads the price
// from that link). The MRP and the discount are one group, so "-27%" moves with its MRP instead of wrapping alone
// (each still wraps if a seven-digit price leaves no room at 320px).
//   card    product cards in every grid and rail
//   detail  the product page
export default function Price({ price, mrp, size = 'card', className = '' }: { price: number; mrp?: number | null; size?: 'card' | 'detail'; className?: string }) {
  const discount = discountPercent(mrp, price)
  const detail = size === 'detail'
  return (
    <span className={`flex flex-wrap items-baseline ${detail ? 'gap-x-3 gap-y-1' : 'gap-x-1.5'} ${className}`.trim()}>
      <span className={detail ? 'text-3xl font-semibold leading-none tracking-tight text-ink' : 'whitespace-nowrap text-sm font-semibold text-ink sm:text-base'}>
        {formatPKR(price)}
      </span>
      {discount > 0 && (
        <span className={`inline-flex flex-wrap items-baseline ${detail ? 'gap-x-3' : 'gap-x-1.5'}`}>
          <s className={`whitespace-nowrap text-muted ${detail ? 'text-base' : 'text-xs'}`}>
            <span className="sr-only">Was </span>
            {formatPKR(mrp)}
          </s>
          <span className={`whitespace-nowrap font-semibold text-sale ${detail ? 'text-base' : 'text-xs'}`}>
            <span aria-hidden="true">&minus;{discount}%</span>
            <span className="sr-only">{discount}% off</span>
          </span>
        </span>
      )}
    </span>
  )
}
