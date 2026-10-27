import type { CollectionConfig } from 'payload'

// M10: real product catalog storage, using the inherited Prisma schema's field shape
// as reference (name, description, mrp, price, images, category, inStock — see
// docs/DECISIONS.md ADR-003), with relations to Categories and Media.
// M13 adds the access rules below.
export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'price', 'inStock'],
  },
  // M13: public-read/admin-write — the storefront catalog is public, changes are not.
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'mrp',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Original list price, shown struck through when higher than price.',
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Actual selling price.',
      },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      required: true,
    },
    {
      // A product belongs to exactly one category, the most specific one that
      // applies. Parent category pages roll up their children's products rather
      // than admins double-filing under both — per ADR-013.
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      required: true,
    },
    {
      name: 'inStock',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      // Added at M23 (ADR-022). The home page's "Best Selling" section has no
      // sales data to rank by — Reviews are out of scope (ADR-016) and nothing
      // aggregates Orders — so the section is admin-curated rather than
      // computed from a metric that does not exist.
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Show this product in the home page "Best Selling" section. Curated by the admin — there is no sales-based ranking in v1.',
      },
    },
    {
      // M70 (ADR-039): an optional admin label for the status pill on cards and the product page.
      // Precedence is decided in lib/product-badges.ts: Out of stock > label > Featured.
      name: 'label',
      type: 'select',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Limited edition', value: 'limited' },
        { label: 'Sale', value: 'sale' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Optional badge shown on the product card and page. Leave empty for none.',
      },
    },
    {
      // M91 (ADR-041): an optional end time for a time-limited deal. The home page's "Deals of the day"
      // lists in-stock products whose deal has not ended and that really are discounted (mrp > price),
      // and counts down to the earliest end. Empty means no deal; the product is unaffected otherwise.
      name: 'dealEndsAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description:
          'Optional. When set to a future time, the product appears in "Deals of the day" until then (it must also have an MRP above its price). Leave empty for no deal.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
}
