import type { GlobalConfig } from 'payload'

// M13a: single admin-editable store configuration, closing readiness risk R6.
// Read is public (the storefront needs shipping/contact info); write is admin-only.
//
// Currency-format fields (D7 in docs/PHASE_1_READINESS_REPORT.md) are deliberately
// NOT included here — that convention (e.g. "Rs. 1,500" vs "₨1,500") is still an open
// stakeholder question in docs/PROJECT_SPEC.md, unresolved by any ADR. Adding a field
// now would mean inventing an answer to a decision this milestone group was not asked
// to make. M55 is the milestone that resolves it and should add the field then.
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
      defaultValue: 'GoCart',
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
