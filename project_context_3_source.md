# GoCart Pakistan — Project Context, Part 3 of 3: Source Code

> **This is part 3 of a 3-part project dump.** Upload all three for full context.
>
> | Part | Contents |
> |---|---|
> | **1 — Overview & Structure** | Orientation brief (what the project is, its current state, constraints, known issues) + full directory tree |
> | **2 — Documentation** | All 37 Markdown documents: spec, architecture, 25 ADRs, the 68-milestone roadmap, status, changelog, readiness reports, AI-team process docs |
> | **3 — Source Code** *(this file)* | All 65 code and config files |
>
> **Read Part 1 first** — it states the project's actual current state and flags three places
> where the checked-in documentation contradicts the code.

### Essential context, if you only have this file

**GoCart** is an open-source multi-vendor Next.js marketplace being transformed into a
**production-ready, single-store, Cash-on-Delivery ecommerce platform for Pakistan**, on
**Payload CMS v3** (embedded in the Next.js app) + **PostgreSQL**.

- Work is tracked as **68 numbered milestones** in `docs/MIGRATION_PLAN.md`. **36 are done;
  `M33` is next.** Milestone IDs are the only unit of work; execution order comes from each
  milestone's stated dependencies, not from ascending ID.
- **Hard constraints:** COD only · guest checkout mandatory · admin-only auth · single store
  (no vendors) · PostgreSQL only · SEO-first and mobile-first · everything in Docker · no AI
  dependency in the shipped product.
- **⚠️ `CLAUDE.md` is stale** — it claims `M1`–`M28` are done and that `/shop` search is an
  in-memory filter. `M29`–`M32` shipped on 2026-08-26 and search is a real Payload query.
  `docs/TASKS.md` and `docs/CHANGELOG.md` are the reliable status sources.
- **Biggest functional gap:** "Place Order" writes nothing to the database — it only
  navigates. That is `M33`.
- **Verification gaps:** no test framework exists, `npm run lint` is broken (no ESLint
  config), and `docker build` has never completed.

---

## 3. Source Code (65 files)

Full content of every code and config file. Excludes `.env` (contains a real `PAYLOAD_SECRET` and database URI — `.env.example` is included instead), `package-lock.json`, build caches, and binary assets.

### Root

#### `.dockerignore`

```gitignore
node_modules
.next
.git
.env
.env.*
!.env.example
npm-debug.log*
.DS_Store
*.tsbuildinfo

# AI engineering team — development-time tooling, never part of a runtime image.
# See .claude/docs/NO_PRODUCTION_AI.md
.claude
```

#### `.env.example`

```bash
# Currency Symbol — full PKR formatting (comma grouping, decimal handling)
# is a separate decision at M55; this only fixes the displayed symbol.
NEXT_PUBLIC_CURRENCY_SYMBOL = 'Rs. '

# PostgreSQL connection string, read by Payload's Postgres adapter (ADR-010).
# Must match the credentials the `postgres` service in docker-compose.yml starts with.
DATABASE_URI=postgres://gocart:gocart@localhost:5432/gocart

# Secret Payload uses to sign auth tokens/cookies. Generate a real random value for
# every environment (e.g. `openssl rand -base64 32`) — never reuse this placeholder.
PAYLOAD_SECRET=changeme-generate-a-real-secret

# Optional overrides for the docker-compose `postgres` service. The values below are
# the defaults baked into docker-compose.yml; uncomment only to change them, and keep
# DATABASE_URI above in sync when you do.
# POSTGRES_USER=gocart
# POSTGRES_PASSWORD=gocart
# POSTGRES_DB=gocart
# POSTGRES_PORT=5432
```

#### `.gitignore`

```gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env

# vercel
.vercel

# typescript
*.tsbuildinfo

# payload (generated; regenerated from payload.config.ts, not hand-authored)
/payload-types.ts

# payload local media uploads (M8) — a Docker volume in prod, not committed content
/media

# AI engineering team (development-time only) — shared config IS committed;
# per-developer overrides are not. See .claude/docs/NO_PRODUCTION_AI.md
.claude/settings.local.json
```

#### `docker-compose.yml`

```yaml
# Local development services for GoCart Pakistan.
#
# M1 provisions PostgreSQL only — the datastore every later milestone builds against
# (ADR-002). The application container arrives at M5/M50; until then the Next.js app
# runs on the host and reaches this database over the published port below.
#
# Start it with:  docker compose up -d postgres
name: gocart

services:
  postgres:
    image: postgres:17-alpine
    container_name: gocart-postgres
    restart: unless-stopped
    environment:
      # Local development credentials. Production secrets are handled separately (M52).
      POSTGRES_USER: ${POSTGRES_USER:-gocart}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-gocart}
      POSTGRES_DB: ${POSTGRES_DB:-gocart}
    ports:
      # Bound to loopback so the development database is never exposed on the network.
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test:
        ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-gocart} -d ${POSTGRES_DB:-gocart}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres-data:
```

#### `Dockerfile`

```dockerfile
# Development image for the Next.js + Payload app (M5). Matches the Postgres
# container from M1 — see docker-compose.yml. A production stage is added at M49.

FROM node:22-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

#### `next-env.d.ts`

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

#### `next.config.mjs`

```javascript
import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        unoptimized: true
    }
};

export default withPayload(nextConfig)
```

#### `package.json`

```json
{
  "name": "gocart",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "seed": "tsx scripts/seed.ts"
  },
  "dependencies": {
    "@payloadcms/db-postgres": "3.88.0",
    "@payloadcms/next": "3.88.0",
    "@payloadcms/richtext-lexical": "3.88.0",
    "@reduxjs/toolkit": "^2.8.2",
    "date-fns": "^4.1.0",
    "graphql": "^16.14.2",
    "lucide-react": "^0.525.0",
    "next": "15.3.9",
    "payload": "3.88.0",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "react-hot-toast": "^2.5.2",
    "react-redux": "^9.2.0",
    "recharts": "^3.1.2",
    "sharp": "^0.35.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^22.20.1",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "tailwindcss": "^4",
    "typescript": "^5.9.3"
  }
}
```

#### `payload-types.ts`

> Auto-generated by `payload generate:types` (git-ignored). Included as the clearest statement of the data model.

```typescript
/* tslint:disable */
/* eslint-disable */
/**
 * This file was automatically generated by Payload.
 * DO NOT MODIFY IT BY HAND. Instead, modify your source Payload config,
 * and re-run `payload generate:types` to regenerate this file.
 */

/**
 * Supported timezones in IANA format.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "supportedTimezones".
 */
export type SupportedTimezones =
  | 'Pacific/Midway'
  | 'Pacific/Niue'
  | 'Pacific/Honolulu'
  | 'Pacific/Rarotonga'
  | 'America/Anchorage'
  | 'Pacific/Gambier'
  | 'America/Los_Angeles'
  | 'America/Tijuana'
  | 'America/Denver'
  | 'America/Phoenix'
  | 'America/Chicago'
  | 'America/Guatemala'
  | 'America/New_York'
  | 'America/Bogota'
  | 'America/Caracas'
  | 'America/Santiago'
  | 'America/Buenos_Aires'
  | 'America/Sao_Paulo'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/Azores'
  | 'Atlantic/Cape_Verde'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Africa/Lagos'
  | 'Europe/Athens'
  | 'Africa/Cairo'
  | 'Europe/Moscow'
  | 'Asia/Riyadh'
  | 'Asia/Dubai'
  | 'Asia/Baku'
  | 'Asia/Karachi'
  | 'Asia/Tashkent'
  | 'Asia/Calcutta'
  | 'Asia/Dhaka'
  | 'Asia/Almaty'
  | 'Asia/Jakarta'
  | 'Asia/Bangkok'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'Asia/Seoul'
  | 'Australia/Brisbane'
  | 'Australia/Sydney'
  | 'Pacific/Guam'
  | 'Pacific/Noumea'
  | 'Pacific/Auckland'
  | 'Pacific/Fiji';

