import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import CodSteps from "@/components/CodSteps";
import CategoryShowcase from "@/components/CategoryShowcase";
import LatestProducts from "@/components/LatestProducts";
import DealsOfTheDay from "@/components/DealsOfTheDay";
import PromoCards from "@/components/PromoCards";
import { getPromoCards } from "@/lib/payload/promo-cards";
import { getAdminHeroSlides } from "@/lib/payload/hero-slides";
import { getStorefrontContent } from "@/lib/payload/storefront-content";
import { getProducts, getFeaturedProducts, getDealProducts } from "@/lib/payload/products";
import { getSettings } from "@/lib/payload/settings";
import { getCategoriesCached } from "@/lib/payload/categories";
import { DEFAULT_DESCRIPTION, pageMetadata, shareImages } from "@/lib/seo";
import { buildHeroSlides } from "@/lib/hero-slides";

// M68: up to twelve featured products, so smaller categories still get a tab.
// M62: the redesigned layout. The latest and featured grids hold up to five and ten products (a row
// of five on a wide screen). M102: the category shortcuts carry every category link in the HTML.
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
    const [{ storeName }, featured] = await Promise.all([getSettings(), getFeaturedProducts({ limit: 1 })]);
    // M107: the share image is the lead featured product's photo (the newest product if none is featured).
    const lead = featured.docs[0] ?? (await getProducts({ sort: '-createdAt', limit: 1 })).docs[0];
    return pageMetadata({
        storeName,
        title: `${storeName} - Online shopping with Cash on Delivery in Pakistan`,
        description: DEFAULT_DESCRIPTION,
        path: '/',
        absoluteTitle: true,
        images: shareImages(lead?.images?.[0]),
    });
}

export default async function Home() {

    const [latest, featured, cheapest, settings, categories, promoCards, deals, adminSlides, content] = await Promise.all([
        // M101: the newest products, for New arrivals and to top up Featured (below); 24 leaves enough of
        // both after the featured ones are taken out.
        getProducts({ sort: '-createdAt', limit: 24 }),
        getFeaturedProducts({ limit: 12 }),
        getProducts({ sort: 'price', limit: 1 }),
        getSettings(),
        getCategoriesCached(),
        getPromoCards(),
        // M91: a failed read hides the section rather than failing the page.
        getDealProducts({ limit: 5 }).catch(() => []),
        // M110: slides made in /admin and the editable wording; a failed read falls back to the automatic slides / old wording.
        getAdminHeroSlides(),
        getStorefrontContent(),
    ]);
    const startingPrice = typeof cheapest.docs[0]?.price === 'number' ? cheapest.docs[0].price : null;
    const shipping = { flatRate: settings.shippingFlatRate, freeShippingThreshold: settings.freeShippingThreshold };

    // M101: "New arrivals" and "Featured" had the same products side by side. New arrivals now leave
    // out anything already featured; if that leaves nothing (a tiny catalogue), the newest are shown.
    // Featured shows at least two full rows of four (and three when there are enough): every product the
    // admin flagged comes first, then the newest in-stock products fill the last row. Flagged products are
    // never dropped; only the top-up is cut to the row. New arrivals then leave out everything shown here.
    const ROW = 4;
    const flagged = featured.docs;
    const target = Math.min(12, Math.max(2 * ROW, Math.ceil(flagged.length / ROW) * ROW));
    const flaggedIds = new Set(flagged.map((product) => product.id));
    // Nothing flagged: no top-up, so the section stays hidden instead of calling the newest products featured.
    const topUp = flagged.length === 0 ? [] : latest.docs.filter((product) => !flaggedIds.has(product.id) && product.inStock === true).slice(0, Math.max(0, target - flagged.length));
    const featuredShown = [...flagged, ...topUp];
    const featuredIds = new Set(featuredShown.map((product) => product.id));
    const notFeatured = latest.docs.filter((product) => !featuredIds.has(product.id));
    const newArrivals = (notFeatured.length > 0 ? notFeatured : latest.docs).slice(0, 8);

    // M101: the banner's slides (deals, new arrivals, delivery), from data already loaded above.
    // M110: while at least one admin slide is active, only those show; otherwise the automatic slides.
    const slides = adminSlides.length > 0 ? adminSlides : buildHeroSlides({ latest: latest.docs, featured: featured.docs, categories, shipping, startingPrice });

    // M102: the desktop "Shop by category" tiles are removed (owner, 2026-11-01); the shortcuts under the
    // banner (circles on a phone, pills from `sm`) are the home page's only category row.
    // M101 (ADR-047): the owner's chosen layout: the "V1" banner, then categories (tiles from `md`, a
    // swipeable circle row on a phone), large-card rails for new arrivals and featured products, and the
    // three cash-on-delivery steps in place of the trust row. Deals and promo cards stay as they were.
    // M118 (premium redesign, Phase 2): an editorial rhythm instead of grid after grid: the banner, every
    // category as photo tiles, the curated Featured grid ("Featured", not "Best sellers": ADR-022), the
    // admin's promotions, limited-time deals, the aubergine "Why shop with" band, then the New arrivals
    // rail, so the dark band never sits against the dark footer. Sections with no data stay hidden.
    return (
        <div>
            <Hero slides={slides} />
            <CategoryShowcase categories={categories} />
            <BestSelling products={featuredShown} categories={categories} content={content} />
            <PromoCards cards={promoCards} />
            <DealsOfTheDay products={deals} />
            <CodSteps shipping={shipping} storeName={settings.storeName} />
            <LatestProducts products={newArrivals} content={content} />
        </div>
    );
}
