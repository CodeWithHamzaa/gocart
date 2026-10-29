import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { getSettings } from "@/lib/payload/settings";
import { getTopLevelCategoriesCached } from "@/lib/payload/categories";

// M55a: server component. The contact block is read from the Settings global (M13a)
// so an admin edit shows without a redeploy (the public layout revalidates), and a
// value that is not configured is simply not shown — never replaced by a placeholder.
// A mailto: link only for a plain address (no ?/&/# that could add headers); otherwise text.
// M61: the redesign's light footer. Same content and links as before, on the new tokens. The
// design's "Sell on ...", "Careers", newsletter and card/wallet lines are left out: this is a
// single COD store (ADR-004, ADR-006) with no such pages. The sections are plain lists, not <nav>
// landmarks, so the header stays the only nav that holds Shop, Search and Cart (e2e/mobile.spec.ts).
const SAFE_EMAIL = /^[^\s@?&#]+@[^\s@?&#]+$/

const Footer = async () => {

    const [settings, topLevel] = await Promise.all([getSettings(), getTopLevelCategoriesCached().catch(() => [])])

    const linkSections = [
        {
            // M44: real categories (these used to be fake "Smartphones"/"Laptops" links to /).
            title: "Shop",
            links: [
                ...topLevel.slice(0, 6).map((category) => ({ text: category.title, path: `/category/${category.slug}`, icon: null })),
                { text: "All products", path: '/shop', icon: null },
            ]
        },
        {
            title: "Help",
            links: [
                { text: "Home", path: '/', icon: null },
                { text: "All categories", path: '/categories', icon: null },
                { text: "Check your order", path: '/orders', icon: null },
            ]
        },
        {
            title: "Contact",
            links: [
                settings.contactPhone && { text: settings.contactPhone, path: `tel:${settings.contactPhone.replace(/[^\d+]/g, '')}`, icon: PhoneIcon },
                settings.contactEmail && { text: settings.contactEmail, path: SAFE_EMAIL.test(settings.contactEmail) ? `mailto:${settings.contactEmail}` : null, icon: MailIcon },
                settings.contactAddress && { text: settings.contactAddress, path: null, icon: MapPinIcon },
            ].filter(Boolean)
        }
    ].filter((section) => section.links.length > 0);

    return (
        <footer className="mt-14 border-t border-line bg-white text-sm text-muted">
            <div className="mx-auto flex max-w-[83rem] flex-col gap-9 px-4 pb-7 pt-12 sm:px-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
                    <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
                        <Link href="/" className="text-2xl font-extrabold tracking-[-0.03em] text-ink">
                            <BrandLogo name={settings.storeName} mark={false} />
                        </Link>
                        <p className="max-w-[260px]">Order online and pay cash on delivery across Pakistan.</p>
                    </div>
                    {linkSections.map((section) => (
                        <div key={section.title} className={section.title === "Contact" ? "col-span-2 lg:col-span-1" : undefined}>
                            <h2 className="mb-2 font-bold text-ink">{section.title}</h2>
                            <ul>
                                {section.links.map((link, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        {link.icon && <link.icon size={16} aria-hidden="true" className="shrink-0" />}
                                        {link.path === null
                                            ? <span className="max-w-52 whitespace-pre-line py-2">{link.text}</span>
                                            : link.path.startsWith('tel:') || link.path.startsWith('mailto:')
                                                ? <a href={link.path} className="inline-flex min-h-11 items-center hover:text-primary">{link.text}</a>
                                                : <Link href={link.path} className="inline-flex min-h-11 min-w-11 items-center hover:text-primary">{link.text}</Link>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5">
                    <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
                    <p>Cash on delivery</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
