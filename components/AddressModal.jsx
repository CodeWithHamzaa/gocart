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

const AddressModal = ({ setShowAddressModal }) => {

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

        dispatch(addAddress({ ...address, id: crypto.randomUUID() }))
        setShowAddressModal(false)
    }

    return (
        <form onSubmit={handleSubmit} className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center">
            <div className="flex flex-col gap-5 text-slate-700 w-full max-w-sm mx-6">
                <h2 className="text-3xl ">Add New <span className="font-semibold">Address</span></h2>
                <input name="name" onChange={handleAddressChange} value={address.name} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Full name" autoComplete="name" required />
                {errors.name && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.name}</p>}
                <input name="phone" onChange={handleAddressChange} value={address.phone} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="tel" placeholder="03XXXXXXXXX" inputMode="numeric" autoComplete="tel" required />
                {errors.phone && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.phone}</p>}
                <input name="email" onChange={handleAddressChange} value={address.email} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="email" placeholder="Email address" required />
                <input name="address" onChange={handleAddressChange} value={address.address} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="House #, street, locality" autoComplete="street-address" required />
                {errors.address && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.address}</p>}
                <div className="flex gap-4">
                    <input name="city" onChange={handleAddressChange} value={address.city} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="City" required />
                    <input name="area" onChange={handleAddressChange} value={address.area} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Area" required />
                </div>
                {(errors.city || errors.area) && <p role="alert" className="-mt-3 text-xs text-red-500">{errors.city || errors.area}</p>}
                <button className="bg-slate-800 text-white text-sm font-medium py-2.5 rounded-md hover:bg-slate-900 active:scale-95 transition-all">SAVE ADDRESS</button>
            </div>
            <XIcon size={30} className="absolute top-5 right-5 text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => setShowAddressModal(false)} />
        </form>
    )
}

export default AddressModal