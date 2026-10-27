// M91: the wishlist page is a client component (it reads this browser's saved ids), so its metadata
// lives in this layout. A per-visitor list is not a page to index.
export const metadata = {
    title: "Your wishlist",
    robots: { index: false, follow: false },
};

export default function WishlistLayout({ children }) {
    return children;
}
