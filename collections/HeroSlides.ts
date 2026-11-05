import type { CollectionConfig } from 'payload'
import { validatePromoLink } from './PromoCards'

// M110 (ADR-050): admin-managed slides for the home banner. Same pattern as promo cards (ADR-039):
// nothing is seeded; public readers see only active slides; while no slide is active the home page
// keeps its automatic slides (lib/hero-slides.ts), so the banner is never empty. The button link is
// validated like a promo card's: an internal path only (an admin field must not send shoppers off-site).
export const HeroSlides: CollectionConfig = {
  slug: 'heroSlides',
  labels: { singular: 'Banner slide', plural: 'Banner slides' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order', 'active'],
    description:
      'The big banner on the home page. While at least one slide is active, only these slides show; with none active, the automatic slides (deals, new arrivals, delivery) show instead.',
  },
  access: {
    read: ({ req: { user } }) => (user ? true : { active: { equals: true } }),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 80, admin: { description: 'The large heading.' } },
    {
      name: 'text',
      type: 'textarea',
      required: true,
      maxLength: 200,
      admin: { description: 'One or two sentences under the heading.' },
    },
    { name: 'badge', type: 'text', required: true, maxLength: 30, admin: { description: 'The small label above the heading, for example "New arrivals".' } },
    {
      name: 'badgeTone',
      type: 'select',
      required: true,
      defaultValue: 'ink',
      options: [
        { label: 'Dark', value: 'ink' },
        { label: 'Pink (sale)', value: 'sale' },
      ],
    },
    {
      name: 'tone',
      type: 'select',
      required: true,
      defaultValue: 'green',
      admin: { description: 'The background colour of the slide.' },
      options: [
        { label: 'Soft green', value: 'green' },
        { label: 'Soft blue', value: 'blue' },
        { label: 'Soft grey', value: 'grey' },
      ],
    },
    { name: 'ctaText', type: 'text', required: true, maxLength: 30, admin: { description: 'The button text, for example "Shop now".' } },
    {
      name: 'link',
      type: 'text',
      required: true,
      validate: validatePromoLink,
      admin: { description: 'A page on this store, for example /shop or /category/watches.' },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      maxRows: 2,
      admin: { description: 'Up to two pictures (square works best). Fill in each picture\'s description (alt text) in Media.' },
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower numbers show first.' } },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
