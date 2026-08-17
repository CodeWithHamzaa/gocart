import config from '@payload-config'
import { GRAPHQL_POST } from '@payloadcms/next/routes'

// Completes M3's stated goal ("mount its admin UI and REST/GraphQL API") — the
// REST catch-all was mounted at M3, but the GraphQL endpoint was not. M10's
// testing bar requires products be retrievable via GraphQL, which needs this.
export const POST = GRAPHQL_POST(config)
