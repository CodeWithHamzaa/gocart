import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "../globals.css";
import { getSiteUrl } from "@/lib/site-url";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

// M55a: the Footer reads the Settings global. Statically rendered pages would freeze
// that at build time, so the public tree revalidates (at most 60s stale) and an admin
// edit to the contact details reaches the storefront without a redeploy.
export const revalidate = 60;

export const metadata = {
    // Resolves relative URLs (canonical, Open Graph). Comes only from NEXT_PUBLIC_SITE_URL.
    metadataBase: new URL(getSiteUrl()),
    title: "GoCart. - Shop smarter",
    description: "GoCart. - Shop smarter",
};

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
