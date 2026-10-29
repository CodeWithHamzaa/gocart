// M95: the admin's logo (login page and sidebar header): the storefront's four-bar mark and the
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
  const split = name.length > 3 ? name.length - 2 : name.length
  return (
    <span className="mirza-logo">
      <svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true">
        <rect x="2" y="12" width="4" height="10" rx="2" fill="#8F7BFF" />
        <rect x="9" y="6" width="4" height="22" rx="2" fill="#8F7BFF" />
        <rect x="16" y="2" width="4" height="18" rx="2" fill="#FF5C93" />
        <rect x="23" y="10" width="4" height="12" rx="2" fill="#8F7BFF" />
      </svg>
      <span className="mirza-logo__name">
        {name.slice(0, split)}
        <span className="mirza-logo__accent">{name.slice(split)}</span>
      </span>
      <span className="mirza-logo__tag">Admin</span>
    </span>
  )
}