export interface Config {
  auth: {
    users: UserAuthOperations;
  };
  blocks: {};
  collections: {
    users: User;
    media: Media;
    categories: Category;
    products: Product;
    orders: Order;
    'payload-kv': PayloadKv;
    'payload-locked-documents': PayloadLockedDocument;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  collectionsJoins: {};
  collectionsSelect: {
    users: UsersSelect<false> | UsersSelect<true>;
    media: MediaSelect<false> | MediaSelect<true>;
    categories: CategoriesSelect<false> | CategoriesSelect<true>;
    products: ProductsSelect<false> | ProductsSelect<true>;
    orders: OrdersSelect<false> | OrdersSelect<true>;
    'payload-kv': PayloadKvSelect<false> | PayloadKvSelect<true>;
    'payload-locked-documents': PayloadLockedDocumentsSelect<false> | PayloadLockedDocumentsSelect<true>;
    'payload-preferences': PayloadPreferencesSelect<false> | PayloadPreferencesSelect<true>;
    'payload-migrations': PayloadMigrationsSelect<false> | PayloadMigrationsSelect<true>;
  };
  db: {
    defaultIDType: number;
  };
  fallbackLocale: null;
  globals: {
    settings: Setting;
  };
  globalsSelect: {
    settings: SettingsSelect<false> | SettingsSelect<true>;
  };
  locale: null;
  widgets: {
    collections: CollectionsWidget;
  };
  user: User;
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface UserAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users".
 */
export interface User {
  id: number;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  sessions?:
    | {
        id: string;
        createdAt?: string | null;
        expiresAt: string;
      }[]
    | null;
  password?: string | null;
  collection: 'users';
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media".
 */
export interface Media {
  id: number;
  alt?: string | null;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "categories".
 */
export interface Category {
  id: number;
  title: string;
  /**
   * Generated from the title on create, then stable — never auto-regenerated on a title edit.
   */
  slug: string;
  parent?: (number | null) | Category;
  description?: string | null;
  image?: (number | null) | Media;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
  };
  displayOrder?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "products".
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  /**
   * Original list price, shown struck through when higher than price.
   */
  mrp: number;
  /**
   * Actual selling price.
   */
  price: number;
  images: (number | Media)[];
  category: number | Category;
  inStock?: boolean | null;
  /**
   * Show this product in the home page "Best Selling" section. Curated by the admin — there is no sales-based ranking in v1.
   */
  isFeatured?: boolean | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "orders".
 */
export interface Order {
  id: number;
  /**
   * Human-referenceable order reference, distinct from the internal id.
   */
  orderNumber?: string | null;
  name: string;
  phone: string;
  address: string;
  city: string;
  area?: string | null;
  items: {
    product: number | Product;
    quantity: number;
    /**
     * Price snapshot at order time — independent of the live Products.price, so a later price edit never re-prices this order.
     */
    unitPrice: number;
    id?: string | null;
  }[];
  orderTotal: number;
  /**
   * Resolved flat rate or 0 if the free-shipping threshold was met (ADR-018).
   */
  shippingCost: number;
  /**
   * Reserved for a future coupon engine (ADR-017) — no coupon UI exists in v1.
   */
  discountAmount?: number | null;
  paymentMethod: 'COD';
  isPaid?: boolean | null;
  status: 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-kv".
 */
export interface PayloadKv {
  id: number;
  key: string;
  data:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents".
 */
export interface PayloadLockedDocument {
  id: number;
  document?:
    | ({
        relationTo: 'users';
        value: number | User;
      } | null)
    | ({
        relationTo: 'media';
        value: number | Media;
      } | null)
    | ({
        relationTo: 'categories';
        value: number | Category;
      } | null)
    | ({
        relationTo: 'products';
        value: number | Product;
      } | null)
    | ({
        relationTo: 'orders';
        value: number | Order;
      } | null);
  globalSlug?: string | null;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences".
 */
export interface PayloadPreference {
  id: number;
  user: {
    relationTo: 'users';
    value: number | User;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations".
 */
export interface PayloadMigration {
  id: number;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users_select".
 */
export interface UsersSelect<T extends boolean = true> {
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  loginAttempts?: T;
  lockUntil?: T;
  sessions?:
    | T
    | {
        id?: T;
        createdAt?: T;
        expiresAt?: T;
      };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media_select".
 */
export interface MediaSelect<T extends boolean = true> {
  alt?: T;
  updatedAt?: T;
  createdAt?: T;
  url?: T;
  thumbnailURL?: T;
  filename?: T;
  mimeType?: T;
  filesize?: T;
  width?: T;
  height?: T;
  focalX?: T;
  focalY?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "categories_select".
 */
export interface CategoriesSelect<T extends boolean = true> {
  title?: T;
  slug?: T;
  parent?: T;
  description?: T;
  image?: T;
  seo?:
    | T
    | {
        metaTitle?: T;
        metaDescription?: T;
      };
  displayOrder?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "products_select".
 */
export interface ProductsSelect<T extends boolean = true> {
  name?: T;
  description?: T;
  mrp?: T;
  price?: T;
  images?: T;
  category?: T;
  inStock?: T;
  isFeatured?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "orders_select".
 */
export interface OrdersSelect<T extends boolean = true> {
  orderNumber?: T;
  name?: T;
  phone?: T;
  address?: T;
  city?: T;
  area?: T;
  items?:
    | T
    | {
        product?: T;
        quantity?: T;
        unitPrice?: T;
        id?: T;
      };
  orderTotal?: T;
  shippingCost?: T;
  discountAmount?: T;
  paymentMethod?: T;
  isPaid?: T;
  status?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-kv_select".
 */
export interface PayloadKvSelect<T extends boolean = true> {
  key?: T;
  data?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents_select".
 */
export interface PayloadLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences_select".
 */
export interface PayloadPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations_select".
 */
export interface PayloadMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "settings".
 */
export interface Setting {
  id: number;
  storeName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  updatedAt?: string | null;
  createdAt?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "settings_select".
 */
export interface SettingsSelect<T extends boolean = true> {
  storeName?: T;
  contactPhone?: T;
  contactEmail?: T;
  contactAddress?: T;
  shippingFlatRate?: T;
  freeShippingThreshold?: T;
  updatedAt?: T;
  createdAt?: T;
  globalType?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "collections_widget".
 */
export interface CollectionsWidget {
  data?: {
    [k: string]: unknown;
  };
  width: 'full';
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "auth".
 */
export interface Auth {
  [k: string]: unknown;
}


declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
```

#### `payload.config.ts`

```typescript
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
```

#### `postcss.config.mjs`

```javascript
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@payload-config": ["./payload.config.ts"]
    }
  },
  "include": [
    "next-env.d.ts",
    ".next/types/**/*.ts",
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### `.claude/`

#### `.claude/settings.json`

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Read",
      "Grep",
      "Glob",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git diff:*)",
      "Bash(git show:*)",
      "Bash(git branch:*)",
      "Bash(git merge-base:*)",
      "Bash(git rev-list:*)",
      "Bash(git ls-files:*)",
      "Bash(git fetch:*)",
      "Bash(npm run type-check:*)",
      "Bash(npm run build:*)",
      "Bash(npm run lint:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(wc:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(rg:*)",
      "Bash(docker compose ps:*)",
      "Bash(docker compose logs:*)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(git merge:*)",
      "Bash(git rebase:*)",
      "Bash(git checkout main:*)",
      "Bash(npm install:*)",
      "Bash(npm i:*)",
      "Bash(npm ci:*)",
      "Bash(npm uninstall:*)",
      "Bash(npm run seed:*)",
      "Bash(npx payload migrate:*)",
      "Bash(docker compose up:*)",
      "Bash(docker compose down:*)",
      "Bash(docker build:*)"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git push origin main:*)",
      "Bash(git push origin HEAD:main:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean -fd:*)",
      "Bash(git clean -fdx:*)",
      "Bash(git branch -D:*)",
      "Bash(git branch --delete --force:*)",
      "Bash(git tag -d:*)",
      "Bash(git filter-branch:*)",
      "Bash(rm -rf:*)",
      "Bash(docker compose down -v:*)",
      "Bash(docker volume rm:*)",
      "Bash(dropdb:*)",
      "Bash(npm publish:*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Bash(cat .env:*)"
    ]
  }
}
```

### `app/`

#### `app/globals.css`

```css
@import "tailwindcss";

@layer components {
    @keyframes marqueeScroll {
        0% {
            transform: translateX(0%);
        }
        100% {
            transform: translateX(-50%);
        }
    }
}

@layer base {
    button {
        cursor: pointer;
    }
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
```

#### `app/StoreProvider.js`

```javascript
'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { hydrateCart } from '../lib/features/cart/cartSlice'

// M30 (ADR-023): the cart is guest-only with no server identity to key it on,
// so localStorage is the persistence layer. Key is namespaced to avoid
// colliding with anything else that might use this origin's storage.
const CART_STORAGE_KEY = 'gocart:cart'

function readPersistedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    // Validate per-entry rather than trusting the whole object — one bad
    // entry (e.g. from a future format change) shouldn't blank the rest.
    const cartItems = {}
    for (const [productId, quantity] of Object.entries(parsed)) {
      if (Number.isInteger(quantity) && quantity > 0) {
        cartItems[productId] = quantity
      }
    }
    return cartItems
  } catch {
    // Malformed JSON or inaccessible storage (private browsing, disabled
    // storage) — start from an empty cart rather than crashing every
    // storefront route, since this provider wraps the whole public layout.
    return {}
  }
}

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  useEffect(() => {
    // Hydrate after mount, not during initial state: reading localStorage
    // while rendering would make the server's HTML (always an empty cart)
    // mismatch the client's first render and break hydration on every
    // storefront route. `hydrateCart` recomputes `total` from the restored
    // `cartItems` rather than trusting a persisted total.
    storeRef.current.dispatch(hydrateCart({ cartItems: readPersistedCart() }))

    // Persist on every state change, including clearCart — no special case
    // needed for it to clear storage too, since it writes {} like any other
    // mutation.
    const unsubscribe = storeRef.current.subscribe(() => {
      try {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(storeRef.current.getState().cart.cartItems),
        )
      } catch {
        // localStorage unavailable or full — the cart still works for this
        // session, it just won't survive a reload.
      }
    })

    return unsubscribe
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
```

### `app/(payload)/`

#### `app/(payload)/layout.tsx`

```tsx
import type { ServerFunctionClient } from 'payload'

import config from '@payload-config'
import '@payloadcms/next/css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
```

### `app/(payload)/admin/`

#### `app/(payload)/admin/importMap.js`

> Auto-generated by Payload.

```javascript
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'

/** @type import('payload').ImportMap */
export const importMap = {
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1
}
```

### `app/(payload)/admin/[[...segments]]/`

#### `app/(payload)/admin/[[...segments]]/page.tsx`

```tsx
import type { Metadata } from 'next'

import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap.js'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, importMap, params, searchParams })

export default Page
```

### `app/(payload)/api/[...slug]/`

#### `app/(payload)/api/[...slug]/route.ts`

```typescript
import config from '@payload-config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
```

### `app/(payload)/api/graphql/`

#### `app/(payload)/api/graphql/route.ts`

```typescript
import config from '@payload-config'
import { GRAPHQL_POST } from '@payloadcms/next/routes'

// Completes M3's stated goal ("mount its admin UI and REST/GraphQL API") — the
// REST catch-all was mounted at M3, but the GraphQL endpoint was not. M10's
// testing bar requires products be retrievable via GraphQL, which needs this.
export const POST = GRAPHQL_POST(config)
```

### `app/(payload)/api/graphql-playground/`

#### `app/(payload)/api/graphql-playground/route.ts`

```typescript
import config from '@payload-config'
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes'

export const GET = GRAPHQL_PLAYGROUND_GET(config)
```

### `app/(public)/`

#### `app/(public)/layout.jsx`

```jsx
import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "../globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "GoCart. - Shop smarter",
    description: "GoCart. - Shop smarter",
};

export default function PublicLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${outfit.className} antialiased`}>
                <StoreProvider>
                    <Toaster />
                    <Banner />
                    <Navbar />
                    {children}
                    <Footer />
                </StoreProvider>
            </body>
        </html>
    );
}
```

#### `app/(public)/page.jsx`

```jsx
import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import { getProducts, getFeaturedProducts } from "@/lib/payload/products";

// M23: server component — the product sections are fetched through Payload's
// Local API and rendered into the initial HTML, so their content is crawlable
// (ADR-007) instead of appearing only after client hydration. The remaining
// 'use client' directives on this page's other children (Hero, Newsletter,
// OurSpecs) are M40's pass, not this milestone's.

// Rendered per request rather than prerendered at build time. Two reasons:
// an admin toggling `isFeatured` (ADR-022) must see the home page change
// without a redeploy, which static prerendering would prevent; and building
// the app would otherwise require a reachable database, which the production
// image build (M49) cannot assume. Revisit as ISR at M45 if this page needs
// the caching — SSR already satisfies the SEO requirement either way.
export const dynamic = 'force-dynamic'

export default async function Home() {

    const [latest, featured] = await Promise.all([
        getProducts({ sort: '-createdAt', limit: 4 }),
        getFeaturedProducts({ limit: 8 }),
    ]);

    return (
        <div>
            <Hero />
            <LatestProducts products={latest.docs} total={latest.totalDocs} />
            <BestSelling products={featured.docs} total={featured.totalDocs} />
            <OurSpecs />
            <Newsletter />
        </div>
    );
}
```

### `app/(public)/cart/`

#### `app/(public)/cart/page.jsx`

```jsx
'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

// M28: previously resolved cart line items against `state.product.list`,
// a Redux slice populated only from the dummy dataset (`productSlice.js`,
// deleted this milestone). That was already broken for every product a
// customer could actually reach — /shop, /product, and category pages have
// linked real Payload product IDs since M23–M25, which never matched the
// dummy list's `prod_N` IDs, so the cart silently dropped every real item.
// Fixed by fetching real products via Payload's public REST API (a client
// component can't use the Local API — same sanctioned pattern
// CategoriesMarquee.jsx uses, M27) instead of carrying real-data fetching
// forward as a second, unrelated milestone.
export default function Cart() {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';

    const { cartItems } = useSelector(state => state.cart);
    const [products, setProducts] = useState([]);

    const dispatch = useDispatch();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);

    const createCartArray = () => {
        setTotalPrice(0);
        const cartArray = [];
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(product => String(product.id) === key);
            if (product) {
                cartArray.push({
                    ...product,
                    quantity: value,
                });
                setTotalPrice(prev => prev + product.price * value);
            }
        }
        setCartArray(cartArray);
    }

    const handleDeleteItemFromCart = (productId) => {
        dispatch(deleteItemFromCart({ productId }))
    }

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/products?limit=0&depth=1', { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => setProducts(data.docs || []))
            .catch((error) => {
                if (error.name !== 'AbortError') console.error(error)
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (products.length > 0) {
            createCartArray();
        }
    }, [cartItems, products]);

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800">

            <div className="max-w-7xl mx-auto ">
                {/* Title */}
                <PageTitle heading="My Cart" text="items in your cart" linkText="Add more" />

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">

                    <table className="w-full max-w-4xl text-slate-600 table-auto">
                        <thead>
                            <tr className="max-sm:text-sm">
                                <th className="text-left">Product</th>
                                <th>Quantity</th>
                                <th>Total Price</th>
                                <th className="max-md:hidden">Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                cartArray.map((item, index) => {
                                    const firstImage = item.images?.[0]
                                    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url
                                    const categoryTitle = typeof item.category === 'object' && item.category ? item.category.title : item.category

                                    return (
                                    <tr key={index} className="space-x-2">
                                        <td className="flex gap-3 my-4">
                                            <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md">
                                                {imageUrl && <Image src={imageUrl} className="h-14 w-auto" alt="" width={45} height={45} />}
                                            </div>
                                            <div>
                                                <p className="max-sm:text-sm">{item.name}</p>
                                                <p className="text-xs text-slate-500">{categoryTitle}</p>
                                                <p>{currency}{item.price}</p>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Counter productId={item.id} />
                                        </td>
                                        <td className="text-center">{currency}{(item.price * item.quantity).toLocaleString()}</td>
                                        <td className="text-center max-md:hidden">
                                            <button onClick={() => handleDeleteItemFromCart(item.id)} className=" text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all">
                                                <Trash2Icon size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                    )
                                })
                            }
                        </tbody>
                    </table>
                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
            <h1 className="text-2xl sm:text-4xl font-semibold">Your cart is empty</h1>
        </div>
    )
}
```

### `app/(public)/categories/`

#### `app/(public)/categories/loading.tsx`

```tsx
// M27b: skeleton geometry matches the loaded grid (1 / 2 / 3 columns). This
// route has no notFound() path, so it doesn't hit the loading.tsx/Suspense
// status-code conflict documented in M27a's category-detail route.
export default function CategoriesLoading() {
  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh]">
        <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mt-8 mb-5" />
        <div className="h-8 w-56 bg-slate-100 rounded animate-pulse mb-8" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-6 flex flex-col gap-3">
              <div className="bg-slate-100 h-32 rounded-lg animate-pulse" />
              <div className="h-5 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### `app/(public)/categories/page.tsx`

```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getTopLevelCategories } from '@/lib/payload/categories'

// M27b: a browsable index of the whole catalog structure — every top-level
// category with its children — the single entry point into category
// browsing. Per docs/CATEGORY_REQUIREMENTS.md and ADR-007. `.tsx`, per M2a.

// Same static-by-default reasoning as M27a: the catalog structure changes
// infrequently, and this route has no per-slug notFound() path, so it
// doesn't hit the loading.tsx/Suspense status-code conflict documented
// there — a loading.tsx skeleton is safe here.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse every product category at gocart.',
}

export default async function CategoriesPage() {
  const categories = await getTopLevelCategories()

  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh]">
        <div className="text-gray-600 text-sm mt-8 mb-5">
          <Link href="/">Home</Link> / Categories
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-8">Categories</h1>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {categories.map((category) => {
              const image = category.image
              const imageUrl = typeof image === 'object' && image ? image.url : null

              return (
                <div key={category.id} className="bg-slate-50 rounded-2xl p-6 flex flex-col gap-3">
                  <Link href={`/category/${category.slug}`} className="flex flex-col gap-3 group">
                    {imageUrl && (
                      <div className="bg-white h-32 rounded-lg flex items-center justify-center overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={typeof image === 'object' && image?.alt ? image.alt : category.title}
                          width={200}
                          height={200}
                          className="max-h-28 w-auto group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold text-slate-800 group-hover:text-green-600 transition">
                      {category.title}
                    </h2>
                    {category.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{category.description}</p>
                    )}
                  </Link>

                  {category.children.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {category.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/category/${child.slug}`}
                          className="px-3 py-1 bg-white rounded-full text-xs text-slate-600 hover:bg-slate-600 hover:text-white transition-all"
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-24 text-slate-500">
            <p>No categories yet.</p>
            <Link href="/shop" className="text-green-600 text-sm">View all products</Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

### `app/(public)/category/[slug]/`

#### `app/(public)/category/[slug]/error.tsx`

```tsx
'use client'

// M27a: a Payload/database query failure renders this boundary with a retry
// affordance — never a silent empty category, which would misrepresent the
// catalog as smaller than it is on a page whose whole purpose is being
// indexed accurately.
export default function CategoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Something went wrong</h1>
        <p className="text-slate-500 max-w-md">
          We couldn&apos;t load this category right now. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="bg-slate-800 text-white px-6 py-2.5 text-sm font-medium rounded hover:bg-slate-900 transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
```

#### `app/(public)/category/[slug]/not-found.tsx`

```tsx
import Link from 'next/link'

// M27a: real HTTP 404 for an unknown category slug (or a page number
// beyond the last real page) — never a silent empty grid.
export default function CategoryNotFound() {
  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Category not found</h1>
        <p className="text-slate-500 max-w-md">
          We couldn&apos;t find the category you&apos;re looking for. It may have moved or no longer exists.
        </p>
        <div className="flex gap-4 text-sm">
          <Link href="/categories" className="text-green-600">Browse categories</Link>
          <Link href="/shop" className="text-green-600">View all products</Link>
        </div>
      </div>
    </div>
  )
}
```

#### `app/(public)/category/[slug]/page.tsx`

```tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import {
  getCategoryBySlug,
  getTopLevelCategories,
  getProductsByCategory,
} from '@/lib/payload/categories'
import type { Product } from '@/lib/payload/products'

// M27a: server-rendered category detail + product listing route, per
// docs/CATEGORY_REQUIREMENTS.md and ADR-007. `.tsx`, not `.jsx`, per M2a's
// rule that new files are TypeScript.

// Static-by-default, revalidated rather than rendered per request — the
// requirements doc's explicit choice for this route, unlike M23's home page
// (which needs per-request freshness for admin isFeatured curation). Category
// edits are infrequent and slugs are stable, so an hour-old page is an
// acceptable staleness window; revisit alongside M45's caching pass.
export const revalidate = 3600

const PAGE_SIZE = 24

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

function parsePage(raw: string | undefined): number {
  const page = Number(raw)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

// Every published category slug (parent and child) — there is no
// publish/draft field on Categories, so this is simply every category.
export async function generateStaticParams() {
  const topLevel = await getTopLevelCategories()
  const slugs = topLevel.flatMap((category) => [
    category.slug,
    ...category.children.map((child) => child.slug),
  ])
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { page: pageParam } = await searchParams

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const page = parsePage(pageParam)
  const result = await getProductsByCategory(slug, { page, limit: PAGE_SIZE })
  if (!result || (page > 1 && page > result.totalPages)) notFound()

  const title = category.seo?.metaTitle || category.title
  const description =
    category.seo?.metaDescription || category.description || `Shop ${category.title} at gocart.`
  const canonicalPath = page > 1 ? `/category/${slug}?page=${page}` : `/category/${slug}`

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = parsePage(pageParam)

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const result = await getProductsByCategory(slug, { page, limit: PAGE_SIZE })
  if (!result) notFound()

  const { totalDocs, totalPages } = result
  const products = result.docs as Product[]

  // A page beyond the last real page is out of range (never a valid empty
  // state — page 1 is the only page allowed to be legitimately empty).
  if (page > 1 && page > totalPages) notFound()

  const isParent = !category.parent
  const parent =
    typeof category.parent === 'object' && category.parent ? category.parent : null

  const basePath = `/category/${slug}`
  const pageHref = (targetPage: number) =>
    targetPage > 1 ? `${basePath}?page=${targetPage}` : basePath

  return (
    <div className="mx-6">
      {page > 1 && <link rel="prev" href={pageHref(page - 1)} />}
      {page < totalPages && <link rel="next" href={pageHref(page + 1)} />}

      <div className="max-w-7xl mx-auto min-h-[70vh]">
        {/* Breadcrumb */}
        <div className="text-gray-600 text-sm mt-8 mb-5">
          <Link href="/">Home</Link> / <Link href="/categories">Categories</Link>
          {parent ? (
            <>
              {' '}/ <Link href={`/category/${parent.slug}`}>{parent.title}</Link> / {category.title}
            </>
          ) : (
            <> / {category.title}</>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">{category.title}</h1>
        {category.description && (
          <p className="text-slate-500 text-sm mt-2 max-w-2xl">{category.description}</p>
        )}

        {/* Child-category navigation — parent pages only */}
        {isParent && category.children.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-6">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/category/${child.slug}`}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 text-sm hover:bg-slate-600 hover:text-white transition-all"
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}

        {/* Product grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-8 my-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-24 text-slate-500">
            <p>No products in this category yet.</p>
            <div className="flex gap-4 text-sm">
              <Link href="/categories" className="text-green-600">Browse categories</Link>
              <Link href="/shop" className="text-green-600">View all products</Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 my-10 text-sm text-slate-600">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200">Previous</Link>
            ) : (
              <span className="px-3 py-1.5 rounded bg-slate-50 text-slate-300">Previous</span>
            )}
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={pageHref(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded ${n === page ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  {n}
                </Link>
              ))}
            </div>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200">Next</Link>
            ) : (
              <span className="px-3 py-1.5 rounded bg-slate-50 text-slate-300">Next</span>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 text-center mb-10">
          Page {page} of {Math.max(totalPages, 1)} — {totalDocs} product{totalDocs === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
```

### `app/(public)/orders/`

#### `app/(public)/orders/page.jsx`

```jsx
'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";

// M28: inlined, self-contained, image-free — the old orderDummyData lived in
// assets/assets.js and pulled in productDummyData (with product_img*.png
// imports), deleted this milestone. This page is still fully dummy; M36 is
// the milestone that replaces it with real guest order lookup. OrderItem.jsx
// already renders without an image when a product has none.
const orderDummyData = [
    {
        id: "order_1",
        total: 214.2,
        status: "DELIVERED",
        isPaid: false,
        paymentMethod: "COD",
        createdAt: "2025-08-22T09:15:03.929Z",
        orderItems: [
            { productId: "prod_1", quantity: 1, price: 89, product: { id: "prod_1", name: "Modern table lamp", images: [] } },
            { productId: "prod_2", quantity: 1, price: 149, product: { id: "prod_2", name: "Smart speaker gray", images: [] } },
        ],
        address: { name: "John Doe", street: "123 Main St", city: "New York", state: "NY", zip: "10001", country: "USA", phone: "1234567890" },
    },
    {
        id: "order_2",
        total: 421.6,
        status: "DELIVERED",
        isPaid: false,
        paymentMethod: "COD",
        createdAt: "2025-08-22T09:14:35.923Z",
        orderItems: [
            { productId: "prod_3", quantity: 1, price: 229, product: { id: "prod_3", name: "Smart watch white", images: [] } },
            { productId: "prod_4", quantity: 1, price: 99, product: { id: "prod_4", name: "Wireless headphones", images: [] } },
            { productId: "prod_5", quantity: 1, price: 199, product: { id: "prod_5", name: "Smart watch black", images: [] } },
        ],
        address: { name: "John Doe", street: "123 Main St", city: "New York", state: "NY", zip: "10001", country: "USA", phone: "1234567890" },
    },
]

export default function Orders() {

    const [orders, setOrders] = useState([]);

    useEffect(() => {
        setOrders(orderDummyData)
    }, []);

    return (
        <div className="min-h-[70vh] mx-6">
            {orders.length > 0 ? (
                (
                    <div className="my-20 max-w-7xl mx-auto">
                        <PageTitle heading="My Orders" text={`Showing total ${orders.length} orders`} linkText={'Go to home'} />

                        <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
                            <thead>
                                <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                                    <th className="text-left">Product</th>
                                    <th className="text-center">Total Price</th>
                                    <th className="text-left">Address</th>
                                    <th className="text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <OrderItem order={order} key={order.id} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                    <h1 className="text-2xl sm:text-4xl font-semibold">You have no orders</h1>
                </div>
            )}
        </div>
    )
}
```

### `app/(public)/product/[productId]/`

#### `app/(public)/product/[productId]/page.jsx`

```jsx
import Link from "next/link";
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import { getProductById } from "@/lib/payload/products";
import { notFound } from "next/navigation";

// M25: server component reading a real per-product fetch (ADR-007 — SEO-first
// is a non-negotiable default, matching the M23/M24 precedent). force-dynamic
// for the same reason as M23's home page: admin edits to price/stock must
// show without a redeploy, and the production build (M49) cannot assume a
// reachable database.
export const dynamic = 'force-dynamic'

export default async function Product({ params }) {

    const { productId } = await params
    const product = await getProductById(productId)

    if (!product) {
        notFound()
    }

    const category = typeof product.category === 'object' && product.category
        ? product.category
        : null

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto">

                {/* Breadcrums — M27a: the category segment is now a real link to
                    /category/[slug], replacing the unlinked plain text. */}
                <div className="  text-gray-600 text-sm mt-8 mb-5">
                    <Link href="/">Home</Link> / <Link href="/shop">Products</Link>
                    {category && <> / <Link href={`/category/${category.slug}`}>{category.title}</Link></>}
                </div>

                {/* Product Details */}
                <ProductDetails product={product} />

                {/* Description & Reviews */}
                <ProductDescription product={product} />
            </div>
        </div>
    );
}
```

### `app/(public)/shop/`

#### `app/(public)/shop/page.jsx`

```jsx
import Link from "next/link"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon } from "lucide-react"
import { getProducts } from "@/lib/payload/products"

// M24: server component reading real Payload data (ADR-007 — SEO-first is a
// non-negotiable default for storefront UI, not a later pass). The name
// filter is a real Payload query (M29, ADR-025 — case-insensitive substring
// match on `name` only), not an in-memory filter over the full listing.
export default async function Shop({ searchParams }) {

    const { search } = await searchParams

    const { docs: products } = await getProducts({ search })

    return (
        <div className="min-h-[70vh] mx-6">
            <div className=" max-w-7xl mx-auto">
                <h1 className="text-2xl text-slate-500 my-6 flex items-center gap-2">
                    {search ? (
                        <Link href="/shop" className="flex items-center gap-2">
                            <MoveLeftIcon size={20} /> All <span className="text-slate-700 font-medium">Products</span>
                        </Link>
                    ) : (
                        <>All <span className="text-slate-700 font-medium">Products</span></>
                    )}
                </h1>
                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                    {products.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
            </div>
        </div>
    )
}
```

### `collections/`

#### `collections/Categories.ts`

```typescript
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
```

#### `collections/Media.ts`

```typescript
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
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  upload: {
    staticDir: path.resolve(dirname, '../media'),
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
```

#### `collections/Orders.ts`

```typescript
import type { CollectionConfig } from 'payload'

// M11: orders for guest checkout — embedded customer/address fields instead of a
// User relation (ADR-021), plus a line-items array instead of a join table (ADR-005).
// M12: COD-only paymentMethod (extensible enum, ADR-004) and the decided order
// status set (ADR-019).
//
// M13 adds the access rules below: public-create (guest checkout), admin-read.
// NOTE — this leaves no public read path for guest order lookup by reference,
// which readiness finding C7 (docs/PHASE_1_READINESS_REPORT.md) already flags as
// conflicting with M36's requirement. No reconciling mechanism (scoped lookup
// endpoint, field-level access, signed token) is designed anywhere in the docs.
// M13's own testing bar is exactly "anonymous GET /api/orders fails," so that is
// what's implemented here; C7 is a pre-existing, still-open gap to resolve before
// M36, not something invented here.

function generateOrderNumber(): string {
  const timestampPart = Date.now().toString(36).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `GC-${timestampPart}-${randomPart}`
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'name', 'orderTotal', 'status', 'isPaid', 'createdAt'],
  },
  access: {
    create: () => true,
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Human-referenceable order reference, distinct from the internal id.',
      },
    },
    // Guest customer/address — embedded, not a relation to a Customers collection (ADR-021).
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'address',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'area',
      type: 'text',
    },
    // Line items — array instead of a separate join table (ADR-005).
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          hasMany: false,
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          admin: {
            description:
              "Price snapshot at order time — independent of the live Products.price, so a later price edit never re-prices this order.",
          },
        },
      ],
    },
    {
      name: 'orderTotal',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'shippingCost',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      admin: {
        description: 'Resolved flat rate or 0 if the free-shipping threshold was met (ADR-018).',
      },
    },
    {
      name: 'discountAmount',
      type: 'number',
      min: 0,
      admin: {
        description:
          'Reserved for a future coupon engine (ADR-017) — no coupon UI exists in v1.',
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      defaultValue: 'COD',
      // Extensible enum (ADR-004) — only COD is selectable today; a gateway can be
      // added later as a new option here. Note: Payload materializes `select` as a
      // native Postgres ENUM, so adding a value is a trivial `ALTER TYPE ... ADD
      // VALUE`, not literally zero migration — still no data transformation/backfill.
      options: [{ label: 'Cash on Delivery', value: 'COD' }],
    },
    {
      name: 'isPaid',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'PLACED',
      // Flat, admin-selected enum — no transition-validation state machine in v1 (ADR-019).
      options: [
        { label: 'Placed', value: 'PLACED' },
        { label: 'Confirmed', value: 'CONFIRMED' },
        { label: 'Processing', value: 'PROCESSING' },
        { label: 'Shipped', value: 'SHIPPED' },
        { label: 'Delivered', value: 'DELIVERED' },
        { label: 'Cancelled', value: 'CANCELLED' },
        { label: 'Returned', value: 'RETURNED' },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (data && operation === 'create' && !data.orderNumber) {
          data.orderNumber = generateOrderNumber()
        }
        return data
      },
    ],
  },
}
```

#### `collections/Products.ts`

```typescript
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
    {
      // Added at M23 (ADR-022). The home page's "Best Selling" section has no
      // sales data to rank by — Reviews are out of scope (ADR-016) and nothing
      // aggregates Orders — so the section is admin-curated rather than
      // computed from a metric that does not exist.
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Show this product in the home page "Best Selling" section. Curated by the admin — there is no sales-based ranking in v1.',
      },
    },
  ],
}
```

#### `collections/Users.ts`

```typescript
import type { CollectionConfig } from 'payload'

// M6/M7: the single authenticated role in the system (ADR-006). Payload's built-in
// "create first user" flow bypasses `create` access when no Users exist yet, so this
// stays lockable to "authenticated admins only" without blocking initial bootstrap.
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [],
}
```

### `components/`

#### `components/AddressModal.jsx`

```jsx
'use client'
import { XIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"
import { addAddress } from "@/lib/features/address/addressSlice"

// M31: Pakistani guest-checkout address capture (PROJECT_SPEC.md — name, phone,
// address, city, area), phone-first per the milestone's goal. Field set matches
// collections/Orders.ts's embedded guest-address fields exactly (ADR-021), so a
// later milestone (M33) can map this straight onto an order with no translation
// layer. `email` is kept even though Orders has no email field today — captured
// for a possible future order-notification use, not yet wired to anything.
const PHONE_PATTERN = '0[0-9]{10}'

const AddressModal = ({ setShowAddressModal }) => {

    const dispatch = useDispatch()

    const [address, setAddress] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        area: '',
    })

    const handleAddressChange = (e) => {
        setAddress({
            ...address,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        dispatch(addAddress({ ...address, id: crypto.randomUUID() }))
        setShowAddressModal(false)
    }

    return (
        <form onSubmit={e => toast.promise(handleSubmit(e), { loading: 'Adding Address...' })} className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center">
            <div className="flex flex-col gap-5 text-slate-700 w-full max-w-sm mx-6">
                <h2 className="text-3xl ">Add New <span className="font-semibold">Address</span></h2>
                <input name="name" onChange={handleAddressChange} value={address.name} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Full name" required />
                <input name="phone" onChange={handleAddressChange} value={address.phone} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="tel" placeholder="03XXXXXXXXX" pattern={PHONE_PATTERN} title="11-digit phone number starting with 0, e.g. 03001234567" required />
                <input name="email" onChange={handleAddressChange} value={address.email} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="email" placeholder="Email address" required />
                <input name="address" onChange={handleAddressChange} value={address.address} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="House #, street" required />
                <div className="flex gap-4">
                    <input name="city" onChange={handleAddressChange} value={address.city} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="City" required />
                    <input name="area" onChange={handleAddressChange} value={address.area} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Area" required />
                </div>
                <button className="bg-slate-800 text-white text-sm font-medium py-2.5 rounded-md hover:bg-slate-900 active:scale-95 transition-all">SAVE ADDRESS</button>
            </div>
            <XIcon size={30} className="absolute top-5 right-5 text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => setShowAddressModal(false)} />
        </form>
    )
}

export default AddressModal
```

#### `components/Banner.jsx`

```jsx
'use client'
import React from 'react'
import toast from 'react-hot-toast';

export default function Banner() {

    const [isOpen, setIsOpen] = React.useState(true);

    const handleClaim = () => {
        setIsOpen(false);
        toast.success('Coupon copied to clipboard!');
        navigator.clipboard.writeText('NEW20');
    };

    return isOpen && (
        <div className="w-full px-6 py-1 font-medium text-sm text-white text-center bg-gradient-to-r from-violet-500 via-[#9938CA] to-[#E0724A]">
            <div className='flex items-center justify-between max-w-7xl  mx-auto'>
                <p>Get 20% OFF on Your First Order!</p>
                <div className="flex items-center space-x-6">
                    <button onClick={handleClaim} type="button" className="font-normal text-gray-800 bg-white px-7 py-2 rounded-full max-sm:hidden">Claim Offer</button>
                    <button onClick={() => setIsOpen(false)} type="button" className="font-normal text-gray-800 py-2 rounded-full">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect y="12.532" width="17.498" height="2.1" rx="1.05" transform="rotate(-45.74 0 12.532)" fill="#fff" />
                            <rect x="12.533" y="13.915" width="17.498" height="2.1" rx="1.05" transform="rotate(-135.74 12.533 13.915)" fill="#fff" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
```

#### `components/BestSelling.jsx`

```jsx
import Title from './Title'
import ProductCard from './ProductCard'

// M23: server component fed by real Payload data. Its products are the ones an
// admin flagged `isFeatured` — not a computed ranking. There is no sales-count
// field and nothing aggregates Orders, and the dummy data's original basis
// (review count) is out of scope for v1 (ADR-016). See ADR-022.
//
// Renders nothing when no products are flagged, rather than an empty section
// with a heading and a "View more" link that would lead to an unrelated list.
const BestSelling = ({ products = [], total = 0 }) => {

    if (products.length === 0) return null

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Best Selling' description={`Showing ${products.length} of ${total} products`} href='/shop' />
            <div className='mt-12  grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default BestSelling
```

#### `components/CategoriesMarquee.jsx`

```jsx
'use client'
import { useEffect, useState } from "react"
import Link from "next/link"

// M27: data source only — swapped the hardcoded `categories` array from
// assets/assets.js for the real Categories collection.
//
// This component is nested inside Hero.jsx, which is 'use client' (Hero's
// own server-component conversion is M40's pass, not this one). A client
// component can't use lib/payload/categories.ts's Local API, so this fetches
// Payload's public-read REST API directly instead, per the sanctioned
// pattern documented in lib/payload/categories.ts.
//
// M27a: items are now real next/link anchors to /category/[slug] — a
// crawler can't follow a click handler, and neither can a keyboard user.
const CategoriesMarquee = () => {

    const [categories, setCategories] = useState([])

    useEffect(() => {
        const controller = new AbortController()

        fetch('/api/categories?limit=0&sort=displayOrder,title&depth=0', { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => setCategories(data.docs || []))
            .catch((error) => {
                if (error.name !== 'AbortError') console.error(error)
            })

        return () => controller.abort()
    }, [])

    if (categories.length === 0) return null

    const items = [...categories, ...categories, ...categories, ...categories]

    return (
        <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
            <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
            <div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4" >
                {items.map((category, index) => (
                    <Link key={`${category.id}-${index}`} href={`/category/${category.slug}`} className="px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300">
                        {category.title}
                    </Link>
                ))}
            </div>
            <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
    );
};

export default CategoriesMarquee;
```

#### `components/Counter.jsx`

```jsx
'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
    }

    const removeFromCartHandler = () => {
        dispatch(removeFromCart({ productId }))
    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none">-</button>
            <p className="p-1">{cartItems[productId]}</p>
            <button onClick={addToCartHandler} className="p-1 select-none">+</button>
        </div>
    )
}

export default Counter
```

#### `components/Footer.jsx`

```jsx
import Link from "next/link";

const Footer = () => {

    const MailIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.6654 4.66699L8.67136 8.48499C8.46796 8.60313 8.23692 8.66536 8.0017 8.66536C7.76647 8.66536 7.53544 8.60313 7.33203 8.48499L1.33203 4.66699M2.66536 2.66699H13.332C14.0684 2.66699 14.6654 3.26395 14.6654 4.00033V12.0003C14.6654 12.7367 14.0684 13.3337 13.332 13.3337H2.66536C1.92898 13.3337 1.33203 12.7367 1.33203 12.0003V4.00033C1.33203 3.26395 1.92898 2.66699 2.66536 2.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const PhoneIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M9.22003 11.045C9.35772 11.1082 9.51283 11.1227 9.65983 11.086C9.80682 11.0493 9.93692 10.9636 10.0287 10.843L10.2654 10.533C10.3896 10.3674 10.5506 10.233 10.7357 10.1404C10.9209 10.0479 11.125 9.99967 11.332 9.99967H13.332C13.6857 9.99967 14.0248 10.1402 14.2748 10.3902C14.5249 10.6402 14.6654 10.9794 14.6654 11.333V13.333C14.6654 13.6866 14.5249 14.0258 14.2748 14.2758C14.0248 14.5259 13.6857 14.6663 13.332 14.6663C10.1494 14.6663 7.09719 13.4021 4.84675 11.1516C2.59631 8.90119 1.33203 5.84894 1.33203 2.66634C1.33203 2.31272 1.47251 1.97358 1.72256 1.72353C1.9726 1.47348 2.31174 1.33301 2.66536 1.33301H4.66536C5.01899 1.33301 5.35812 1.47348 5.60817 1.72353C5.85822 1.97358 5.9987 2.31272 5.9987 2.66634V4.66634C5.9987 4.87333 5.9505 5.07749 5.85793 5.26263C5.76536 5.44777 5.63096 5.60881 5.46536 5.73301L5.15336 5.96701C5.03098 6.06046 4.94471 6.1934 4.90923 6.34324C4.87374 6.49308 4.89122 6.65059 4.9587 6.78901C5.86982 8.63959 7.36831 10.1362 9.22003 11.045Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const MapPinIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M13.3346 6.66634C13.3346 9.99501 9.64197 13.4617 8.40197 14.5323C8.28645 14.6192 8.14583 14.6662 8.0013 14.6662C7.85677 14.6662 7.71615 14.6192 7.60064 14.5323C6.36064 13.4617 2.66797 9.99501 2.66797 6.66634C2.66797 5.25185 3.22987 3.8953 4.23007 2.89511C5.23026 1.89491 6.58681 1.33301 8.0013 1.33301C9.41579 1.33301 10.7723 1.89491 11.7725 2.89511C12.7727 3.8953 13.3346 5.25185 13.3346 6.66634Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M8.0013 8.66634C9.10587 8.66634 10.0013 7.77091 10.0013 6.66634C10.0013 5.56177 9.10587 4.66634 8.0013 4.66634C6.89673 4.66634 6.0013 5.56177 6.0013 6.66634C6.0013 7.77091 6.89673 8.66634 8.0013 8.66634Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const FacebookIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.9987 1.66699H12.4987C11.3936 1.66699 10.3338 2.10598 9.55242 2.88738C8.77102 3.66878 8.33203 4.72859 8.33203 5.83366V8.33366H5.83203V11.667H8.33203V18.3337H11.6654V11.667H14.1654L14.9987 8.33366H11.6654V5.83366C11.6654 5.61265 11.7532 5.40068 11.9094 5.2444C12.0657 5.08812 12.2777 5.00033 12.4987 5.00033H14.9987V1.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const InstagramIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.5846 5.41699H14.593M5.83464 1.66699H14.168C16.4692 1.66699 18.3346 3.53247 18.3346 5.83366V14.167C18.3346 16.4682 16.4692 18.3337 14.168 18.3337H5.83464C3.53345 18.3337 1.66797 16.4682 1.66797 14.167V5.83366C1.66797 3.53247 3.53345 1.66699 5.83464 1.66699ZM13.3346 9.47533C13.4375 10.1689 13.319 10.8772 12.9961 11.4995C12.6732 12.1218 12.1623 12.6265 11.536 12.9417C10.9097 13.2569 10.2 13.3667 9.50779 13.2553C8.81557 13.1439 8.1761 12.8171 7.68033 12.3213C7.18457 11.8255 6.85775 11.1861 6.74636 10.4938C6.63497 9.80162 6.74469 9.0919 7.05991 8.46564C7.37512 7.83937 7.87979 7.32844 8.50212 7.00553C9.12445 6.68261 9.83276 6.56415 10.5263 6.66699C11.2337 6.7719 11.8887 7.10154 12.3944 7.60725C12.9001 8.11295 13.2297 8.76789 13.3346 9.47533Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const TwitterIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M18.3346 3.33368C18.3346 3.33368 17.7513 5.08368 16.668 6.16701C18.0013 14.5003 8.83464 20.5837 1.66797 15.8337C3.5013 15.917 5.33464 15.3337 6.66797 14.167C2.5013 12.917 0.417969 8.00034 2.5013 4.16701C4.33464 6.33368 7.16797 7.58368 10.0013 7.50034C9.2513 4.00034 13.3346 2.00034 15.8346 4.33368C16.7513 4.33368 18.3346 3.33368 18.3346 3.33368Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const LinkedinIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M13.3346 6.66699C14.6607 6.66699 15.9325 7.19378 16.8702 8.13146C17.8079 9.06914 18.3346 10.3409 18.3346 11.667V17.5003H15.0013V11.667C15.0013 11.225 14.8257 10.801 14.5131 10.4885C14.2006 10.1759 13.7767 10.0003 13.3346 10.0003C12.8926 10.0003 12.4687 10.1759 12.1561 10.4885C11.8436 10.801 11.668 11.225 11.668 11.667V17.5003H8.33464V11.667C8.33464 10.3409 8.86142 9.06914 9.7991 8.13146C10.7368 7.19378 12.0086 6.66699 13.3346 6.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M5.0013 7.50033H1.66797V17.5003H5.0013V7.50033Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M3.33464 5.00033C4.25511 5.00033 5.0013 4.25413 5.0013 3.33366C5.0013 2.41318 4.25511 1.66699 3.33464 1.66699C2.41416 1.66699 1.66797 2.41318 1.66797 3.33366C1.66797 4.25413 2.41416 5.00033 3.33464 5.00033Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)

    const linkSections = [
        {
            title: "PRODUCTS",
            links: [
                { text: "Earphones", path: '/', icon: null },
                { text: "Headphones", path: '/', icon: null },
                { text: "Smartphones", path: '/', icon: null },
                { text: "Laptops", path: '/', icon: null },
            ]
        },
        {
            title: "WEBSITE?",
            links: [
                { text: "Home", path: '/', icon: null },
                { text: "Privacy Policy", path: '/', icon: null },
            ]
        },
        {
            title: "CONTACT",
            links: [
                { text: "+1-212-456-7890", path: '/', icon: MailIcon },
                { text: "contact@example.com", path: '/', icon: PhoneIcon },
                { text: "794 Francisco, 94102", path: '/', icon: MapPinIcon }
            ]
        }
    ];

    const socialIcons = [
        { icon: FacebookIcon, link: "https://www.facebook.com" },
        { icon: InstagramIcon, link: "https://www.instagram.com" },
        { icon: TwitterIcon, link: "https://twitter.com" },
        { icon: LinkedinIcon, link: "https://www.linkedin.com" },
    ]

    return (
        <footer className="mx-6 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-slate-500/30 text-slate-500">
                    <div>
                        <Link href="/" className="text-4xl font-semibold text-slate-700">
                            <span className="text-green-600">go</span>cart<span className="text-green-600 text-5xl leading-0">.</span>
                        </Link>
                        <p className="max-w-[410px] mt-6 text-sm">Welcome to gocart, your ultimate destination for the latest and smartest gadgets. From smartphones and smartwatches to essential accessories, we bring you the best in innovation — all in one place.</p>
                        <div className="flex items-center gap-3 mt-5">
                            {socialIcons.map((item, i) => (
                                <Link href={item.link} key={i} className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:scale-105 hover:border border-slate-300 transition rounded-full">
                                    <item.icon />
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-between w-full md:w-[45%] gap-5 text-sm ">
                        {linkSections.map((section, index) => (
                            <div key={index}>
                                <h3 className="font-medium text-slate-700 md:mb-5 mb-3">{section.title}</h3>
                                <ul className="space-y-2.5">
                                    {section.links.map((link, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            {link.icon && <link.icon />}
                                            <Link href={link.path} className="hover:underline transition">{link.text}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="py-4 text-sm text-slate-500">
                    Copyright 2025 © gocart All Right Reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
```

#### `components/Hero.jsx`

```jsx
'use client'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import React from 'react'
import CategoriesMarquee from './CategoriesMarquee'

// M28: the hero/product placeholder images (assets/hero_*.png) were part of
// the deleted dummy dataset and are removed with it — real marketing/product
// photography is a separate, not-yet-supplied asset. The `<Image>` elements
// they filled are replaced with plain gradient placeholders that keep the
// same layout dimensions (no CLS), not left as broken image references.

const Hero = () => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. '

    return (
        <div className='mx-6'>
            <div className='flex max-xl:flex-col gap-8 max-w-7xl mx-auto my-10'>
                <div className='relative flex-1 flex flex-col bg-green-200 rounded-3xl xl:min-h-100 group'>
                    <div className='p-5 sm:p-16'>
                        <div className='inline-flex items-center gap-3 bg-green-300 text-green-600 pr-4 p-1 rounded-full text-xs sm:text-sm'>
                            <span className='bg-green-600 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs'>NEWS</span> Free Shipping on Orders Above $50! <ChevronRightIcon className='group-hover:ml-2 transition-all' size={16} />
                        </div>
                        <h2 className='text-3xl sm:text-5xl leading-[1.2] my-3 font-medium bg-gradient-to-r from-slate-600 to-[#A0FF74] bg-clip-text text-transparent max-w-xs  sm:max-w-md'>
                            Gadgets you'll love. Prices you'll trust.
                        </h2>
                        <div className='text-slate-800 text-sm font-medium mt-4 sm:mt-8'>
                            <p>Starts from</p>
                            <p className='text-3xl'>{currency}4.90</p>
                        </div>
                        <button className='bg-slate-800 text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition'>LEARN MORE</button>
                    </div>
                    <div className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm h-40 sm:h-64 rounded-3xl bg-gradient-to-br from-green-300/60 to-green-500/40' />
                </div>
                <div className='flex flex-col md:flex-row xl:flex-col gap-5 w-full xl:max-w-sm text-sm text-slate-600'>
                    <div className='flex-1 flex items-center justify-between w-full bg-orange-200 rounded-3xl p-6 px-8 group'>
                        <div>
                            <p className='text-3xl font-medium bg-gradient-to-r from-slate-800 to-[#FFAD51] bg-clip-text text-transparent max-w-40'>Best products</p>
                            <p className='flex items-center gap-1 mt-4'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} /> </p>
                        </div>
                        <div className='w-35 h-24 rounded-2xl bg-gradient-to-br from-orange-300/70 to-orange-400/50' />
                    </div>
                    <div className='flex-1 flex items-center justify-between w-full bg-blue-200 rounded-3xl p-6 px-8 group'>
                        <div>
                            <p className='text-3xl font-medium bg-gradient-to-r from-slate-800 to-[#78B2FF] bg-clip-text text-transparent max-w-40'>20% discounts</p>
                            <p className='flex items-center gap-1 mt-4'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} /> </p>
                        </div>
                        <div className='w-35 h-24 rounded-2xl bg-gradient-to-br from-blue-300/70 to-blue-400/50' />
                    </div>
                </div>
            </div>
            <CategoriesMarquee />
        </div>

    )
}

export default Hero
```

#### `components/LatestProducts.jsx`

```jsx
import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'

// M23: server component fed by real Payload data. Sorting/limiting happens in
// the page's query (sort: '-createdAt'), not here — previously this pulled the
// whole dummy list out of Redux and sorted it client-side.
const LatestProducts = ({ products = [], total = 0 }) => {

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Latest Products' description={`Showing ${products.length} of ${total} products`} href='/shop' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default LatestProducts
```

#### `components/Loading.jsx`

```jsx
'use client'

const Loading = () => {

    return (
        <div className='flex items-center justify-center h-screen'>
            <div className='w-11 h-11 rounded-full border-3 border-gray-300 border-t-green-500 animate-spin'></div>
        </div>
    )
}

export default Loading
```

#### `components/Navbar.jsx`

```jsx
'use client'
import { Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";

const Navbar = () => {

    const router = useRouter();

    const [search, setSearch] = useState('')
    const [showMobileSearch, setShowMobileSearch] = useState(false)
    const cartCount = useSelector(state => state.cart.total)

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
        setShowMobileSearch(false)
    }

    return (
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4  transition-all">

                    <Link href="/" className="relative text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">go</span>cart<span className="text-green-600 text-5xl leading-0">.</span>
                        <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                            plus
                        </p>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        <Link href="/">Home</Link>
                        <Link href="/shop">Shop</Link>
                        <Link href="/">About</Link>
                        <Link href="/">Contact</Link>

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
                            <Search size={18} className="text-slate-600" />
                            <input className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>

                        <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                            <ShoppingCart size={18} />
                            Cart
                            <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">{cartCount}</button>
                        </Link>

                    </div>

                    {/* Mobile Menu — cart access was missing entirely below `sm` until this */}
                    <div className="flex sm:hidden items-center gap-5 text-slate-600">
                        <Link href="/shop" className="text-sm">Shop</Link>

                        <button aria-label="Search" onClick={() => setShowMobileSearch((prev) => !prev)}>
                            <Search size={20} />
                        </button>

                        <Link href="/cart" className="relative flex items-center text-slate-600">
                            <ShoppingCart size={20} />
                            <span className="absolute -top-2 -right-2 text-[8px] text-white bg-slate-600 size-3.5 rounded-full flex items-center justify-center">{cartCount}</span>
                        </Link>
                    </div>
                </div>

                {showMobileSearch && (
                    <form onSubmit={handleSearch} className="sm:hidden flex items-center gap-2 bg-slate-100 px-4 py-2.5 rounded-full mb-4 text-sm">
                        <Search size={16} className="text-slate-600" />
                        <input autoFocus className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                    </form>
                )}
            </div>
            <hr className="border-gray-300" />
        </nav>
    )
}

export default Navbar
```

#### `components/Newsletter.jsx`

```jsx
import React from 'react'
import Title from './Title'

const Newsletter = () => {
    return (
        <div className='flex flex-col items-center mx-4 my-36'>
            <Title title="Join Newsletter" description="Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox every week." visibleButton={false} />
            <div className='flex bg-slate-100 text-sm p-1 rounded-full w-full max-w-xl my-10 border-2 border-white ring ring-slate-200'>
                <input className='flex-1 pl-5 outline-none' type="text" placeholder='Enter your email address' />
                <button className='font-medium bg-green-500 text-white px-7 py-3 rounded-full hover:scale-103 active:scale-95 transition'>Get Updates</button>
            </div>
        </div>
    )
}

export default Newsletter
```

#### `components/OrderItem.jsx`

```jsx
'use client'
import Image from "next/image";
import { DotIcon } from "lucide-react";

// M28: the star-rating/"Rate Product" block is removed — it read
// `state.rating`, whose only source (`ratingSlice.js`) is deleted this
// milestone (Reviews are out of scope for v1, ADR-016). This is the same
// forced pull-forward `ProductCard.jsx`/`ProductDetails.jsx` got at
// M23/M25: M46's file list should have included this file too — it never
// did, and this is where that gap surfaced. Nothing left for M46 to strip
// from OrderItem.jsx.
const OrderItem = ({ order }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';

    return (
        <>
            <tr className="text-sm">
                <td className="text-left">
                    <div className="flex flex-col gap-6">
                        {order.orderItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
                                    {item.product.images?.[0] && (
                                        <Image
                                            className="h-14 w-auto"
                                            src={item.product.images[0]}
                                            alt="product_img"
                                            width={50}
                                            height={50}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col justify-center text-sm">
                                    <p className="font-medium text-slate-600 text-base">{item.product.name}</p>
                                    <p>{currency}{item.price} Qty : {item.quantity} </p>
                                    <p className="mb-1">{new Date(order.createdAt).toDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </td>

                <td className="text-center max-md:hidden">{currency}{order.total}</td>

                <td className="text-left max-md:hidden">
                    <p>{order.address.name}, {order.address.street},</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country},</p>
                    <p>{order.address.phone}</p>
                </td>

                <td className="text-left space-y-2 text-sm max-md:hidden">
                    <div
                        className={`flex items-center justify-center gap-1 rounded-full p-1 ${order.status === 'confirmed'
                            ? 'text-yellow-500 bg-yellow-100'
                            : order.status === 'delivered'
                                ? 'text-green-500 bg-green-100'
                                : 'text-slate-500 bg-slate-100'
                            }`}
                    >
                        <DotIcon size={10} className="scale-250" />
                        {order.status.split('_').join(' ').toLowerCase()}
                    </div>
                </td>
            </tr>
            {/* Mobile */}
            <tr className="md:hidden">
                <td colSpan={5}>
                    <p>{order.address.name}, {order.address.street}</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country}</p>
                    <p>{order.address.phone}</p>
                    <br />
                    <div className="flex items-center">
                        <span className='text-center mx-auto px-6 py-1.5 rounded bg-green-100 text-green-700' >
                            {order.status.replace(/_/g, ' ').toLowerCase()}
                        </span>
                    </div>
                </td>
            </tr>
            <tr>
                <td colSpan={4}>
                    <div className="border-b border-slate-300 w-6/7 mx-auto" />
                </td>
            </tr>
        </>
    )
}

export default OrderItem
```

#### `components/OrderSummary.jsx`

```jsx
import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState } from 'react'
import AddressModal from './AddressModal';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const OrderSummary = ({ totalPrice, items }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';

    const router = useRouter();

    const addressList = useSelector(state => state.address.list);

    // M32: COD is the only payment method for launch (ADR-004) — Orders.paymentMethod
    // itself only accepts 'COD' (collections/Orders.ts). No longer user-selectable
    // state; kept as a plain value for M33 to read when it builds the real order.
    const paymentMethod = 'COD';
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');

    const handleCouponCode = async (event) => {
        event.preventDefault();
        
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        router.push('/orders')
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            <p className='text-slate-400 text-xs my-4'>Payment Method</p>
            <p className='text-slate-700 font-medium'>Cash on Delivery (COD)</p>
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p>{selectedAddress.name}, {selectedAddress.address}, {selectedAddress.area}, {selectedAddress.city}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.address}, {address.area}, {address.city}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)} >Add Address <PlusIcon size={18} /></button>
                        </div>
                    )
                }
            </div>
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p>Free</p>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * totalPrice).toFixed(2)}`}</p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Coupon Code' className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Apply</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>
            <div className='flex justify-between py-4'>
                <p>Total:</p>
                <p className='font-medium text-right'>{currency}{coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)).toFixed(2) : totalPrice.toLocaleString()}</p>
            </div>
            <button onClick={e => toast.promise(handlePlaceOrder(e), { loading: 'placing Order...' })} className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all'>Place Order</button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary
```

#### `components/OurSpec.jsx`

```jsx
import React from 'react'
import Title from './Title'
import { ClockFadingIcon, HeadsetIcon, SendIcon } from 'lucide-react'

// M28: inlined from assets/assets.js — site content (not product data), the
// only remaining consumer, so it moves with the component rather than
// surviving in a file otherwise deleted for holding dummy product data.
const ourSpecsData = [
    { title: "Free Shipping", description: "Enjoy fast, free delivery on every order no conditions, just reliable doorstep.", icon: SendIcon, accent: '#05DF72' },
    { title: "7 Days easy Return", description: "Change your mind? No worries. Return any item within 7 days.", icon: ClockFadingIcon, accent: '#FF8904' },
    { title: "24/7 Customer Support", description: "We're here for you. Get expert help with our customer support.", icon: HeadsetIcon, accent: '#A684FF' }
]

const OurSpecs = () => {

    return (
        <div className='px-6 my-20 max-w-6xl mx-auto'>
            <Title visibleButton={false} title='Our Specifications' description="We offer top-tier service and convenience to ensure your shopping experience is smooth, secure and completely hassle-free." />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 gap-y-10 mt-26'>
                {
                    ourSpecsData.map((spec, index) => {
                        return (
                            <div className='relative h-44 px-8 flex flex-col items-center justify-center w-full text-center border rounded-lg group' style={{ backgroundColor: spec.accent + 10, borderColor: spec.accent + 30 }} key={index}>
                                <h3 className='text-slate-800 font-medium'>{spec.title}</h3>
                                <p className='text-sm text-slate-600 mt-3'>{spec.description}</p>
                                <div className='absolute -top-5 text-white size-10 flex items-center justify-center rounded-md group-hover:scale-105 transition' style={{ backgroundColor: spec.accent }}>
                                    <spec.icon size={20} />
                                </div>
                            </div>
                        )
                    })
                }
            </div>

        </div>
    )
}

export default OurSpecs
```

#### `components/PageTitle.jsx`

```jsx
'use client'
import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

const PageTitle = ({ heading, text, path = "/", linkText }) => {
    return (
        <div className="my-6">
            <h2 className="text-2xl font-semibold">{heading}</h2>
            <div className="flex items-center gap-3">
                <p className="text-slate-600">{text}</p>
                <Link href={path} className="flex items-center gap-1 text-green-500 text-sm">
                    {linkText} <ArrowRightIcon size={14} />
                </Link>
            </div>
        </div>
    )
}

export default PageTitle
```

#### `components/ProductCard.jsx`

```jsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

// M23: adapted for real Payload data.
// - The star-rating block is gone: Products carry no rating, and Reviews are
//   out of scope for v1 (ADR-016). It previously read `product.rating`, which
//   exists only on the dummy dataset.
// - `images` are Media relationships, so the card resolves `.url` rather than
//   treating the entry as a string path.
const ProductCard = ({ product }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. '

    const firstImage = product.images?.[0]
    const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='bg-[#F5F5F5] h-40  sm:w-60 sm:h-68 rounded-lg flex items-center justify-center'>
                {imageUrl && (
                    <Image width={500} height={500} className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' src={imageUrl} alt={firstImage?.alt || product.name} />
                )}
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <p>{product.name}</p>
                <p>{currency}{product.price}</p>
            </div>
        </Link>
    )
}

export default ProductCard
```

#### `components/ProductDescription.jsx`

```jsx
// M26: the multi-vendor "Product by {store}" attribution block is removed —
// products aren't vendor-owned, and its link pointed at /shop/[username],
// already deleted by M15. Nothing references product.store here anymore.
// No remaining state (M25 removed the Reviews tab), so this drops 'use
// client' and renders as a server component, same direction as M23's
// Redux-shedding cleanup.
const ProductDescription = ({ product }) => {

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Description */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                <p className="border-b-[1.5px] font-semibold px-3 py-2 font-medium">Description</p>
            </div>
            <p className="max-w-xl">{product.description}</p>
        </div>
    )
}

export default ProductDescription
```

#### `components/ProductDetails.jsx`

```jsx
'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { TagIcon, EarthIcon, CreditCardIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";

// M25: adapted for real Payload data.
// - `images` are Media relationships, resolved to `.url` the same way
//   ProductCard.jsx does (M23), not treated as string paths.
// - The star-rating block is gone: products carry no rating, and Reviews are
//   out of scope for v1 (ADR-016) — same fix M46 already scopes for this
//   file, pulled forward because it read `product.rating`, which real
//   products don't have, and would have thrown before rendering.
const ProductDetails = ({ product }) => {

    const productId = product.id;
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs. ';

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    const images = product.images.map((image) => typeof image === 'string' ? image : image?.url).filter(Boolean)
    const [mainImage, setMainImage] = useState(images[0]);

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
    }

    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {images.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(images[index])} className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer">
                            <Image src={image} className="group-hover:scale-103 group-active:scale-95 transition" alt="" width={45} height={45} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg ">
                    {mainImage && <Image src={mainImage} alt="" width={250} height={250} />}
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p> {currency}{product.price} </p>
                    <p className="text-xl text-slate-500 line-through">{currency}{product.mrp}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                    <TagIcon size={14} />
                    <p>Save {((product.mrp - product.price) / product.mrp * 100).toFixed(0)}% right now</p>
                </div>
                <div className="flex items-end gap-5 mt-10">
                    {
                        cart[productId] && (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">Quantity</p>
                                <Counter productId={productId} />
                            </div>
                        )
                    }
                    <button onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition">
                        {!cart[productId] ? 'Add to Cart' : 'View Cart'}
                    </button>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Free shipping worldwide </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> 100% Secured Payment </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Trusted by top brands </p>
                </div>

            </div>
        </div>
    )
}

export default ProductDetails
```

#### `components/Rating.jsx`

```jsx
import { Star } from "lucide-react";
import React from "react";

const Rating = ({ value = 4 }) => {

    return (
        <div className="flex items-center">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    className={`shrink-0 size-4 fill-current ${value > i ? "text-green-400" : "text-gray-300"}`}
                />
            ))}
        </div>
    );
};

export default Rating;
```

#### `components/RatingModal.jsx`

```jsx
'use client'

import { Star } from 'lucide-react';
import React, { useState } from 'react'
import { XIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const RatingModal = ({ ratingModal, setRatingModal }) => {

    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');

    const handleSubmit = async () => {
        if (rating < 0 || rating > 5) {
            return toast('Please select a rating');
        }
        if (review.length < 5) {
            return toast('write a short review');
        }

        setRatingModal(null);
    }

    return (
        <div className='fixed inset-0 z-120 flex items-center justify-center bg-black/10'>
            <div className='bg-white p-8 rounded-lg shadow-lg w-96 relative'>
                <button onClick={() => setRatingModal(null)} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700'>
                    <XIcon size={20} />
                </button>
                <h2 className='text-xl font-medium text-slate-600 mb-4'>Rate Product</h2>
                <div className='flex items-center justify-center mb-4'>
                    {Array.from({ length: 5 }, (_, i) => (
                        <Star
                            key={i}
                            className={`size-8 cursor-pointer ${rating > i ? "text-green-400 fill-current" : "text-gray-300"}`}
                            onClick={() => setRating(i + 1)}
                        />
                    ))}
                </div>
                <textarea
                    className='w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-green-400'
                    placeholder='Write your review (optional)'
                    rows='4'
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                ></textarea>
                <button onClick={e => toast.promise(handleSubmit(), { loading: 'Submitting...' })} className='w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition'>
                    Submit Rating
                </button>
            </div>
        </div>
    )
}

export default RatingModal
```

#### `components/Title.jsx`

```jsx
'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Title = ({ title, description, visibleButton = true, href = '' }) => {

    return (
        <div className='flex flex-col items-center'>
            <h2 className='text-2xl font-semibold text-slate-800'>{title}</h2>
            <Link href={href} className='flex items-center gap-5 text-sm text-slate-600 mt-2'>
                <p className='max-w-lg text-center'>{description}</p>
                {visibleButton && <button className='text-green-500 flex items-center gap-1'>View more <ArrowRight size={14} /></button>}
            </Link>
        </div>
    )
}

export default Title
```

### `globals/`

#### `globals/Settings.ts`

```typescript
import type { GlobalConfig } from 'payload'

// M13a: single admin-editable store configuration, closing readiness risk R6.
// Read is public (the storefront needs shipping/contact info); write is admin-only.
//
// Currency-format fields (D7 in docs/PHASE_1_READINESS_REPORT.md) are deliberately
// NOT included here — that convention (e.g. "Rs. 1,500" vs "₨1,500") is still an open
// stakeholder question in docs/PROJECT_SPEC.md, unresolved by any ADR. Adding a field
// now would mean inventing an answer to a decision this milestone group was not asked
// to make. M55 is the milestone that resolves it and should add the field then.
export const Settings: GlobalConfig = {
  slug: 'settings',
  access: {
    read: () => true,
    update: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'storeName',
      type: 'text',
      required: true,
      defaultValue: 'GoCart',
    },
    {
      name: 'contactPhone',
      type: 'text',
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'contactAddress',
      type: 'textarea',
    },
    {
      // ADR-018: flat delivery fee, admin-configurable, read by M33/M34 at
      // order-creation time only and then snapshotted onto the order.
      name: 'shippingFlatRate',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 200,
    },
    {
      // ADR-018: waived above this order subtotal.
      name: 'freeShippingThreshold',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 3000,
    },
  ],
}
```

### `lib/`

#### `lib/store.js`

```javascript
import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import addressReducer from './features/address/addressSlice'

export const makeStore = () => {
    return configureStore({
        reducer: {
            cart: cartReducer,
            address: addressReducer,
        },
    })
}
```

### `lib/features/address/`

#### `lib/features/address/addressSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit'

// M28: inlined from assets/assets.js. Still a dummy default address —
// M31 replaces this with real guest-checkout address capture.
const addressDummyData = {
    id: "addr_1",
    userId: "user_1",
    name: "John Doe",
    email: "johndoe@example.com",
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "USA",
    phone: "1234567890",
    createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)',
}

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [addressDummyData],
    },
    reducers: {
        addAddress: (state, action) => {
            state.list.push(action.payload)
        },
    }
})

export const { addAddress } = addressSlice.actions

export default addressSlice.reducer
```

### `lib/features/cart/`

#### `lib/features/cart/cartSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        total: 0,
        cartItems: {},
    },
    reducers: {
        addToCart: (state, action) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]++
            } else {
                state.cartItems[productId] = 1
            }
            state.total += 1
        },
        removeFromCart: (state, action) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]--
                if (state.cartItems[productId] === 0) {
                    delete state.cartItems[productId]
                }
            }
            state.total -= 1
        },
        deleteItemFromCart: (state, action) => {
            const { productId } = action.payload
            state.total -= state.cartItems[productId] ? state.cartItems[productId] : 0
            delete state.cartItems[productId]
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
        },
        // M30: replaces cartItems wholesale (from localStorage, on mount) and
        // recomputes total from it rather than trusting a persisted total,
        // so a stored total can never drift from the items it should match.
        hydrateCart: (state, action) => {
            const cartItems = action.payload?.cartItems ?? {}
            state.cartItems = cartItems
            state.total = Object.values(cartItems).reduce((sum, qty) => sum + qty, 0)
        },
    }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart, hydrateCart } = cartSlice.actions

export default cartSlice.reducer
```

### `lib/payload/`

#### `lib/payload/categories.ts`

```typescript
import { getPayload } from 'payload'
import config from '@payload-config'

// M22: server-side data-fetching utility for Categories. Uses Payload's Local API
// (in-process, no HTTP hop) — for Server Components, Route Handlers, and Server
// Actions only. Never import this from a 'use client' component; a client
// component that still needs category data should call Payload's REST/GraphQL
// API directly (already mounted and public-read per M13), not this file.
//
// Types below are hand-written, not generated. `payload generate:types` could not
// be run in the authoring sandbox — the same Node/tsx ESM-interop class of issue
// documented for `generate:importmap` (M3) and `scripts/seed.ts` (M13). These
// mirror collections/Categories.ts and collections/Media.ts exactly; swap for
// payload-types.ts once it can be generated in a normal environment.

export type Media = {
  id: number | string
  url?: null | string
  alt?: null | string
}

export type Category = {
  id: number | string
  title: string
  slug: string
  parent?: Category | null | number | string
  description?: null | string
  image?: Media | null | number | string
  seo?: {
    metaDescription?: null | string
    metaTitle?: null | string
  }
  displayOrder?: null | number
}

export type CategoryWithChildren = Category & { children: Category[] }

export type ProductsByCategoryResult = {
  docs: unknown[]
  page: number
  totalDocs: number
  totalPages: number
}

const CATEGORY_ORDER = ['displayOrder', 'title']

async function getClient() {
  return getPayload({ config })
}

/**
 * Top-level categories (no parent), each with its children resolved,
 * ordered by displayOrder then title. Backs /categories (M27b).
 */
export async function getTopLevelCategories(): Promise<CategoryWithChildren[]> {
  const payload = await getClient()

  const { docs: topLevel } = await payload.find({
    collection: 'categories',
    where: { parent: { exists: false } },
    sort: CATEGORY_ORDER,
    limit: 0,
    depth: 1,
    overrideAccess: false,
  })

  const withChildren = await Promise.all(
    topLevel.map(async (category) => {
      const { docs: children } = await payload.find({
        collection: 'categories',
        where: { parent: { equals: category.id } },
        sort: CATEGORY_ORDER,
        limit: 0,
        depth: 0,
        overrideAccess: false,
      })
      return { ...category, children } as CategoryWithChildren
    }),
  )

  return withChildren
}

/**
 * A single category by slug, with its parent and children resolved, for the
 * page body and breadcrumbs. Returns null for an unknown slug so the route
 * can call notFound().
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryWithChildren | null> {
  const payload = await getClient()

  const { docs } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })

  const category = docs[0]
  if (!category) return null

  const { docs: children } = await payload.find({
    collection: 'categories',
    where: { parent: { equals: category.id } },
    sort: CATEGORY_ORDER,
    limit: 0,
    depth: 0,
    overrideAccess: false,
  })

  return { ...category, children } as CategoryWithChildren
}

/**
 * Paginated products for a category. When the category is a parent (no
 * `parent` of its own), rolls up products filed under every child too — the
 * single implementation of "which products are in this category" per
 * ADR-013, shared by the category routes and the sitemap so they cannot
 * disagree. Returns null for an unknown slug.
 */
export async function getProductsByCategory(
  slug: string,
  { page = 1, limit = 24 }: { limit?: number; page?: number } = {},
): Promise<null | ProductsByCategoryResult> {
  const payload = await getClient()

  const { docs: matches } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })

  const category = matches[0]
  if (!category) return null

  let categoryIds: (number | string)[] = [category.id]

  if (!category.parent) {
    const { docs: children } = await payload.find({
      collection: 'categories',
      where: { parent: { equals: category.id } },
      limit: 0,
      depth: 0,
      overrideAccess: false,
    })
    categoryIds = [category.id, ...children.map((child) => child.id)]
  }

  const result = await payload.find({
    collection: 'products',
    where: { category: { in: categoryIds } },
    page,
    limit,
    depth: 1,
    overrideAccess: false,
  })

  return {
    docs: result.docs,
    page: result.page ?? page,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
  }
}
```

#### `lib/payload/products.ts`

```typescript
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Category, Media } from './categories'

