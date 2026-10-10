'use client'
import { XIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"
import { addAddress } from "@/lib/features/address/addressSlice"
import {
    validateAddress,
    validateArea,
    validateCity,
    validateName,
    validatePhone,
} from "@/lib/validation/pk"

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

    return (
        <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Add new address" className="fixed inset-0 z-50 bg-white/60 backdrop-blur overflow-y-auto">
            {/* M44: the form scrolls (small phones, on-screen keyboard) instead of clipping at h-screen. */}
            <div className="flex flex-col justify-center gap-5 text-slate-700 w-full max-w-sm mx-auto px-6 py-16 min-h-dvh">
                <h2 className="text-3xl ">Add New <span className="font-semibold">Address</span></h2>
                <input name="name" onChange={handleAddressChange} value={address.name} className="min-h-11 p-2 px-4 outline-none border border-slate-200 rounded w-full focus:border-slate-500" type="text" placeholder="Full name" autoComplete="name" required />
                {errors.name && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.name}</p>}
                <input name="phone" onChange={handleAddressChange} value={address.phone} className="min-h-11 p-2 px-4 outline-none border border-slate-200 rounded w-full focus:border-slate-500" type="tel" placeholder="03XXXXXXXXX" inputMode="numeric" autoComplete="tel" required />
                {errors.phone && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.phone}</p>}
                <input name="email" onChange={handleAddressChange} value={address.email} className="min-h-11 p-2 px-4 outline-none border border-slate-200 rounded w-full focus:border-slate-500" type="email" placeholder="Email address" required />
                <input name="address" onChange={handleAddressChange} value={address.address} className="min-h-11 p-2 px-4 outline-none border border-slate-200 rounded w-full focus:border-slate-500" type="text" placeholder="House #, street, locality" autoComplete="street-address" required />
                {errors.address && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.address}</p>}
                <div className="flex gap-4">
                    <input name="city" onChange={handleAddressChange} value={address.city} className="min-h-11 p-2 px-4 outline-none border border-slate-200 rounded w-full focus:border-slate-500" type="text" placeholder="City" required />
                    <input name="area" onChange={handleAddressChange} value={address.area} className="min-h-11 p-2 px-4 outline-none border border-slate-200 rounded w-full focus:border-slate-500" type="text" placeholder="Area" required />
                </div>
                {(errors.city || errors.area) && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.city || errors.area}</p>}
                <button className="min-h-11 bg-slate-800 text-white text-sm font-medium py-3 rounded-md hover:bg-slate-900 active:scale-95 transition-all">SAVE ADDRESS</button>
            </div>
            <button type="button" aria-label="Close" onClick={() => setShowAddressModal(false)} className="absolute top-3 right-3 inline-flex items-center justify-center size-11 text-slate-500 hover:text-slate-700">
                <XIcon size={28} aria-hidden="true" />
            </button>
        </form>
    )
}

export default AddressModal