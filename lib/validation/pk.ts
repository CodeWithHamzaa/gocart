// M56: Pakistani guest-checkout validation, one source of truth for the checkout form
// (components/AddressModal.jsx), the server (lib/payload/orders.ts, which is what
// actually protects the data) and the Orders.phone field (collections/Orders.ts).
// Pure functions, no imports, safe in client and server code.
//
// Each validator returns an error message, or null when the value is acceptable.
// Messages never echo the value back (it is PII and these strings reach logs/UI).
//
// Deliberately NOT done, because the owner has not confirmed them: +92/0092 number
// normalisation, a landline allowlist, an operator-prefix allowlist, and a city list
// (ADR-018 rejected city tables — Pakistani addresses are free text). Tighten here,
// in one place, once decided.

/** Pakistani mobile number as customers write it: 03XXXXXXXXX (11 digits). */
export const PK_MOBILE = /^03[0-9]{9}$/
export const PHONE_MESSAGE = 'Enter a Pakistani mobile number: 11 digits starting with 03, e.g. 03001234567.'

export const MIN_ADDRESS = 10
const LETTER = /\p{L}/u
// Letters (any script, so Urdu names work), marks, spaces and . ' - only.
// U+200C/U+200D (ZWNJ/ZWJ) are allowed: Urdu orthography uses them inside names.
const NAME_CHARS = /^[\p{L}\p{M}\u200C\u200D .'-]+$/u
const PLACE_CHARS = /^[\p{L}\p{M}\u200C\u200D .'()/-]+$/u

export function validatePhone(value: unknown): string | null {
  return typeof value === 'string' && PK_MOBILE.test(value.trim()) ? null : PHONE_MESSAGE
}

export function validateName(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v.length < 2 || !NAME_CHARS.test(v) || !LETTER.test(v)) {
    return 'Please enter your full name using letters only.'
  }
  return null
}

export function validateAddress(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v.length < MIN_ADDRESS) {
    return `Please enter a complete delivery address (house/street, at least ${MIN_ADDRESS} characters).`
  }
  // A real address has a letter or a digit, not just punctuation.
  if (!/[\p{L}\p{N}]/u.test(v)) return 'Please enter a valid delivery address.'
  return null
}

export function validateCity(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v.length < 2 || !PLACE_CHARS.test(v) || !LETTER.test(v)) {
    return 'Please enter a valid city name (letters only).'
  }
  return null
}

/** Area/neighbourhood is optional; when given it must look like a place name. */
export function validateArea(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v === '') return null
  if (v.length < 2 || !/[\p{L}\p{N}]/u.test(v)) return 'Please enter a valid area, or leave it blank.'
  return null
}
