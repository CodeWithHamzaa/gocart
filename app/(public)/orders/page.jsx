'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";

// M28: inlined, self-contained, image-free — the old orderDummyData lived in
// assets/assets.js and pulled in productDummyData (with product_img*.png
// imports), deleted this milestone. This page is still fully dummy; M36 is
// the milestone that replaces it with real guest order lookup. OrderItem.jsx
// already renders without an image when a product has none.
const orderDummyData = [
    {
        id: "order_1",
        total: 214.2,
        status: "DELIVERED",
        isPaid: false,
        paymentMethod: "COD",
        createdAt: "2025-08-22T09:15:03.929Z",
        orderItems: [
            { productId: "prod_1", quantity: 1, price: 89, product: { id: "prod_1", name: "Modern table lamp", images: [] } },
            { productId: "prod_2", quantity: 1, price: 149, product: { id: "prod_2", name: "Smart speaker gray", images: [] } },
        ],
        address: { name: "John Doe", street: "123 Main St", city: "New York", state: "NY", zip: "10001", country: "USA", phone: "1234567890" },
    },
    {
        id: "order_2",
        total: 421.6,
        status: "DELIVERED",
        isPaid: false,
        paymentMethod: "COD",
        createdAt: "2025-08-22T09:14:35.923Z",
        orderItems: [
            { productId: "prod_3", quantity: 1, price: 229, product: { id: "prod_3", name: "Smart watch white", images: [] } },
            { productId: "prod_4", quantity: 1, price: 99, product: { id: "prod_4", name: "Wireless headphones", images: [] } },
            { productId: "prod_5", quantity: 1, price: 199, product: { id: "prod_5", name: "Smart watch black", images: [] } },
        ],
        address: { name: "John Doe", street: "123 Main St", city: "New York", state: "NY", zip: "10001", country: "USA", phone: "1234567890" },
    },
]

export default function Orders() {

    const [orders, setOrders] = useState([]);

    useEffect(() => {
        setOrders(orderDummyData)
    }, []);

    return (
        <div className="min-h-[70vh] mx-6">
            {orders.length > 0 ? (
                (
                    <div className="my-20 max-w-7xl mx-auto">
                        <PageTitle heading="My Orders" text={`Showing total ${orders.length} orders`} linkText={'Go to home'} />

                        <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
                            <thead>
                                <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                                    <th className="text-left">Product</th>
                                    <th className="text-center">Total Price</th>
                                    <th className="text-left">Address</th>
                                    <th className="text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <OrderItem order={order} key={order.id} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                    <h1 className="text-2xl sm:text-4xl font-semibold">You have no orders</h1>
                </div>
            )}
        </div>
    )
}