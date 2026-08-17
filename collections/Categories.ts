import type { CollectionConfig } from 'payload'

// M9: real, admin-editable category entity supporting the two-level hierarchy and
// stable slugs the storefront category routes (M27a, M27b) require. Field list and
// constraints are specified in full in docs/CATEGORY_REQUIREMENTS.md — nothing here
// is speculative. M13 adds the access rules below.

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'parent', 'displayOrder'],
  },
  // M13: public-read/admin-write.
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'Generated from the title on create, then stable — never auto-regenerated on a title edit.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      validate: async (value, { req, id }) => {
        if (!value) return true

        // Non-polymorphic single relationship: the value is the raw id at
        // submit time, not a populated document.
        const parentId = typeof value === 'object' && value !== null ? value.value : value

        if (parentId === id) {
          return 'A category cannot be its own parent.'
        }

        const parentDoc = await req.payload.findByID({
          collection: 'categories',
          id: parentId as string | number,
          depth: 0,
        })

        if (parentDoc?.parent) {
          return 'A category cannot be nested more than two levels deep (parent already has a parent).'
        }

        return true
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
        },
        {
          name: 'metaDescription',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) {
          data.slug = slugify(data.title)
        }
        return data
      },
    ],
  },
}
