import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import { CategoryGrid } from "@/components/CategoryRow";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import DealsOfTheDay from "@/components/DealsOfTheDay";
import PromoCards from "@/components/PromoCards";
import { getPromoCards } from "@/lib/payload/promo-cards";
import { getProducts, getFeaturedProducts, getDealProducts } from "@/lib/payload/products";
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
// M101: `absoluteTitle` keeps the brand out of og:title a second time (it read "... | Mirza").
export async function generateMetadata() {
    const { storeName } = await getSettings();
    return pageMetadata({
        storeName,
        title: `${storeName} - Online shopping with Cash on Delivery in Pakistan`,
        description: DEFAULT_DESCRIPTION,
        path: '/',
        absoluteTitle: true,
    });
}

export default async function Home() {

    const [latest, featured, cheapest, settings, topLevelCategories, promoCards, deals] = await Promise.all([
        // M101: ten newest, so up to five remain after the featured ones are taken out (below).
        getProducts({ sort: '-createdAt', limit: 10 }),
        getFeaturedProducts({ limit: 12 }),
        getProducts({ sort: 'price', limit: 1 }),
        getSettings(),
        getTopLevelCategoriesCached(),
        getPromoCards(),
        // M91: a failed read hides the section rather than failing the page.
        getDealProducts({ limit: 5 }).catch(() => []),
    ]);
    const startingPrice = typeof cheapest.docs[0]?.price === 'number' ? cheapest.docs[0].price : null;
    const shipping = { flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold };

    // M45a: the hero's floating tiles are real, in-stock products with an image — featured first,
    // then the latest — de-duplicated, at most four (M101). No extra query: both lists are already here.
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
        .slice(0, 4);

    // M101: "New arrivals" and "Featured" had the same products side by side. New arrivals now leave
    // out anything already featured; if that leaves nothing (a tiny catalogue), the newest are shown.
    const featuredIds = new Set(featured.docs.map((product) => product.id));
    const notFeatured = latest.docs.filter((product) => !featuredIds.has(product.id));
    const newArrivals = (notFeatured.length > 0 ? notFeatured : latest.docs).slice(0, 5);

    return (
        <div>
            <Hero startingPrice={startingPrice} showcase={showcase} />
            {/* M101: one category section (the phone-only circle row above it repeated the same links). */}
            <CategoryGrid categories={topLevelCategories} />
            <DealsOfTheDay products={deals} />
            <LatestProducts products={newArrivals} />
            <BestSelling products={featured.docs} categories={topLevelCategories} />
            <PromoCards cards={promoCards} />
            <OurSpecs shipping={shipping} />
        </div>
    );
}
