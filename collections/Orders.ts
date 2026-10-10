import { randomBytes } from 'crypto'
import type { CollectionConfig, TextFieldSingleValidation } from 'payload'
import { validatePhone } from '../lib/validation/pk'

// M11: orders for guest checkout — embedded customer/address fields instead of a
// User relation (ADR-021), plus a line-items array instead of a join table (ADR-005).
// M12: COD-only paymentMethod (extensible enum, ADR-004) and the decided order
// status set (ADR-019).
//
// M13 added the access rules below. M33 (ADR-026) closed public create: the REST and
// GraphQL create endpoints accepted client-controlled prices and status, so every
// operation is now admin-only. Guest orders are created through createOrder() in
// lib/payload/orders.ts (called from a server action), which validates and derives
// all prices server-side and writes with overrideAccess. Guest lookup by reference
// is M36's dedicated (orderNumber, phone) endpoint (ADR-024), not collection access.

// M56: see the comment on the `phone` field below.
const validatePhoneField: TextFieldSingleValidation = (value, { operation, previousValue }) => {
  if (typeof value !== 'string' || value.trim() === '') return 'This field is required.'
  if (operation === 'update' && value === previousValue) return true
  // Stored as typed, and the guest lookup matches exactly: no surrounding whitespace.
  if (value !== value.trim()) return 'Remove spaces before or after the phone number.'
  return validatePhone(value) ?? true
}

function generateOrderNumber(): string {
  const timestampPart = Date.now().toString(36).toUpperCase()
  // Cryptographically random suffix — order numbers are half of the guest lookup
  // key (ADR-024), so they must not be predictable from the timestamp.
  const randomPart = randomBytes(4).toString('hex').toUpperCase()
  return `GC-${timestampPart}-${randomPart}`
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'name', 'phone', 'city', 'orderTotal', 'status', 'isPaid', 'createdAt'],
    listSearchableFields: ['orderNumber', 'name', 'phone', 'city'],
  },
  defaultSort: '-createdAt',
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    // ADR-028: orderNumber and the price-snapshot fields (items[].unitPrice, orderTotal,
    // shippingCost) are set only at creation; field-level update access is closed on
    // every transport. Collection-level access is unchanged.
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      index: true,
      access: { update: () => false },
      admin: {
        readOnly: true,
        description: 'Human-referenceable order reference, distinct from the internal id.',
      },
    },
    // Guest customer/address — embedded, not a relation to a Customers collection (ADR-021).
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      // M56: Pakistani mobile format (lib/validation/pk.ts). Enforced on create and
      // whenever the value changes; an unchanged phone on an existing order is not
      // re-checked, so orders stored before M56 can still be saved (e.g. a status
      // change). Guest orders are validated by createOrder; this covers admin entry.
      validate: validatePhoneField,
    },
    {
      name: 'address',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'area',
      type: 'text',
    },
    // Line items — array instead of a separate join table (ADR-005).
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      // ADR-028: the sub-field locks below stop edits to existing rows, but not removing,
      // adding or reordering rows (QA showed a PATCH could drop a row while orderTotal
      // stayed put). Locking the array itself closes that; rows exist only from creation.
      access: { update: () => false },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          hasMany: false,
          required: true,
          access: { update: () => false },
          admin: {
            description:
              'Cannot be changed after the order is created (ADR-028); to change the items, cancel the order and create a replacement.',
          },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          access: { update: () => false },
          admin: {
            description:
              'Cannot be changed after the order is created (ADR-028) — orderTotal was computed from it; to change the items, cancel the order and create a replacement.',
          },
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          access: { update: () => false },
          admin: {
            description:
              "Price snapshot at order time — independent of the live Products.price, so a later price edit never re-prices this order. Cannot be edited after the order is created (ADR-028); to change an amount, cancel the order and create a replacement.",
          },
        },
      ],
    },
    {
      name: 'orderTotal',
      type: 'number',
      required: true,
      min: 0,
      access: { update: () => false },
      admin: {
        description:
          'Snapshot taken when the order was placed (ADR-018). Cannot be edited after the order is created (ADR-028); to change an amount, cancel the order and create a replacement.',
      },
    },
    {
      name: 'shippingCost',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      access: { update: () => false },
      admin: {
        description:
          'Resolved flat rate, or 0 if the free-shipping threshold was met (ADR-018). Snapshot taken when the order was placed. Cannot be edited after the order is created (ADR-028); to change an amount, cancel the order and create a replacement.',
      },
    },
    {
      name: 'discountAmount',
      type: 'number',
      min: 0,
      admin: {
        description:
          'Reserved for a future coupon engine (ADR-017) — no coupon UI exists in v1.',
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      defaultValue: 'COD',
      // Extensible enum (ADR-004) — only COD is selectable today; a gateway can be
      // added later as a new option here. Note: Payload materializes `select` as a
      // native Postgres ENUM, so adding a value is a trivial `ALTER TYPE ... ADD
      // VALUE`, not literally zero migration — still no data transformation/backfill.
      options: [{ label: 'Cash on Delivery', value: 'COD' }],
    },
    {
      name: 'isPaid',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Cash on Delivery: tick this when the cash has been collected (it is NOT set automatically when the order is marked Delivered).',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PLACED',
      admin: {
        position: 'sidebar',
        description:
          'Move the order forward as it is fulfilled. Any status can be set from any other (no state machine, ADR-019). The customer sees this status when they look up their order.',
      },
      // Flat, admin-selected enum — no transition-validation state machine in v1 (ADR-019).
      options: [
        { label: 'Placed', value: 'PLACED' },
        { label: 'Confirmed', value: 'CONFIRMED' },
        { label: 'Processing', value: 'PROCESSING' },
        { label: 'Shipped', value: 'SHIPPED' },
        { label: 'Delivered', value: 'DELIVERED' },
        { label: 'Cancelled', value: 'CANCELLED' },
        { label: 'Returned', value: 'RETURNED' },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (data && operation === 'create' && !data.orderNumber) {
          data.orderNumber = generateOrderNumber()
        }
        return data
      },
    ],
  },
}
