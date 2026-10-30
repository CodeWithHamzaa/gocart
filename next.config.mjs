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

    // ADR-036 (B1 mitigation, kept): the image optimizer is switched OFF and its endpoint is closed.
    // It was introduced because `next@15.4.11` was affected by critical Image Optimization API
    // advisories (GHSA-2xp9-vwfh-vxw4, unauthenticated RCE "when AVIF files are used"). `next` is now
    // 16.4.2 (M79, ADR-040 (Accepted 2026-10-24)), which fixes the later advisories GHSA-2464-fhr4-w9xw (RCE
    // when SVG files are used), GHSA-p3m5-59mp-jv5r and GHSA-673q-mjm6-r5xr; the mitigation stays
    // as defence in depth and to keep the behaviour unchanged:
    //   - `unoptimized: true`: <Image> emits the original /api/media/file/... URL; nothing resizes
    //     or re-encodes an upload on the server, so no uploaded file reaches sharp/libvips through
    //     a public endpoint.
    //   - the rewrite below sends EVERY /_next/image request to a 404, so the endpoint cannot be
    //     reached even though Next still registers it.
    //   - collections/Media.ts accepts only JPEG, PNG, WebP and GIF uploads (no AVIF, SVG, HEIC...).
    // The cost is larger image downloads on mobile.
    images: {
        unoptimized: true,
        // M100 (ADR-046): media stored in Vercel Blob (the free test deployment) lives on
        // <store-id>.public.blob.vercel-storage.com. Harmless elsewhere: with `unoptimized` the
        // optimizer is never called, and no other host is added.
        remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
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
