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
    // M124 (ADR-054): one generated size per storefront placement. Declaring `imageSizes` is what makes the
    // admin offer the crop tool on every upload (`crop` defaults to on). A crop made in the admin is applied
    // first (it replaces the stored original), and the sizes below are generated from the cropped image.
    // Without a crop, `position: 'attention'` (sharp's content-aware strategy: brightness detail, colour
    // saturation, skin tones) picks the framing, so an untouched upload is already usable.
    // `focalPoint: false` is deliberate: Payload gives every new upload a centre focal point (50, 50), and
    // with a focal point set it ignores `position` and crops around that point, so the automatic framing
    // above would never run. The crop tool does the manual correction instead.
    focalPoint: false,
    // An image smaller than a size gets no variant for it (Payload default); the storefront then falls
    // back to the original file (see lib/media.ts).
    imageSizes: [
      // Product card and product page (1:1).
      { name: 'product', width: 1000, height: 1000, fit: 'cover', position: 'attention', formatOptions: { format: 'webp', options: { quality: 80 } } },
      // Category tile (4:3).
      { name: 'category', width: 800, height: 600, fit: 'cover', position: 'attention', formatOptions: { format: 'webp', options: { quality: 80 } } },
      // Home hero slide (16:10; the slider shows it square from the md breakpoint up). Promo cards have no size:
      // they show the whole image (object-contain), so a crop would only remove part of it.
      { name: 'hero', width: 1600, height: 1000, fit: 'cover', position: 'attention', formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
    // The list view shows the product framing, the one an admin checks most.
    adminThumbnail: 'product',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
