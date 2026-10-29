// M95: the "Overview" link above and the "View store" link below Payload's own sidebar links, as in
// the redesign's admin. Plain links (server component, no state).
import Link from 'next/link'
import AdminLogo from './Logo'

// The logo at the top of the sidebar, linking to the Overview.
export async function NavBrand() {
  return (
    <Link href="/admin" className="mirza-nav-brand" aria-label="Overview">
      <AdminLogo />
    </Link>
  )
}

export function OverviewLink() {
  return (
    <Link href="/admin" className="nav__link mirza-nav-extra">
      <span className="nav__link-label">Overview</span>
    </Link>
  )
}

export function ViewStoreLink() {
  return (
    <Link href="/" target="_blank" className="nav__link mirza-nav-extra">
      <span className="nav__link-label">View store &#8599;</span>
    </Link>
  )
}
