import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import { getProducts, getFeaturedProducts } from "@/lib/payload/products";
import { getSettings } from "@/lib/payload/settings";
import { getTopLevelCategories } from "@/lib/payload/categories";
import { DEFAULT_DESCRIPTION, pageMetadata } from "@/lib/seo";

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

// M41: the home page's own title is the store name plus what it sells (no template suffix).
export async function generateMetadata() {
    const { storeName } = await getSettings();
    const base = pageMetadata({
        storeName,
        title: `${storeName} - Gadgets & accessories, Cash on Delivery`,
        description: DEFAULT_DESCRIPTION,
        path: '/',
    });
    return { ...base, title: { absolute: `${storeName} - Gadgets & accessories, Cash on Delivery` } };
}

export default async function Home() {

    const [latest, featured, cheapest, settings, topLevelCategories] = await Promise.all([
        getProducts({ sort: '-createdAt', limit: 4 }),
        getFeaturedProducts({ limit: 8 }),
        getProducts({ sort: 'price', limit: 1 }),
        getSettings(),
        getTopLevelCategories(),
    ]);
    // Every category, parents then their children, as plain links for the home page marquee.
    const categories = topLevelCategories.flatMap((category) => [category, ...category.children]);
    const startingPrice = typeof cheapest.docs[0]?.price === 'number' ? cheapest.docs[0].price : null;

    return (
        <div>
            <Hero freeShippingThreshold={settings.freeShippingThreshold} startingPrice={startingPrice} categories={categories} />
            <LatestProducts products={latest.docs} total={latest.totalDocs} />
            <BestSelling products={featured.docs} total={featured.totalDocs} />
            <OurSpecs shipping={{ flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold }} />
        </div>
    );
}
