import path from 'path'
import { fileURLToPath } from 'url'
import type { CollectionConfig } from 'payload'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// M8: real file upload/storage for product images, replacing the client-only
// URL.createObjectURL() previews from the legacy add-product/create-store forms.
// Local-storage adapter, backed by a Docker volume — not S3-compatible object
// storage, per ADR-020. M13 adds the access rules below.
export const Media: CollectionConfig = {
  slug: 'media',
  // M13: public-read/admin-write — product images must be publicly viewable.
  // M51: this collection is public-read and is served through the image optimizer: never store private files in it.
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  upload: {
    staticDir: path.resolve(dirname, '../media'),
    // ADR-036 (B1 interim mitigation): only the formats the storefront needs. `image/*` also
    // admitted AVIF, SVG and HEIC; AVIF is what GHSA-2xp9-vwfh-vxw4 (Next image optimizer RCE) needs.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
