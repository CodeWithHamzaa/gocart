import { notFound } from 'next/navigation'

// M98: the app has two root layouts ((public) and Payload's), so an unknown URL used to fall
// through to Next's bare default 404 with no header, footer or way back. This catch-all sits below
// every real route (static segments such as /admin, /api and /shop always win) and hands the
// request to (public)/not-found.tsx, which renders inside the store layout with a real HTTP 404.
export default function Missing() {
  notFound()
}
