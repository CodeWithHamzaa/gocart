import { PlusIcon, SquarePenIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { placeOrder } from '@/app/(public)/cart/actions';
import { writeLastOrder } from '@/lib/order-confirmation';
import { useRouter } from 'next/navigation';

const OrderSummary = ({ totalPrice, items }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';

    const dispatch = useDispatch();
    const router = useRouter();

    const addressList = useSelector(state => state.address.list);

    // M32: COD is the only payment method for launch (ADR-004). M33: the server sets
    // paymentMethod itself (ADR-026), so nothing is sent from here.
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [placing, setPlacing] = useState(false);
    // M33 (pulled forward from M34): shipping settings via Payload's public REST API.
    // null = loading or failed; Place Order stays disabled rather than show a wrong total.
    const [shippingSettings, setShippingSettings] = useState(null);
    const [settingsFailed, setSettingsFailed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/globals/settings', { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error('settings request failed');
                return res.json();
            })
            .then((data) => {
                if (typeof data.shippingFlatRate === 'number' && typeof data.freeShippingThreshold === 'number') {
                    setShippingSettings({
                        shippingFlatRate: data.shippingFlatRate,
                        freeShippingThreshold: data.freeShippingThreshold,
                    });
                } else {
                    setSettingsFailed(true);
                }
            })
            .catch((error) => {
                if (error.name !== 'AbortError') setSettingsFailed(true);
            });

        return () => controller.abort();
    }, []);

    const shipping = shippingSettings
        ? (totalPrice >= shippingSettings.freeShippingThreshold ? 0 : shippingSettings.shippingFlatRate)
        : null;
    const grandTotal = shipping === null ? null : totalPrice + shipping;

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (placing) return;
        if (!items || items.length === 0) {
            toast.error('Your cart is empty.');
            return;
        }
        if (!selectedAddress) {
            toast.error('Please select or add a delivery address.');
            return;
        }

        setPlacing(true);
        // M35: stays true after a successful order until navigation unmounts the page.
        let keepDisabled = false;
        try {
            const result = await placeOrder({
                items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
                customer: {
                    name: selectedAddress.name,
                    phone: selectedAddress.phone,
                    address: selectedAddress.address,
                    city: selectedAddress.city,
                    area: selectedAddress.area,
                },
            });

            if (result.ok) {
                keepDisabled = true;
                // M35 (ADR-027): hand the server's response to /order-confirmation via
                // sessionStorage; delivery details come from the form the guest filled in.
                const saved = writeLastOrder({
                    orderNumber: result.orderNumber,
                    items: result.items,
                    subtotal: result.subtotal,
                    shippingCost: result.shippingCost,
                    orderTotal: result.orderTotal,
                    delivery: {
                        name: selectedAddress.name,
                        phone: selectedAddress.phone,
                        address: selectedAddress.address,
                        city: selectedAddress.city,
                        area: selectedAddress.area || undefined,
                    },
                    placedAt: new Date().toISOString(),
                });
                dispatch(clearCart());
                if (saved) {
                    toast.success('Order placed!');
                    router.push('/order-confirmation');
                    return;
                }
                // Storage unavailable: keep the M33 behaviour, no navigation.
                keepDisabled = false;
                toast.success(
                    `Order placed! Your order number is ${result.orderNumber}. Total to pay on delivery: ${currency}${result.orderTotal.toLocaleString()}. Please save this order number - together with your phone number it is how you look up your order.`,
                    { duration: 20000 }
                );
            } else if (result.code === 'OUT_OF_STOCK' && result.unavailable?.length) {
                toast.error(`Out of stock: ${result.unavailable.map((p) => p.name).join(', ')}. Please remove them from your cart and try again.`);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('We could not place your order. Please try again.');
        } finally {
            if (!keepDisabled) setPlacing(false);
        }
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            <p className='text-slate-400 text-xs my-4'>Payment Method</p>
            <p className='text-slate-700 font-medium'>Cash on Delivery (COD)</p>
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p>{selectedAddress.name}, {selectedAddress.address}, {selectedAddress.area}, {selectedAddress.city}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.address}, {address.area}, {address.city}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)} >Add Address <PlusIcon size={18} /></button>
                        </div>
                    )
                }
            </div>
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p>{shipping === null ? '...' : (shipping === 0 ? 'Free' : `${currency}${shipping.toLocaleString()}`)}</p>
                    </div>
                </div>
            </div>
            <div className='flex justify-between py-4'>
                <p>Total:</p>
                <p className='font-medium text-right'>{grandTotal === null ? '...' : `${currency}${grandTotal.toLocaleString()}`}</p>
            </div>
            {shippingSettings === null && (
                <p className='text-xs text-slate-400 pb-2'>
                    {settingsFailed ? 'Could not load shipping charges. Please refresh the page.' : 'Calculating shipping...'}
                </p>
            )}
            <button onClick={handlePlaceOrder} disabled={placing || shippingSettings === null} className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100'>{placing ? 'Placing order...' : 'Place Order'}</button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary