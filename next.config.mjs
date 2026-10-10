import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        // Left as is on purpose: removing it and making optimization work under Docker is M51.
        unoptimized: true
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
