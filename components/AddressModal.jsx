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
// Milestone 120: every field has a visible label (a placeholder is not a label), the fields are grouped
// under "Contact" and "Delivery address", and email and area are marked "Optional" because they are: the
// server accepts an order without an area (validateArea) and never receives the email at all. The
// `name` attributes, validators, saved shape and the SAVE ADDRESS button are as before.
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

// One labelled field: the label (with an "Optional" tag when it is), the control, then the error when the
// field is wrong, otherwise a hint. Defined outside AddressModal on purpose: a component created inside
// another one is a new component on every render, which would remount the input and drop focus on each key.
const Field = ({ id, label, optional = false, hint, error, children }) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
            {label}
            {optional && <span className="text-xs font-medium text-muted">Optional</span>}
        </label>
        {children}
        {error ? (
            <p id={`${id}-error`} role="alert" className="text-xs text-sale">{error}</p>
        ) : hint ? (
            <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
        ) : null}
    </div>
)

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

    const field = 'h-12 w-full min-w-0 rounded-full border border-line-input bg-surface px-5 text-ink placeholder:text-muted focus:border-primary aria-[invalid=true]:border-sale'

    const describe = (id, hint) => (errors[id] ? `${id}-error` : hint ? `${id}-hint` : undefined)
    const legend = 'mb-3 text-xs font-semibold uppercase tracking-eyebrow text-muted'

    return (
        <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Add new address" className="fixed inset-0 z-50 overflow-y-auto bg-page/80 backdrop-blur">
            {/* M44: the form scrolls (small phones, on-screen keyboard) instead of clipping at h-screen.
                M101: the fields sit on a lavender card (pill fields, a pill button), like the order summary. */}
            <div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
            <div className="relative flex w-full flex-col gap-5 rounded-panel bg-surface px-5 pb-6 pt-7 text-ink shadow-float sm:px-7">
                <h2 className="pr-10 text-2xl font-semibold tracking-tighter">Add new address</h2>

                <fieldset className="flex flex-col gap-4">
                    <legend className={legend}>Contact</legend>
                    <Field id="name" error={errors.name} label="Full name">
                        <input id="name" name="name" onChange={handleAddressChange} value={address.name} className={field} type="text" autoComplete="name" required aria-invalid={Boolean(errors.name)} aria-describedby={describe('name')} />
                    </Field>
                    <Field id="phone" error={errors.phone} label="Mobile number" hint="Eleven digits, like 03001234567">
                        <input id="phone" name="phone" onChange={handleAddressChange} value={address.phone} className={field} type="tel" placeholder="03XXXXXXXXX" inputMode="numeric" autoComplete="tel" required aria-invalid={Boolean(errors.phone)} aria-describedby={describe('phone', true)} />
                    </Field>
                    <Field id="email" error={errors.email} label="Email" optional>
                        <input id="email" name="email" onChange={handleAddressChange} value={address.email} className={field} type="email" autoComplete="email" />
                    </Field>
                </fieldset>

                <fieldset className="flex flex-col gap-4">
                    <legend className={legend}>Delivery address</legend>
                    <Field id="address" error={errors.address} label="Street address">
                        <input id="address" name="address" onChange={handleAddressChange} value={address.address} className={field} type="text" placeholder="House #, street, locality" autoComplete="street-address" required aria-invalid={Boolean(errors.address)} aria-describedby={describe('address')} />
                    </Field>
                    <div className="flex gap-3">
                        <Field id="city" error={errors.city} label="City">
                            <input id="city" name="city" onChange={handleAddressChange} value={address.city} className={field} type="text" autoComplete="address-level2" required aria-invalid={Boolean(errors.city)} aria-describedby={describe('city')} />
                        </Field>
                        <Field id="area" error={errors.area} label="Area" optional>
                            <input id="area" name="area" onChange={handleAddressChange} value={address.area} className={field} type="text" autoComplete="address-level3" aria-invalid={Boolean(errors.area)} aria-describedby={describe('area')} />
                        </Field>
                    </div>
                </fieldset>

                <button type="submit" className={buttonClasses({ size: 'lg' })}>SAVE ADDRESS</button>
                <button type="button" aria-label="Close" onClick={() => setShowAddressModal(false)} className="absolute right-2.5 top-3 inline-flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-surface-muted hover:text-ink">
                    <XIcon size={24} aria-hidden="true" />
                </button>
            </div>
            </div>
        </form>
    )
}

export default AddressModal