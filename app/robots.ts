import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

// M42: crawl everything public; keep crawlers out of the admin panel and the API. Cart, order
// lookup and order confirmation are kept out of the index with `noindex` on the pages
// themselves (M41) rather than disallowed here — a disallowed page can still be indexed as
// a bare URL, while noindex needs the crawler to be allowed to read it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
