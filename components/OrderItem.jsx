// M36: renders the guest order-lookup result (lookupOrder's `order` shape, ADR-024) as
// a single responsive card. Replaces the dummy-data table row. Product images are not
// part of the lookup result, so lines are text-only. React escaping only.
const STATUS_STYLES = {
    PLACED: { label: 'Placed', className: 'bg-slate-100 text-slate-700' },
    CONFIRMED: { label: 'Confirmed', className: 'bg-yellow-100 text-yellow-700' },
    PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
    SHIPPED: { label: 'Shipped', className: 'bg-indigo-100 text-indigo-700' },
    DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
    RETURNED: { label: 'Returned', className: 'bg-orange-100 text-orange-700' },
}

const OrderItem = ({ order }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';
    const status = STATUS_STYLES[order.status] || { label: String(order.status), className: 'bg-slate-100 text-slate-700' };
    const placedOn = new Date(order.createdAt);

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs text-slate-400">Order number</p>
                    <p className="break-all font-mono text-base font-semibold text-slate-800">{order.orderNumber}</p>
                    {!Number.isNaN(placedOn.getTime()) && <p className="mt-1 text-slate-500">{placedOn.toDateString()}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
            </div>

            <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between gap-4 py-3">
                        <div className="min-w-0">
                            <p className="break-words text-slate-700">{item.name} <span className="text-slate-400">x {item.quantity}</span></p>
                            <p className="text-xs text-slate-400">{currency}{item.unitPrice.toLocaleString()} each</p>
                        </div>
                        <p className="shrink-0 font-medium">{currency}{(item.unitPrice * item.quantity).toLocaleString()}</p>
                    </li>
                ))}
            </ul>

            <dl className="mt-4 space-y-1">
                <div className="flex justify-between">
                    <dt className="text-slate-400">Subtotal</dt>
                    <dd className="font-medium">{currency}{order.subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-slate-400">Shipping</dt>
                    <dd className="font-medium">{order.shippingCost === 0 ? 'Free' : `${currency}${order.shippingCost.toLocaleString()}`}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base text-slate-800">
                    <dt>Total</dt>
                    <dd className="font-semibold">{currency}{order.orderTotal.toLocaleString()}</dd>
                </div>
            </dl>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                    <p className="text-xs text-slate-400">Delivery details</p>
                    <p className="text-slate-700">{order.delivery.name}</p>
                    <p>{order.delivery.phone}</p>
                    <p>{order.delivery.address}</p>
                    {order.delivery.area && <p>{order.delivery.area}</p>}
                    <p>{order.delivery.city}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-400">Payment</p>
                    <p className="text-slate-700">Cash on Delivery (COD)</p>
                    <p>{order.isPaid ? 'Paid' : 'Unpaid'}</p>
                </div>
            </div>
        </div>
    )
}

export default OrderItem
