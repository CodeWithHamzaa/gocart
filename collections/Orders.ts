import type { CollectionConfig } from 'payload'

// M11: orders for guest checkout — embedded customer/address fields instead of a
// User relation (ADR-021), plus a line-items array instead of a join table (ADR-005).
// M12: COD-only paymentMethod (extensible enum, ADR-004) and the decided order
// status set (ADR-019).
//
// M13 adds the access rules below: public-create (guest checkout), admin-read.
// NOTE — this leaves no public read path for guest order lookup by reference,
// which readiness finding C7 (docs/PHASE_1_READINESS_REPORT.md) already flags as
// conflicting with M36's requirement. No reconciling mechanism (scoped lookup
// endpoint, field-level access, signed token) is designed anywhere in the docs.
// M13's own testing bar is exactly "anonymous GET /api/orders fails," so that is
// what's implemented here; C7 is a pre-existing, still-open gap to resolve before
// M36, not something invented here.

function generateOrderNumber(): string {
  const timestampPart = Date.now().toString(36).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `GC-${timestampPart}-${randomPart}`
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'name', 'orderTotal', 'status', 'isPaid', 'createdAt'],
  },
  access: {
    create: () => true,
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
              "Price snapshot at order time — independent of the live Products.price, so a later price edit never re-prices this order.",
          },
        },
      ],
    },
    {
      name: 'orderTotal',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'shippingCost',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      admin: {
        description: 'Resolved flat rate or 0 if the free-shipping threshold was met (ADR-018).',
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
