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
    },

    // ADR-036 (B1, interim mitigation; supersedes ADR-034's optimizer). `next@15.4.11` is affected
    // by critical advisories in the Image Optimization API (GHSA-2xp9-vwfh-vxw4, unauthenticated RCE
    // "when AVIF files are used", fixed only in 15.5.24+ / 16.3+), and Payload 3.90.2's peer range
    // excludes every 15.5.x release, so a patched Next needs a major upgrade that is its own
    // milestone. Until then the optimizer is switched OFF and its endpoint is closed:
    //   - `unoptimized: true`: <Image> emits the original /api/media/file/... URL; nothing resizes
    //     or re-encodes an upload on the server, so no uploaded file reaches sharp/libvips through
    //     a public endpoint.
    //   - the rewrite below sends EVERY /_next/image request to a 404, so the endpoint cannot be
    //     reached even though Next still registers it.
    //   - collections/Media.ts accepts only JPEG, PNG, WebP and GIF uploads (no AVIF, SVG, HEIC...).
    // The cost is larger image downloads on mobile; revisit with the Next 16 upgrade, which must
    // happen before launch (docs/DEPLOYMENT.md "Launch blockers").
    images: {
        unoptimized: true,
    },

    // ADR-036: /_next/image is closed (see above). `missing: []` is not used on purpose: the
    // rewrite must apply to every request, whatever its query string.
    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: '/_next/image',
                    destination: '/_next/static/image-url-rejected',
                },
            ],
        }
    },

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
