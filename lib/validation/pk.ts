// M56: Pakistani guest-checkout validation, one source of truth for the checkout form
// (components/AddressModal.jsx), the server (lib/payload/orders.ts, which is what
// actually protects the data) and the Orders.phone field (collections/Orders.ts).
// Pure functions, no imports, safe in client and server code.
//
// Each validator returns an error message, or null when the value is acceptable.
// Messages never echo the value back (it is PII and these strings reach logs/UI).
//
// Deliberately NOT done: a landline allowlist, an operator-prefix allowlist, 0092 numbers,
// and a city list (ADR-018 rejected city tables — Pakistani addresses are free text).
// Rules are in ADR-029; change them here, in one place.

/** Pakistani mobile number in its stored form: 03XXXXXXXXX (11 digits). */
export const PK_MOBILE = /^03[0-9]{9}$/
/** International form a customer may type instead: +923XXXXXXXXX. */
const PK_MOBILE_INTL = /^\+923[0-9]{9}$/
export const PHONE_MESSAGE =
  'Enter a Pakistani mobile number, like 03001234567 or +923001234567.'

/**
 * The one stored form of a phone number. Trims, and rewrites +923XXXXXXXXX as
 * 03XXXXXXXXX so the order's phone — half of the guest lookup key (ADR-024) — is the same
 * however the customer typed it. Anything else is returned trimmed and otherwise untouched
 * (validatePhone then rejects it). Non-strings come back as an empty string.
 */
export function normalizePhone(value: unknown): string {
  const v = typeof value === 'string' ? value.trim() : ''
  return PK_MOBILE_INTL.test(v) ? `0${v.slice(3)}` : v
}

export const MIN_ADDRESS = 10
const LETTER = /\p{L}/u
// Names and cities: letters (any script, so Urdu works), combining marks, spaces and the
// usual punctuation — . , ' ’ - ( ) / — and nothing else (no digits, no < > & ; = etc).
// U+200C/U+200D (ZWNJ/ZWJ) are allowed: Urdu orthography uses them inside names.
const TEXT_CHARS = /^[\p{L}\p{M}\u200C\u200D .,'’()/-]+$/u
const NAME_CHARS = TEXT_CHARS
const PLACE_CHARS = TEXT_CHARS

export function validatePhone(value: unknown): string | null {
  return PK_MOBILE.test(normalizePhone(value)) ? null : PHONE_MESSAGE
}

export function validateName(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v.length < 2 || !NAME_CHARS.test(v) || !LETTER.test(v)) {
    return "Please enter your full name (letters, spaces and . , ' - only)."
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
    return "Please enter a valid city name (letters, spaces and . , ' - ( ) / only)."
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
