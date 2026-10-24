import { formatPKR } from '@/lib/currency'
// M66: restyled on the redesign tokens (status pills keep 4.5:1; no CSS upper-casing, e2e reads the text).
// M36: renders the guest order-lookup result (lookupOrder's `order` shape, ADR-024) as
// a single responsive card. Replaces the dummy-data table row. Product images are not
// part of the lookup result, so lines are text-only. React escaping only.
const STATUS_STYLES = {
    PLACED: { label: 'Placed', className: 'bg-primary-soft text-primary-dark' },
    CONFIRMED: { label: 'Confirmed', className: 'bg-tint-yellow text-tint-yellow-link' },
    PROCESSING: { label: 'Processing', className: 'bg-tint-blue text-tint-blue-link' },
    SHIPPED: { label: 'Shipped', className: 'bg-tint-lavender text-tint-lavender-link' },
    DELIVERED: { label: 'Delivered', className: 'bg-success-soft text-success' },
    CANCELLED: { label: 'Cancelled', className: 'bg-pink-soft text-pink-dark' },
    RETURNED: { label: 'Returned', className: 'bg-tint-peach text-tint-peach-link' },
}

const OrderItem = ({ order }) => {

    const status = STATUS_STYLES[order.status] || { label: String(order.status), className: 'bg-primary-soft text-primary-dark' };
    const placedOn = new Date(order.createdAt);

    return (
        <div className="rounded-card bg-white p-5 text-sm text-ink-2 shadow-card ring-1 ring-line">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs text-muted">Order number</p>
                    <p className="break-all font-mono text-base font-semibold text-ink">{order.orderNumber}</p>
                    {!Number.isNaN(placedOn.getTime()) && <p className="mt-1 text-muted">{placedOn.toDateString()}</p>}
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}>{status.label}</span>
            </div>

            <ul className="mt-4 divide-y divide-line border-y border-line">
                {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between gap-4 py-3">
                        <div className="min-w-0">
                            <p className="break-words text-ink">{item.name} <span className="text-muted">x {item.quantity}</span></p>
                            <p className="text-xs text-muted">{formatPKR(item.unitPrice)} each</p>
                        </div>
                        <p className="shrink-0 font-medium">{formatPKR(item.unitPrice * item.quantity)}</p>
                    </li>
                ))}
            </ul>

            <dl className="mt-4 space-y-1">
                <div className="flex justify-between">
                    <dt className="text-muted">Subtotal</dt>
                    <dd className="font-medium">{formatPKR(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-muted">Shipping</dt>
                    <dd className="font-medium">{order.shippingCost === 0 ? 'Free' : formatPKR(order.shippingCost)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2 text-base text-ink">
                    <dt>Total</dt>
                    <dd className="font-semibold">{formatPKR(order.orderTotal)}</dd>
                </div>
            </dl>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                    <p className="text-xs text-muted">Delivery details</p>
                    <p className="text-ink">{order.delivery.name}</p>
                    <p>{order.delivery.phone}</p>
                    <p>{order.delivery.address}</p>
                    {order.delivery.area && <p>{order.delivery.area}</p>}
                    <p>{order.delivery.city}</p>
                </div>
                <div>
                    <p className="text-xs text-muted">Payment</p>
                    <p className="text-ink">Cash on Delivery (COD)</p>
                    <p>{order.isPaid ? 'Paid' : 'Unpaid'}</p>
                </div>
            </div>
        </div>
    )
}

export default OrderItem
