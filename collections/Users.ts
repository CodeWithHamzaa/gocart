import { Forbidden } from 'payload'
import type { CollectionConfig } from 'payload'

// M6/M7: the single authenticated role in the system (ADR-006).
//
// M52b/ADR-036 (B2): Payload's create-first-user flow (`POST /api/users/first-register`, and the
// /admin create-first-user screen) bypasses `access.create` and lets whoever reaches the site
// first become an admin with full access to order data. The beforeOperation hook below closes
// it: an unauthenticated `create` is refused unless it comes from the server-side bootstrap
// script (scripts/bootstrap-admin.ts passes ADMIN_BOOTSTRAP_CONTEXT through the Local API, which
// no HTTP request can do) or the process was started with PAYLOAD_ALLOW_FIRST_REGISTER=1
// (development and CI only; check-env refuses it in production and the production compose never
// passes it). The first production admin is therefore created from a secret during the deploy
// migrate step, never by a visitor.

/** Local-API `context` key that only scripts/bootstrap-admin.ts sets. */
export const ADMIN_BOOTSTRAP_CONTEXT = 'gocartAdminBootstrap'

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
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        if (operation !== 'create') return
        if (req.user) return // an authenticated admin adding another admin
        if (req.context?.[ADMIN_BOOTSTRAP_CONTEXT] === true) return
        if (process.env.PAYLOAD_ALLOW_FIRST_REGISTER === '1') return
        throw new Forbidden(req.t)
      },
    ],
  },
  fields: [],
}
