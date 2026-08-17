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
