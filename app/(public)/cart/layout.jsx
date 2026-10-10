// M41: the cart page is a client component (it cannot export metadata), so its metadata
// lives in this layout. A per-visitor cart is not a page to index.
export const metadata = {
    title: "Your cart",
    robots: { index: false, follow: false },
};

export default function CartLayout({ children }) {
    return children;
}
