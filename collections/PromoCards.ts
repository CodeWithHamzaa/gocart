import type { CollectionConfig } from 'payload'

// M71 (ADR-039): admin-managed promo cards for the home page. Nothing is seeded: no card exists
// until an admin creates one, and the home section is hidden when none is active.

// Internal paths only: one leading "/", no "//", no "/\", no scheme, no ":". An external or
// scheme-relative link here would let an admin-controlled field send shoppers off-site.
// M75: whitespace and control characters are rejected too: the URL parser drops tab and newline, so
// "/\t/evil.com" would otherwise resolve to https://evil.com/.
export const validatePromoLink = (value: unknown): true | string => {
  if (typeof value !== 'string' || value.length === 0) return 'A link is required.'
  if (/[\s\u0000-\u001f\u007f]/.test(value)) {
    return 'The link must not contain spaces, tabs, line breaks or control characters.'
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || value.includes(':')) {
    return 'Use a path on this store that starts with a single "/", for example /category/electronics.'
  }
  return true
}

export const PromoCards: CollectionConfig = {
  slug: 'promoCards',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order', 'active'],
  },
  // Public readers only ever see active cards; an admin sees all of them.
  access: {
    read: ({ req: { user } }) => (user ? true : { active: { equals: true } }),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 80 },
    {
      name: 'eyebrow',
      type: 'text',
      maxLength: 40,
      admin: { description: 'Optional short line above the title.' },
    },
    {
      name: 'ctaText',
      type: 'text',
      required: true,
      maxLength: 30,
      admin: { description: 'The call to action, for example "Shop now".' },
    },
    {
      name: 'link',
      type: 'text',
      required: true,
      validate: validatePromoLink,
      admin: { description: 'A page on this store, for example /category/electronics.' },
    },
    {
      name: 'tone',
      type: 'select',
      required: true,
      defaultValue: 'lavender',
      options: [
        { label: 'Pink', value: 'pink' },
        { label: 'Blue', value: 'blue' },
        { label: 'Lavender', value: 'lavender' },
        { label: 'Mint', value: 'mint' },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional picture shown in the circle.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Lower numbers show first.' },
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
