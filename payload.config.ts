import path from 'path'
import { fileURLToPath } from 'url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { PromoCards } from './collections/PromoCards'
import { Settings } from './globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Fail fast at runtime if the secret is missing in production: an empty secret
// would silently sign admin sessions with a guessable key. `next build` is exempt
// because it runs without runtime secrets (they are supplied at deploy time, M52).
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
if (process.env.NODE_ENV === 'production' && !isBuildPhase && !process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET must be set in production')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    // M95 (ADR-043): light only, with the storefront's colours and logo (app/(payload)/custom.css,
    // components/admin/*), and an Overview home built from real order and product data.
    theme: 'light',
    // M98: Payload's default is Gravatar, which showed a broken image (and sends a hash of the
    // admin's email to gravatar.com) wherever that host is unreachable. The built-in icon is local.
    avatar: 'default',
    meta: { titleSuffix: '- Admin' },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#default',
        Icon: '/components/admin/Logo#default',
      },
      beforeNavLinks: ['/components/admin/NavLinks#NavBrand', '/components/admin/NavLinks#OverviewLink'],
      afterNavLinks: ['/components/admin/NavLinks#ViewStoreLink'],
      views: {
        dashboard: { Component: '/components/admin/Dashboard#default' },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Categories, Products, Orders, PromoCards],
  globals: [Settings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // M100 (ADR-046): Vercel Blob media storage for the free test deployment only. Registered only
  // when BLOB_READ_WRITE_TOKEN is set (Vercel sets it when a Blob store is connected); without it
  // the local-volume storage of ADR-020 is used unchanged, in Docker development and production.
  // clientUploads sends the file from the browser straight to Blob, because a serverless function
  // cannot accept a large request body. alwaysInsertFields keeps the `media` columns (`prefix`,
  // `_objectKey`) identical whether or not the token is set, so one committed migration fits both.
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      alwaysInsertFields: true,
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true,
    }),
  ],
  // M52a: migrations are committed files in /migrations and run by the production
  // `migrate` service (ADR-032). prodMigrations is deliberately not set.
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, 'migrations'),
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
  }),
})
