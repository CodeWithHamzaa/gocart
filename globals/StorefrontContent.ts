import type { GlobalConfig } from 'payload'

// M110 (ADR-050): store text an admin can edit without a deploy: the announcement bar, the home page
// section headings and the footer line. Read is public (the storefront shows it); write is admin-only.
// Every field is optional: an empty field falls back to the wording the storefront had before, so a
// fresh database and a half-filled form both render a complete page (lib/payload/storefront-content.ts).
// Links are not editable here (the "View all" links keep pointing at /shop); only words are.
export const StorefrontContent: GlobalConfig = {
  slug: 'storefrontContent',
  label: 'Storefront content',
  access: {
    read: () => true,
    update: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Announcement bar (the strip above the menu)',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'announcementMessages',
          type: 'array',
          label: 'Messages',
          maxRows: 6,
          admin: {
            description:
              'Shown one at a time, sliding in from the left. Leave empty to show "Cash on delivery across Pakistan". Keep each short (about 60 characters) so it fits on a phone.',
          },
          fields: [{ name: 'text', type: 'text', required: true, maxLength: 120 }],
        },
        {
          name: 'showDeliveryMessage',
          type: 'checkbox',
          defaultValue: true,
          label: 'Also show the delivery message',
          admin: {
            description:
              'Adds "Delivery Rs. 200 · free on orders of Rs. 3,000 or more" as the last message. It is built from Delivery fee and Free delivery threshold under Settings, so it can never disagree with checkout.',
          },
        },
        {
          name: 'showTrackOrderLink',
          type: 'checkbox',
          defaultValue: true,
          label: 'Show the "Track order" button in the header',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Home page: Featured section',
      admin: { initCollapsed: true },
      fields: [
        { name: 'featuredTitle', type: 'text', maxLength: 60, admin: { description: 'Default: Featured' } },
        {
          name: 'featuredDescription',
          type: 'text',
          maxLength: 140,
          admin: { description: 'Default: Picked by the store, across every category.' },
        },
        { name: 'featuredLinkLabel', type: 'text', maxLength: 30, admin: { description: 'The "view everything" link. Default: View all' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Home page: New arrivals section',
      admin: { initCollapsed: true },
      fields: [
        { name: 'newArrivalsTitle', type: 'text', maxLength: 60, admin: { description: 'Default: New arrivals' } },
        {
          name: 'newArrivalsDescription',
          type: 'text',
          maxLength: 140,
          admin: { description: 'Default: The latest additions to the store.' },
        },
        { name: 'newArrivalsLinkLabel', type: 'text', maxLength: 30, admin: { description: 'Default: View all' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Footer',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'footerTagline',
          type: 'textarea',
          maxLength: 200,
          admin: {
            description:
              'The sentence under the logo. Default: Electronics, fashion, home and beauty, delivered across Pakistan. Pay in cash when your order arrives. Phone, e-mail and address are under Settings.',
          },
        },
      ],
    },
  ],
}
