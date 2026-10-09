import { randomBytes } from 'crypto'
import type { CollectionConfig } from 'payload'

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
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      index: true,
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
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          hasMany: false,
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          admin: {
            description:
              "Price snapshot at order time — independent of the live Products.price, so a later price edit never re-prices this order. Editing it does not recalculate the order total.",
          },
        },
      ],
    },
    {
      name: 'orderTotal',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description:
          'Snapshot taken when the order was placed (ADR-018). Editing it does NOT recalculate any other field.',
      },
    },
    {
      name: 'shippingCost',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      admin: {
        description:
          'Snapshot taken when the order was placed (ADR-018). Editing it does NOT recalculate any other field.',
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
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PLACED',
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
