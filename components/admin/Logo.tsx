// M95: the admin's logo (login page and sidebar header): the storefront's mark and the
// store name. Server component; the name is the Settings `storeName`, like the storefront, with a
// plain fallback so the login page still renders if Settings cannot be read.
import { getSettings } from '@/lib/payload/settings'

export default async function AdminLogo() {
  let name = 'Store'
  try {
    name = (await getSettings()).storeName || name
  } catch {
    // keep the fallback
  }
  // M101 (ADR-047): the storefront's Mirza monogram (components/ui/BrandLogo.tsx), in one colour.
  return (
    <span className="mirza-logo">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#1D1D1F" />
        <path d="M9 22.5V10l7 8.5 7-8.5v12.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="mirza-logo__name">{name}</span>
      <span className="mirza-logo__tag">Admin</span>
    </span>
  )
}
