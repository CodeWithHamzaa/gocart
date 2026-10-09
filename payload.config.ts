import path from 'path'
import { fileURLToPath } from 'url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
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
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Categories, Products, Orders],
  globals: [Settings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
  }),
})