// M22: server-side data-fetching utility for Products. Uses Payload's Local API
// (in-process, no HTTP hop) — for Server Components, Route Handlers, and Server
// Actions only. Never import this from a 'use client' component; a client
// component that still needs product data should call Payload's REST/GraphQL
// API directly (already mounted and public-read per M13), not this file.
//
// Types below are hand-written, not generated — same reasoning as categories.ts.

export type Product = {
  id: number | string
  name: string
  description: string
  mrp: number
  price: number
  images: (Media | null | number | string)[]
  category: Category | null | number | string
  inStock: boolean
  isFeatured?: boolean | null
}

export type GetProductsOptions = {
  /** 0 = no pagination, return every match. Default 0. */
  limit?: number
  page?: number
  /**
   * Payload sort string(s), e.g. '-createdAt' for newest first. No default —
   * "best selling" has no defined ranking in the current schema (no sales
   * count or review data exists; Reviews are out of scope per ADR-016), so
   * this utility does not bake in a specific business meaning for it. M23,
   * which wires BestSelling.jsx, must choose and pass an explicit sort.
   */
  sort?: string | string[]
  /**
   * Case-insensitive substring match on `name` only — ADR-025. A falsy or
   * whitespace-only value is treated as no search (returns the unfiltered
   * listing), matching the pre-M29 in-memory filter's behavior for an empty
   * search string.
   */
  search?: string
}

