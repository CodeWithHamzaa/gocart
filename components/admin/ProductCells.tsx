// M98: the Products list showed the stock checkbox as a raw `true`/`false` code chip. It now reads
// "In stock" or "Sold out" in the same pills as the Orders list. Display only; the product's edit
// view still owns the checkbox. Prices use OrderAmountCell ("Rs. 1,899").
export function StockCell({ cellData }: { cellData?: unknown }) {
  const inStock = cellData === true
  return <span className={`mirza-pill ${inStock ? 'mirza-pill--delivered' : 'mirza-pill--cancelled'}`}>{inStock ? 'In stock' : 'Sold out'}</span>
}
