import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import { formatPKR } from '@/lib/currency'

// M95: the admin home ("Overview"), replacing Payload's collection-card dashboard. Everything on it
// is read from the store's own data through the Local API with the signed-in user's access
// (`overrideAccess: false`), so it shows exactly what that user may see. It is COD-only: there are
// no payment-verification cards, because no such state exists (ADR-004). Sales count orders that
// are confirmed or further along and not cancelled or returned.
type OrderRow = {
  id: number | string
  orderNumber: string
  name: string
  phone: string
  city: string
  orderTotal: number
  isPaid?: boolean | null
  status: string
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

const SALES_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

const placed = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { payload, user } = initPageResult.req
  const read = { overrideAccess: false, user } as const

  const [toConfirm, toDispatch, onTheWay, soldOut, productCount, salesRows, latest] = await Promise.all([
    payload.count({ collection: 'orders', where: { status: { equals: 'PLACED' } }, ...read }),
    payload.count({ collection: 'orders', where: { status: { in: ['CONFIRMED', 'PROCESSING'] } }, ...read }),
    payload.count({ collection: 'orders', where: { status: { equals: 'SHIPPED' } }, ...read }),
    payload.count({ collection: 'products', where: { inStock: { equals: false } }, ...read }),
    payload.count({ collection: 'products', ...read }),
    payload.find({
      collection: 'orders',
      where: { status: { in: SALES_STATUSES } },
      pagination: false,
      depth: 0,
      select: { orderTotal: true },
      ...read,
    }),
    payload.find({ collection: 'orders', sort: '-createdAt', limit: 8, depth: 0, ...read }),
  ])

  const sales = salesRows.docs.reduce((sum, order) => sum + (Number((order as { orderTotal?: number }).orderTotal) || 0), 0)
  const orders = latest.docs as unknown as OrderRow[]

  const cards: Array<{ value: string; label: string; hot?: boolean }> = [
    { value: String(toConfirm.totalDocs), label: 'New orders to confirm', hot: toConfirm.totalDocs > 0 },
    { value: String(toDispatch.totalDocs), label: 'Ready to dispatch' },
    { value: String(onTheWay.totalDocs), label: 'On the way' },
    { value: formatPKR(sales), label: 'Sales from confirmed, dispatched or delivered orders' },
    { value: String(soldOut.totalDocs), label: 'Products marked sold out', hot: soldOut.totalDocs > 0 },
    { value: String(productCount.totalDocs), label: 'Products in the catalogue' },
  ]

  return (
    <Gutter>
      <div className="mirza-overview">
        <h1 className="mirza-overview__title">Overview</h1>

        <div className="mirza-cards">
          {cards.map((card) => (
            <div key={card.label} className={`mirza-card${card.hot ? ' mirza-card--hot' : ''}`}>
              <div className="mirza-card__value">{card.value}</div>
              <div className="mirza-card__label">{card.label}</div>
            </div>
          ))}
        </div>

        <h2 className="mirza-overview__heading">Latest orders</h2>
        {orders.length === 0 ? (
          <p className="mirza-empty">No orders yet. They will appear here as customers place them.</p>
        ) : (
          <div className="mirza-table-wrap">
            <table className="mirza-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>City</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/collections/orders/${order.id}`} className="mirza-table__order">{order.orderNumber}</Link>
                    </td>
                    <td>
                      {order.name}
                      <div className="mirza-table__sub">{order.phone}</div>
                    </td>
                    <td>{order.city}</td>
                    <td>{formatPKR(order.orderTotal)}</td>
                    <td>
                      Cash on delivery
                      <div className="mirza-table__sub">{order.isPaid ? 'Paid' : 'Pay on delivery'}</div>
                    </td>
                    <td>
                      <span className={`mirza-pill mirza-pill--${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
                    </td>
                    <td className="mirza-table__sub">{placed(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mirza-actions">
          <Link href="/admin/collections/orders" className="mirza-btn mirza-btn--ghost">All orders</Link>
          <Link href="/admin/collections/products/create" className="mirza-btn">Add a product</Link>
        </div>
      </div>
    </Gutter>
  )
}