export type ProductsResult = {
  docs: Product[]
  page: number
  totalDocs: number
  totalPages: number
}

async function getClient() {
  return getPayload({ config })
}

/**
 * Products, optionally sorted/paginated/searched. Powers the home page
 * sections (M23) and the shop listing (M24/M29) — callers choose
 * sort/limit for their own purpose (e.g. sort: '-createdAt', limit: 4 for
 * "latest"), and `search` for the shop page's product-name query (M29,
 * ADR-025 — case-insensitive substring match on `name` only).
 */
export async function getProducts(options: GetProductsOptions = {}): Promise<ProductsResult> {
  const { limit = 0, page = 1, sort, search } = options
  const payload = await getClient()

  const trimmedSearch = search?.trim()

  const result = await payload.find({
    collection: 'products',
    where: trimmedSearch ? { name: { contains: trimmedSearch } } : undefined,
    limit,
    page,
    sort,
    depth: 1,
    overrideAccess: false,
  })

  return {
    docs: result.docs as Product[],
    page: result.page ?? page,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
  }
}

/**
 * Admin-curated products for the home page's "Best Selling" section (M23).
 *
 * Deliberately a curated flag rather than a computed ranking: there is no
 * sales-count field and nothing aggregates Orders, and Reviews — the dummy
 * data's original ranking basis — are out of scope for v1 (ADR-016). See
 * ADR-022 for why this is curated instead of derived.
 */
