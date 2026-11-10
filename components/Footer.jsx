import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { BanknoteIcon, MailIcon, MapPinIcon, PhoneIcon, TruckIcon, UserRoundIcon } from "lucide-react";
import { getSettings } from "@/lib/payload/settings";
import { getStorefrontContent } from "@/lib/payload/storefront-content";
import { getCategoriesCached } from "@/lib/payload/categories";

// M55a: server component. The contact block is read from the Settings global (M13a)
// so an admin edit shows without a redeploy (the public layout revalidates), and a
// value that is not configured is simply not shown — never replaced by a placeholder.
// A mailto: link only for a plain address (no ?/&/# that could add headers); otherwise text.
// A dark footer that bookends the dark announcement bar: the three COD promises, then brand, Shop,
// Customer care and Contact columns (white/75 on ink: 10:1). Same data as before (M61). The
// design's "Sell on ...", "Careers", newsletter and card/wallet lines are left out: this is a
// single COD store (ADR-004, ADR-006) with no such pages. The sections are plain lists, not <nav>
// landmarks, so the header stays the only nav that holds Shop, Search and Cart (e2e/mobile.spec.ts).
const SAFE_EMAIL = /^[^\s@?&#]+@[^\s@?&#]+$/

const Footer = async () => {

    const [settings, categories, content] = await Promise.all([getSettings(), getCategoriesCached().catch(() => []), getStorefrontContent()])

    const linkSections = [
        {
            title: "Shop",
            links: [
                ...categories.slice(0, 6).map((category) => ({ text: category.title, path: `/category/${category.slug}`, icon: null })),
                { text: "Shop all products", path: '/shop', icon: null },
            ]
        },
        {
            title: "Customer care",
            links: [
                { text: "Track your order", path: '/orders', icon: null },
                { text: "All categories", path: '/categories', icon: null },
                { text: "Your cart", path: '/cart', icon: null },
                { text: "Wishlist", path: '/wishlist', icon: null },
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

    // Links keep a 44px target on touch screens and tighten to 36px where a mouse is the pointer.
    const link = "inline-flex min-h-11 items-center text-white/75 transition-colors hover:text-white pointer-fine:min-h-9"
    const promises = [
        { icon: BanknoteIcon, text: "Cash on delivery" },
        { icon: TruckIcon, text: "Delivery across Pakistan" },
        { icon: UserRoundIcon, text: "No account needed" },
    ]

    return (
        <footer className="mt-24 bg-ink text-sm text-white/75">
            <div className="mx-auto max-w-[83rem] px-4 sm:px-6">
                <ul className="grid gap-3 border-b border-white/10 py-6 sm:grid-cols-3">
                    {promises.map((item) => (
                        <li key={item.text} className="flex items-center gap-3 text-white">
                            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                                <item.icon size={18} strokeWidth={1.8} />
                            </span>
                            <span className="font-semibold">{item.text}</span>
                        </li>
                    ))}
                </ul>
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-x-10">
                    <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
                        <Link href="/" className="self-start text-2xl">
                            <BrandLogo name={settings.storeName} mark={false} inverse />
                        </Link>
                        <p className="max-w-[300px] leading-relaxed">{content.footerTagline}</p>
                    </div>
                    {linkSections.map((section) => (
                        <div key={section.title} className={section.title === "Contact" ? "col-span-2 lg:col-span-1" : undefined}>
                            <h2 className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-white">{section.title}</h2>
                            <ul>
                                {section.links.map((link_, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        {link_.icon && <link_.icon size={16} aria-hidden="true" className="mt-3 shrink-0 text-white/60 pointer-fine:mt-2.5" />}
                                        {link_.path === null
                                            ? <span className="max-w-60 whitespace-pre-line py-2.5 leading-relaxed">{link_.text}</span>
                                            : link_.path.startsWith('tel:') || link_.path.startsWith('mailto:')
                                                ? <a href={link_.path} className={`${link} break-all`}>{link_.text}</a>
                                                : <Link href={link_.path} className={link}>{link_.text}</Link>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-white/60">
                    <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
                    <p>Cash on delivery across Pakistan</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
