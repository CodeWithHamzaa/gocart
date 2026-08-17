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
  ],
}
