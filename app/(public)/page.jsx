import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import HomeCategories from "@/components/HomeCategories";
import CodSteps from "@/components/CodSteps";
import LatestProducts from "@/components/LatestProducts";
import DealsOfTheDay from "@/components/DealsOfTheDay";
import PromoCards from "@/components/PromoCards";
import { getPromoCards } from "@/lib/payload/promo-cards";
import { getProducts, getFeaturedProducts, getDealProducts } from "@/lib/payload/products";
import { getSettings } from "@/lib/payload/settings";
import { getTopLevelCategoriesCached } from "@/lib/payload/categories";
import { DEFAULT_DESCRIPTION, pageMetadata } from "@/lib/seo";
import { buildHeroSlides } from "@/lib/hero-slides";

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

    // M101: "New arrivals" and "Featured" had the same products side by side. New arrivals now leave
    // out anything already featured; if that leaves nothing (a tiny catalogue), the newest are shown.
    const featuredIds = new Set(featured.docs.map((product) => product.id));
    const notFeatured = latest.docs.filter((product) => !featuredIds.has(product.id));
    const newArrivals = (notFeatured.length > 0 ? notFeatured : latest.docs).slice(0, 8);

    // M101: the banner's slides (deals, new arrivals, delivery), from data already loaded above.
    const slides = buildHeroSlides({ latest: latest.docs, featured: featured.docs, topLevel: topLevelCategories, shipping, startingPrice });

    // M101 (ADR-047): the owner's chosen layout: the "V1" banner, then categories (tiles from `md`, a
    // swipeable circle row on a phone), large-card rails for new arrivals and featured products, and the
    // three cash-on-delivery steps in place of the trust row. Deals and promo cards stay as they were.
    return (
        <div>
            <Hero slides={slides} categories={topLevelCategories} shipping={shipping} />
            <HomeCategories categories={topLevelCategories} />
            <DealsOfTheDay products={deals} />
            <LatestProducts products={newArrivals} />
            <CodSteps shipping={shipping} />
            <BestSelling products={featured.docs} categories={topLevelCategories} />
            <PromoCards cards={promoCards} />
        </div>
    );
}