export async function getFeaturedProducts(
  options: Omit<GetProductsOptions, 'page'> = {},
): Promise<ProductsResult> {
  const { limit = 0, sort = '-createdAt' } = options
  const payload = await getClient()

  const result = await payload.find({
    collection: 'products',
    where: { isFeatured: { equals: true } },
    limit,
    sort,
    depth: 1,
    overrideAccess: false,
  })

  return {
    docs: result.docs as Product[],
    page: result.page ?? 1,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
  }
}

/**
 * A single product by id, for the product detail page (M25). Returns null
 * for an unknown id so the route can call notFound() instead of rendering
 * a blank page.
 */
export async function getProductById(id: number | string): Promise<null | Product> {
  const payload = await getClient()

  const product = await payload.findByID({
    collection: 'products',
    id,
    depth: 1,
    overrideAccess: false,
    disableErrors: true,
  })

  return (product as Product | undefined) ?? null
}
```

### `scripts/`

#### `scripts/seed.ts`

```typescript
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../payload.config'

// M13: seed a handful of dev records — parent/child categories with products —
// so later milestones (M22+) have real data to build against.
//
// This originally read placeholder images from assets/, but M28 (8c20d4f) deleted
// that directory along with the dummy dataset, which left the seed failing with
// ENOENT before it created anything. Products.images is required, so the images
// cannot simply be dropped — each record now gets a generated placeholder instead,
// so the seed no longer depends on a directory that does not exist.

