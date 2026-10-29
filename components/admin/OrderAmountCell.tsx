// M96: the order total in the Orders list as "Rs. 4,699" instead of the raw number.
import { formatPKR } from '@/lib/currency'

export default function OrderAmountCell({ cellData }: { cellData?: unknown }) {
  return <span>{formatPKR(typeof cellData === 'number' ? cellData : null)}</span>
}
