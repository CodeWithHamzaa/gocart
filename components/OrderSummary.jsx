import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { placeOrder } from '@/app/(public)/cart/actions';

const OrderSummary = ({ totalPrice, items }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';

    const dispatch = useDispatch();

    const addressList = useSelector(state => state.address.list);

    // M32: COD is the only payment method for launch (ADR-004). M33: the server sets
    // paymentMethod itself (ADR-026), so nothing is sent from here.
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
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

    const handleCouponCode = async (event) => {
        event.preventDefault();
        
    }

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
                dispatch(clearCart());
                toast.success(
                    `Order placed! Your order number is ${result.orderNumber}. Total to pay on delivery: ${currency}${result.orderTotal.toLocaleString()}. Please save this order number - together with your phone number it is how you look up your order.`,
                    { duration: 20000 }
                );
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('We could not place your order. Please try again.');
        } finally {
            setPlacing(false);
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
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p>{shipping === null ? '...' : (shipping === 0 ? 'Free' : `${currency}${shipping.toLocaleString()}`)}</p>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * totalPrice).toFixed(2)}`}</p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Coupon Code' className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Apply</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>
            <div className='flex justify-between py-4'>
                <p>Total:</p>
                <p className='font-medium text-right'>{grandTotal === null ? '...' : `${currency}${coupon ? (grandTotal - (coupon.discount / 100 * totalPrice)).toFixed(2) : grandTotal.toLocaleString()}`}</p>
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