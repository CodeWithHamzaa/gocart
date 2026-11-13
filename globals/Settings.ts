import type { GlobalConfig } from 'payload'

// M13a: single admin-editable store configuration, closing readiness risk R6.
// Read is public (the storefront needs shipping/contact info); write is admin-only.
//
// There is deliberately no currency-format field: the PKR display format is fixed in
// code (lib/currency.ts, M55, ADR-029), not admin-configurable.
export const Settings: GlobalConfig = {
  slug: 'settings',
  access: {
    read: () => true,
    update: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'storeName',
      type: 'text',
      required: true,
      // Milestone 122 (ADR-053): the brand is Mirza Cart (it was Mirza, ADR-047). The migration changes the column
      // default and renames a stored name only when it is exactly the old default, "Mirza".
      defaultValue: 'Mirza Cart',
    },
    {
      name: 'contactPhone',
      type: 'text',
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'contactAddress',
      type: 'textarea',
    },
    {
      // ADR-018: flat delivery fee, admin-configurable, read by M33/M34 at
      // order-creation time only and then snapshotted onto the order.
      name: 'shippingFlatRate',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 200,
    },
    {
      // ADR-018: waived above this order subtotal.
      name: 'freeShippingThreshold',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 3000,
    },
  ],
}
