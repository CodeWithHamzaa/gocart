import ProductRail from './ProductRail'
import { DEFAULT_CONTENT } from '@/lib/storefront-content'

// M23: server component fed by real Payload data (sorted and limited by the page's query).
// M101: "New arrivals" is a swipeable row of the large home cards (ProductRail, RailCard). The home page
// passes the newest products that are not already featured.
// M110: the heading, description and link words come from the admin's Storefront content.
const LatestProducts = ({ products = [], content = DEFAULT_CONTENT }) => (
    <ProductRail
        title={content.newArrivalsTitle}
        description={content.newArrivalsDescription}
        linkLabel={content.newArrivalsLinkLabel}
        href='/shop'
        products={products}
    />
)

export default LatestProducts
