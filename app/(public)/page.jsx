import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import CategoryRow, { CategoryGrid } from "@/components/CategoryRow";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import { getProducts, getFeaturedProducts } from "@/lib/payload/products";
import { getSettings } from "@/lib/payload/settings";
import { getTopLevelCategoriesCached } from "@/lib/payload/categories";
import { DEFAULT_DESCRIPTION, pageMetadata } from "@/lib/seo";

// M68: up to twelve featured products, so smaller categories still get a tab.
// M62: the redesigned layout. The latest and featured grids hold up to five and ten products (a row
// of five on a wide screen); the category tiles carry every parent and child link in the HTML.
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
        getProducts({ sort: '-createdAt', limit: 5 }),
        getFeaturedProducts({ limit: 12 }),
        getProducts({ sort: 'price', limit: 1 }),
        getSettings(),
        getTopLevelCategoriesCached(),
    ]);
    const startingPrice = typeof cheapest.docs[0]?.price === 'number' ? cheapest.docs[0].price : null;
    const shipping = { flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold };

    // M45a: the hero's floating tiles are real, in-stock products with an image — featured first,
    // then the latest — de-duplicated, at most three. No extra query: both lists are already here.
    const seen = new Set();
    const showcase = [...featured.docs, ...latest.docs]
        .filter((product) => {
            if (seen.has(product.id) || product.inStock !== true) return false;
            seen.add(product.id);
            return true;
        })
        .map((product) => {
            const image = product.images?.[0];
            const imageUrl = typeof image === 'string' ? image : image?.url;
            return imageUrl ? { id: product.id, name: product.name, price: product.price, imageUrl } : null;
        })
        .filter(Boolean)
        .slice(0, 3);

    return (
        <div>
            <Hero shipping={shipping} startingPrice={startingPrice} showcase={showcase} />
            <CategoryRow categories={topLevelCategories} />
            <CategoryGrid categories={topLevelCategories} />
            <LatestProducts products={latest.docs} total={latest.totalDocs} />
            <BestSelling products={featured.docs} total={featured.totalDocs} categories={topLevelCategories} />
            <OurSpecs shipping={shipping} />
        </div>
    );
}
