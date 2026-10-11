import { withPayload } from '@payloadcms/next/withPayload'

// M52 (ADR-033 decision 6): admit only the site's own origin for Server Actions. Behind the
// tunnel the Host header is preserved, so this is a precaution against a silent checkout break.
// Unset or unparseable NEXT_PUBLIC_SITE_URL (dev, CI e2e) adds nothing.
let siteHost
try {
    siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '').host
} catch {
    siteHost = undefined
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    // M49: the production image runs a self-contained server (`node server.js`) with only the
    // files it needs, instead of the whole repository and every dependency. Opt-in (the
    // Dockerfile's build stage sets it) so `next start`, `next dev` and the CI e2e job, which use
    // `next start`, are unchanged.
    ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),

    experimental: {
        ...(siteHost ? { serverActions: { allowedOrigins: [siteHost] } } : {}),
        // M51: refuse to decode a source image above 40 megapixels (default ~268 MP), so one huge
        // upload cannot exhaust a small VPS's memory. Larger images are served as the original.
        imgOptMaxInputPixels: 40_000_000,
    },

    // M51 (replaces `unoptimized: true`, a Vercel-style shortcut): product images go through
    // Next's built-in optimizer (/_next/image, sharp, cached on disk under .next/cache/images).
    // It is a public, CPU-bound endpoint, so it is limited to the store's own media:
    //   - no `remotePatterns`; `localPatterns` admits only /api/media/file/<one segment>, where
    //     Payload serves uploads (collections/Media.ts, ADR-020). Anything else is a 400.
    //   - `formats` WebP only: AVIF encodes several times slower for a few percent smaller files,
    //     the wrong trade on a ~$10 single-vCPU VPS (ADR-015). Revisit with a CDN cache.
    //   - `w` must be one of 7 sizes and `q` must be 75, so one file has at most 7 variants per
    //     output format. Every <Image> passes `sizes` so the browser picks from this list.
    //   - SVG stays off (`dangerouslyAllowSVG` default).
    // The optimizer's cache key is the raw `url` text, which `localPatterns` cannot fully pin
    // (it ignores `#...` and an empty `?`, and Payload decodes `%2e` and `a.jpg;x` style forms to
    // the same file). So the `rewrites` below send any `url` that is not the exact form Payload
    // itself emits (/api/media/file/ + encodeURIComponent(filename)) to a 404 before the
    // optimizer runs. The bound is then: at most 7 widths x 1 quality x 1 output format
    // (per Accept type) for each real file. Distinct real files are bounded only by uploads.
    // Cache lifetime: a variant lives for max(origin Cache-Control, minimumCacheTTL); one day
    // matches the M45 rule below, so a replaced image shows within a day.
    images: {
        formats: ['image/webp'],
        localPatterns: [{ pathname: '/api/media/file/*', search: '' }],
        imageSizes: [64, 128, 256, 384],
        deviceSizes: [640, 828, 1080],
        qualities: [75],
        minimumCacheTTL: 86400,
    },

    // M51: reject any /_next/image `url` that is not canonical Payload media (see above). The
    // name is one path segment of unreserved characters (what encodeURIComponent leaves alone)
    // or upper-case %XX escapes of the characters it does escape; an escape of an unreserved
    // character (%2e, %61) or a lower-case one is a different spelling of the same file.
    async rewrites() {
        const escaped = '%(?!(?:2[1789ADE]|3[0-9]|4[1-9A-F]|5[0-9AF]|6[1-9A-F]|7[0-9AE]))[0-9A-F]{2}'
        const name = `(?:[A-Za-z0-9._~!*'()-]|${escaped})+`
        return {
            beforeFiles: [
                {
                    source: '/_next/image',
                    missing: [{ type: 'query', key: 'url', value: `/api/media/file/${name}` }],
                    destination: '/_next/static/image-url-rejected',
                },
            ],
        }
    },

    // M45: Next.js streams <title>/<meta> into the <body> for ordinary browsers on statically
    // cached pages (category pages) and only moves them into <head> with JavaScript; only bots
    // matching this pattern get them in <head> up front. A crawler or link-preview scraper that
    // does not run JavaScript (and Lighthouse, which flagged "no meta description") would miss
    // them. Matching every user agent restores blocking metadata everywhere: the head is
    // complete in the first HTML response. Cost: the head waits for generateMetadata, which on
    // these pages is a cached read.
    htmlLimitedBots: /.*/,

    async headers() {
        return [
            {
                // M45: Payload serves uploaded media with no Cache-Control or ETag, so every
                // repeat visit re-downloaded every product image. One day, plus a week of
                // stale-while-revalidate: a replaced image appears within a day (not "immutable"
                // because an admin can replace a file under the same name).
                source: '/api/media/file/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
                ],
            },
        ]
    },
};

export default withPayload(nextConfig)