// One shade per placeholder so the four seeded products stay distinguishable in /admin.
const placeholderColours = [
  { r: 203, g: 213, b: 225 },
  { r: 148, g: 163, b: 184 },
  { r: 100, g: 116, b: 139 },
  { r: 71, g: 85, b: 105 },
]

async function readAsset(name: string) {
  // Asset names are product_img1.png … product_img4.png; fall back to the first
  // shade if a caller ever passes a name without a number.
  const position = Number(name.match(/\d+/)?.[0] ?? 1)
  const background = placeholderColours[(position - 1) % placeholderColours.length]

  const data = await sharp({
    create: { width: 512, height: 512, channels: 3, background },
  })
    .png()
    .toBuffer()

  return {
    data,
    mimetype: 'image/png',
    name,
    size: data.length,
  }
}

async function seed() {
  const payload = await getPayload({ config })

  payload.logger.info('Seeding dev data...')

  const [imgLamp, imgSpeaker, imgWatch, imgHeadphones] = await Promise.all([
    payload.create({
      collection: 'media',
      data: { alt: 'Modern table lamp' },
      file: await readAsset('product_img1.png'),
    }),
    payload.create({
      collection: 'media',
      data: { alt: 'Smart speaker' },
      file: await readAsset('product_img2.png'),
    }),
    payload.create({
      collection: 'media',
      data: { alt: 'Smart watch' },
      file: await readAsset('product_img3.png'),
    }),
    payload.create({
      collection: 'media',
      data: { alt: 'Wireless headphones' },
      file: await readAsset('product_img4.png'),
    }),
  ])

  // slug is required on Categories and is normally filled in by the collection's
  // beforeValidate hook, which TypeScript cannot see — so the seed sets it
  // explicitly. Values are identical to what slugify() derives from each title.
  const electronics = await payload.create({
    collection: 'categories',
    data: {
      title: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets and smart devices.',
      displayOrder: 1,
    },
  })

  const speakers = await payload.create({
    collection: 'categories',
    data: { title: 'Speakers', slug: 'speakers', parent: electronics.id, displayOrder: 1 },
  })

  const headphonesCategory = await payload.create({
    collection: 'categories',
    data: { title: 'Headphones', slug: 'headphones', parent: electronics.id, displayOrder: 2 },
  })

  const fashion = await payload.create({
    collection: 'categories',
    data: {
      title: 'Fashion',
      slug: 'fashion',
      description: 'Watches and accessories.',
      displayOrder: 2,
    },
  })

  const watches = await payload.create({
    collection: 'categories',
    data: { title: 'Watches', slug: 'watches', parent: fashion.id, displayOrder: 1 },
  })

  await Promise.all([
    // Directly under a parent category (valid — appears on the parent's page).
    payload.create({
      collection: 'products',
      data: {
        name: 'Modern Table Lamp',
        description: 'Modern table lamp with a sleek design.',
        mrp: 4000,
        price: 2900,
        images: [imgLamp.id],
        category: electronics.id,
        inStock: true,
      },
    }),
    payload.create({
      collection: 'products',
      data: {
        name: 'Smart Speaker Gray',
        description: 'Smart speaker with a sleek design.',
        mrp: 5000,
        price: 2900,
        images: [imgSpeaker.id],
        category: speakers.id,
        inStock: true,
        // M23: seeds the home page's "Best Selling" section, which is
        // admin-curated rather than computed (ADR-022).
        isFeatured: true,
      },
    }),
    payload.create({
      collection: 'products',
      data: {
        name: 'Wireless Headphones',
        description: 'Wireless headphones with a sleek design.',
        mrp: 7000,
        price: 2900,
        images: [imgHeadphones.id],
        category: headphonesCategory.id,
        inStock: true,
        isFeatured: true,
      },
    }),
    payload.create({
      collection: 'products',
      data: {
        name: 'Smart Watch White',
        description: 'Smart watch with a sleek design.',
        mrp: 6000,
        price: 2900,
        images: [imgWatch.id],
        category: watches.id,
        inStock: false,
      },
    }),
  ])

  payload.logger.info('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
```
