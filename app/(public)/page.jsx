import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import { getProducts, getFeaturedProducts } from "@/lib/payload/products";
import { getSettings } from "@/lib/payload/settings";

// M23: server component — the product sections are fetched through Payload's
// Local API and rendered into the initial HTML, so their content is crawlable
// (ADR-007) instead of appearing only after client hydration. The remaining
// 'use client' directives on this page's other children (Hero,
// OurSpecs) are M40's pass, not this milestone's.

// Rendered per request rather than prerendered at build time. Two reasons:
// an admin toggling `isFeatured` (ADR-022) must see the home page change
// without a redeploy, which static prerendering would prevent; and building
// the app would otherwise require a reachable database, which the production
// image build (M49) cannot assume. Revisit as ISR at M45 if this page needs
// the caching — SSR already satisfies the SEO requirement either way.
export const dynamic = 'force-dynamic'

export default async function Home() {

    const [latest, featured, cheapest, settings] = await Promise.all([
        getProducts({ sort: '-createdAt', limit: 4 }),
        getFeaturedProducts({ limit: 8 }),
        getProducts({ sort: 'price', limit: 1 }),
        getSettings(),
    ]);
    const startingPrice = typeof cheapest.docs[0]?.price === 'number' ? cheapest.docs[0].price : null;

    return (
        <div>
            <Hero freeShippingThreshold={settings.freeShippingThreshold} startingPrice={startingPrice} />
            <LatestProducts products={latest.docs} total={latest.totalDocs} />
            <BestSelling products={featured.docs} total={featured.totalDocs} />
            <OurSpecs />
        </div>
    );
}
