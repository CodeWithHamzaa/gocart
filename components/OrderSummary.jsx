import { LockIcon, PlusIcon, SquarePenIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { placeOrder } from '@/app/(public)/cart/actions';
import { writeLastOrder } from '@/lib/order-confirmation';
import { useRouter } from 'next/navigation';
import { formatPKR } from '@/lib/currency'
import { TurnstileWidget, initialTurnstileState } from '@/components/TurnstileWidget'
import { newIdempotencyKey } from '@/lib/idempotency'
import { deliveryNote } from '@/lib/delivery'
import RadioCard from '@/components/ui/RadioCard'
import MobileActionBar from '@/components/ui/MobileActionBar'

// M65: the redesigned panel (design: Cart summary + Checkout steps, on /cart). Markup and classes only:
// every handler, state, effect, the server action call and the Turnstile wiring are as before. The
// design's promo code, express delivery and card/wallet/bank payments are not built (ADR-017, ADR-018,
// ADR-004). Below `lg` the total and the Place Order button sit in a fixed bar; it is the same button.
const OrderSummary = ({ totalPrice, items }) => {


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
    // M52b (ADR-035/036): a verified Turnstile token is REQUIRED; the button stays disabled until
    // the check has produced one, and an unreachable check means no online order (the message
    // under the widget says to contact the store).
    const [turnstile, setTurnstile] = useState(initialTurnstileState);
    const turnstileRef = useRef(null);
    // ADR-036: one idempotency key per checkout attempt. A retry after a lost response or a double
    // tap reuses it, so the server returns the first order instead of creating a second; it is
    // dropped on success and whenever the cart or the address changes (a different order).
    const attemptKey = useRef(null);

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

    const attemptSignature = JSON.stringify([(items || []).map((item) => [item.id, item.quantity]), selectedAddress]);
    useEffect(() => {
        attemptKey.current = null;
    }, [attemptSignature]);

    const shipping = shippingSettings
        ? (totalPrice >= shippingSettings.freeShippingThreshold ? 0 : shippingSettings.shippingFlatRate)
        : null;
    const grandTotal = shipping === null ? null : totalPrice + shipping;
    // "You save": MRP minus price over lines that have a real discount, from fields already fetched.
    const savings = (items || []).reduce((sum, item) => sum + (item.mrp > item.price ? (item.mrp - item.price) * item.quantity : 0), 0);
    const itemCount = (items || []).reduce((sum, item) => sum + item.quantity, 0);

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

        if (!attemptKey.current) attemptKey.current = newIdempotencyKey();
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
                turnstileToken: turnstile.token,
                idempotencyKey: attemptKey.current,
            });

            if (result.ok) {
                keepDisabled = true;
                attemptKey.current = null;
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
                    `Order placed! Your order number is ${result.orderNumber}. Total to pay on delivery: ${formatPKR(result.orderTotal)}. Please save this order number - together with your phone number it is how you look up your order.`,
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
            if (!keepDisabled) {
                setPlacing(false);
                // Tokens are single-use: get a fresh one for the next attempt.
                turnstileRef.current?.reset();
            }
        }
    }

    const step = 'mb-3 flex items-center gap-2.5 text-[15px] font-bold text-ink'
    const stepNo = 'flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white'

    return (
        <aside aria-label='Order summary' className='flex w-full min-w-0 flex-[1_1_340px] flex-col gap-5 rounded-[22px] bg-white p-5 text-sm shadow-card ring-1 ring-line sm:p-6 lg:sticky lg:top-4 lg:max-w-[420px]'>
            <h2 className='text-xl font-extrabold text-ink'>Order summary</h2>

            <section aria-labelledby='step-address'>
                <h3 id='step-address' className={step}><span className={stepNo} aria-hidden='true'>1</span>Delivery address</h3>
                {
                    selectedAddress ? (
                        <div className='flex items-center gap-2 rounded-tile border border-line-3 bg-lavender-tile p-3'>
                            <p className='min-w-0 flex-1 text-ink-2 [overflow-wrap:anywhere]'>{selectedAddress.name}, {selectedAddress.address}, {selectedAddress.area}, {selectedAddress.city}</p>
                            <button type='button' aria-label='Change delivery address' onClick={() => setSelectedAddress(null)} className='inline-flex size-11 shrink-0 items-center justify-center rounded-control text-primary hover:bg-primary-soft'><SquarePenIcon size={18} aria-hidden='true' /></button>
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select aria-label='Delivery address' className='mb-2 min-h-11 w-full rounded-control border border-line-2 bg-white px-3 text-ink' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.address}, {address.area}, {address.city}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button type='button' className='inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line-3 px-4 font-semibold text-primary-dark transition hover:border-primary' onClick={() => setShowAddressModal(true)} >Add Address <PlusIcon size={18} aria-hidden='true' /></button>
                        </div>
                    )
                }
            </section>

            <section aria-labelledby='step-delivery'>
                <h3 id='step-delivery' className={step}><span className={stepNo} aria-hidden='true'>2</span>Delivery</h3>
                <RadioCard
                    name='delivery'
                    value='standard'
                    checked
                    title='Standard delivery'
                    description={shippingSettings ? deliveryNote({ flatRate: shippingSettings.shippingFlatRate, freeShippingThreshold: shippingSettings.freeShippingThreshold }) : undefined}
                    trailing={shipping === null ? '...' : (shipping === 0 ? 'Free' : formatPKR(shipping))}
                />
            </section>

            <section aria-labelledby='step-payment'>
                <h3 id='step-payment' className={step}><span className={stepNo} aria-hidden='true'>3</span>Payment</h3>
                <RadioCard name='payment' value='cod' checked title='Cash on Delivery (COD)' description='Pay in cash when your order arrives' />
            </section>

            <dl className='grid grid-cols-[1fr_auto] gap-2.5 border-t border-line pt-4'>
                <dt className='text-muted'>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</dt><dd className='text-right font-semibold text-ink'>{formatPKR(totalPrice)}</dd>
                {savings > 0 && (<><dt className='text-muted'>You save</dt><dd className='text-right font-semibold text-success'>&minus; {formatPKR(savings)}</dd></>)}
                <dt className='text-muted'>Delivery</dt><dd className='text-right font-semibold text-ink'>{shipping === null ? '...' : (shipping === 0 ? 'Free' : formatPKR(shipping))}</dd>
            </dl>
            <div className='flex items-baseline justify-between border-t border-line pt-4'>
                <p className='font-semibold text-ink'>Total</p>
                <p className='text-[26px] font-extrabold leading-none tracking-[-0.02em] text-ink'>{grandTotal === null ? '...' : formatPKR(grandTotal)}</p>
            </div>
            {shippingSettings === null && (
                <p className='text-xs text-muted'>
                    {settingsFailed ? 'Could not load shipping charges. Please refresh the page.' : 'Calculating shipping...'}
                </p>
            )}
            <TurnstileWidget ref={turnstileRef} action='place_order' onChange={setTurnstile} />
            <MobileActionBar label='Place order' inline>
                <div className='mx-auto flex max-w-xl items-center gap-3 lg:max-w-none'>
                    <div className='shrink-0 lg:hidden'>
                        <p className='text-xs text-muted'>Total</p>
                        <p className='text-lg font-extrabold leading-tight text-ink'>{grandTotal === null ? '...' : formatPKR(grandTotal)}</p>
                    </div>
                    <button onClick={handlePlaceOrder} disabled={placing || shippingSettings === null || turnstile.status !== 'verified'} className='min-h-[54px] flex-1 rounded-2xl bg-primary px-4 text-base font-bold text-white transition hover:bg-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'>{placing ? 'Placing order...' : 'Place Order'}</button>
                </div>
            </MobileActionBar>
            <p className='flex items-center justify-center gap-2 text-xs text-muted'><LockIcon size={14} aria-hidden='true' />Cash on delivery &middot; no online payment</p>

            {/* M44: a newly saved address is selected straight away; before, the customer had to find
                it in the dropdown and Place Order failed with "select an address". */}
            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} onSaved={setSelectedAddress} />}

        </aside>
    )
}

export default OrderSummary
