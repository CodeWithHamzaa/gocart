import ProductRail from './ProductRail'

// M23: server component fed by real Payload data (sorted and limited by the page's query).
// M101: "New arrivals" is a swipeable row of the large home cards (ProductRail, RailCard). The home page
// passes the newest products that are not already featured.
const LatestProducts = ({ products = [] }) => (
    <ProductRail title='New arrivals' description='The latest additions to the store.' href='/shop' products={products} />
)

export default LatestProducts
