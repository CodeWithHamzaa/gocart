import type { CollectionConfig } from 'payload'

// M9: real, admin-editable category entity supporting the two-level hierarchy and
// stable slugs the storefront category routes (M27a, M27b) require. Field list and
// constraints are specified in full in docs/CATEGORY_REQUIREMENTS.md — nothing here
// is speculative. M13 adds the access rules below.
// M102 (ADR-048): categories are flat. The owner removed sub-categories on 2026-11-01, so the `parent`
// field (and its two-level validation) is gone; migration 20261101_*_flat_categories drops the column.

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
    defaultColumns: ['title', 'slug', 'displayOrder'],
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
