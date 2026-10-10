import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "../globals.css";
import { getSiteUrl } from "@/lib/site-url";
import { getSettings } from "@/lib/payload/settings";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

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

export default function PublicLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${outfit.className} antialiased`}>
                <StoreProvider>
                    <Toaster />
                    <Navbar />
                    {children}
                    <Footer />
                </StoreProvider>
            </body>
        </html>
    );
}
