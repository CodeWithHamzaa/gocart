import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import CategoryNav from "@/components/ui/CategoryNav";
import MobileTabBar from "@/components/ui/MobileTabBar";
import "../globals.css";
import { getSiteUrl } from "@/lib/site-url";
import { getSettings } from "@/lib/payload/settings";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

// M45: display "swap" shows text in the fallback font immediately instead of blocking on the font.
// M60: the redesign's typeface, only the weights the design uses (400-800; 800 is the heading weight).
// M72: self-hosted. next/font/google fetched the font from Google's font servers while `next build`
// ran, so a failed request failed the build. The file in app/fonts is the upstream variable font
// (google/fonts, ofl/plusjakartasans, SIL OFL 1.1, licence beside it), unmodified. One file covers
// every weight in the range. Exposed as --font-jakarta, which app/globals.css maps to font-sans.
const jakarta = localFont({
    src: [{ path: "../fonts/PlusJakartaSans-Variable.ttf", style: "normal", weight: "400 800" }],
    display: "swap",
    variable: "--font-jakarta",
});

// M55a: the Footer reads the Settings global. Statically rendered pages would freeze
// that at build time, so the public tree revalidates (at most 60s stale) and an admin
// edit to the contact details reaches the storefront without a redeploy.
export const revalidate = 60;

// M41: site-wide defaults. Pages add their own title (the template appends the store name),
// description, canonical and Open Graph via pageMetadata() in lib/seo.ts. The store name is
// the Settings value, so renaming the store in /admin renames it everywhere.
export async function generateMetadata() {
    const { storeName } = await getSettings();
    return {
        // Resolves relative URLs (canonical, Open Graph). Comes only from NEXT_PUBLIC_SITE_URL.
        metadataBase: new URL(getSiteUrl()),
        title: { default: `${storeName} - Shop smarter`, template: `%s | ${storeName}` },
        description: DEFAULT_DESCRIPTION,
        openGraph: { type: "website", siteName: storeName, locale: "en_PK" },
    };
}

export default async function PublicLayout({ children }) {
    // M61: the header shows the store's own name (memoised, so this is the same query the metadata,
    // announcement bar and footer already make).
    const { storeName } = await getSettings();
    return (
        <html lang="en" className={jakarta.variable}>
            <body className="font-sans antialiased bg-page text-ink">
                <StoreProvider>
                    <Toaster />
                    {/* M44: keyboard and screen-reader users can jump past the header. */}
                    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-3 focus:text-slate-800 focus:shadow">
                        Skip to content
                    </a>
                    <AnnouncementBar />
                    <Navbar storeName={storeName}>
                        <CategoryNav />
                    </Navbar>
                    <main id="main">{children}</main>
                    <Footer />
                    <MobileTabBar />
                </StoreProvider>
            </body>
        </html>
    );
}
