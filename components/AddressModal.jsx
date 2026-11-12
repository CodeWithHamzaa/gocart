'use client'
import { XIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"
import { addAddress } from "@/lib/features/address/addressSlice"
import { buttonClasses } from '@/components/ui/Button'
import {
    validateAddress,
    validateArea,
    validateCity,
    validateName,
    validatePhone,
} from "@/lib/validation/pk"

// M65: markup classes only (tokens); fields, validation and handlers are unchanged.
// M31: Pakistani guest-checkout address capture (PROJECT_SPEC.md — name, phone,
// address, city, area), phone-first per the milestone's goal. Field set matches
// collections/Orders.ts's embedded guest-address fields exactly (ADR-021), so a
// later milestone (M33) can map this straight onto an order with no translation
// layer. `email` is kept even though Orders has no email field today — captured
// for a possible future order-notification use, not yet wired to anything.
// M56: the same rules the server enforces in createOrder (lib/validation/pk.ts) run here
// first so the customer sees a specific message next to the field; the server remains
// the authority.
const VALIDATORS = {
    name: validateName,
    phone: validatePhone,
    address: validateAddress,
    city: validateCity,
    area: validateArea,
}

const AddressModal = ({ setShowAddressModal, onSaved }) => {

    const dispatch = useDispatch()

    const [address, setAddress] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        area: '',
    })

    const [errors, setErrors] = useState({})

    const handleAddressChange = (e) => {
        setAddress({
            ...address,
            [e.target.name]: e.target.value
        })
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null })
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const found = {}
        for (const [field, validate] of Object.entries(VALIDATORS)) {
            const message = validate(address[field])
            if (message) found[field] = message
        }
        if (Object.keys(found).length > 0) {
            setErrors(found)
            toast.error(Object.values(found)[0])
            return
        }

        const saved = { ...address, id: crypto.randomUUID() }
        dispatch(addAddress(saved))
        if (onSaved) onSaved(saved)
        setShowAddressModal(false)
    }

    const field = 'h-12 w-full min-w-0 rounded-full border border-line-input bg-surface px-5 text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary'

    return (
        <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Add new address" className="fixed inset-0 z-50 overflow-y-auto bg-page/80 backdrop-blur">
            {/* M44: the form scrolls (small phones, on-screen keyboard) instead of clipping at h-screen.
                M101: the fields sit on a lavender card (pill fields, a pill button), like the order summary. */}
            <div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
            <div className="relative flex w-full flex-col gap-5 rounded-panel bg-surface px-5 pb-6 pt-7 text-ink shadow-float sm:px-7">
                <h2 className="pr-10 text-2xl font-semibold tracking-tighter">Add new address</h2>
                <input name="name" onChange={handleAddressChange} value={address.name} className={field} type="text" placeholder="Full name" autoComplete="name" required />
                {errors.name && <p role="alert" className="-mt-3 text-xs text-sale">{errors.name}</p>}
                <input name="phone" onChange={handleAddressChange} value={address.phone} className={field} type="tel" placeholder="03XXXXXXXXX" inputMode="numeric" autoComplete="tel" required />
                {errors.phone && <p role="alert" className="-mt-3 text-xs text-sale">{errors.phone}</p>}
                <input name="email" onChange={handleAddressChange} value={address.email} className={field} type="email" placeholder="Email address" required />
                <input name="address" onChange={handleAddressChange} value={address.address} className={field} type="text" placeholder="House #, street, locality" autoComplete="street-address" required />
                {errors.address && <p role="alert" className="-mt-3 text-xs text-sale">{errors.address}</p>}
                <div className="flex gap-3">
                    <input name="city" onChange={handleAddressChange} value={address.city} className={field} type="text" placeholder="City" required />
                    <input name="area" onChange={handleAddressChange} value={address.area} className={field} type="text" placeholder="Area" required />
                </div>
                {(errors.city || errors.area) && <p role="alert" className="-mt-3 text-xs text-sale">{errors.city || errors.area}</p>}
                <button type="submit" className={buttonClasses({ size: 'lg' })}>SAVE ADDRESS</button>
                <button type="button" aria-label="Close" onClick={() => setShowAddressModal(false)} className="absolute right-2.5 top-3 inline-flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-white hover:text-ink">
                    <XIcon size={24} aria-hidden="true" />
                </button>
            </div>
            </div>
        </form>
    )
}

export default AddressModal