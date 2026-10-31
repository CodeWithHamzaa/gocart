// M101 (ADR-047): the Mirza logo. A coral square monogram (an "M" drawn as one stroke) and the
// store name as a single-colour wordmark. It replaces M61's four-bar mark and two-tone name, which
// read as a template. The name is still the Settings `storeName`, never hard-coded, so renaming the
// store in /admin renames the logo. The same mark is the favicon (app/icon.svg, app/favicon.ico)
// and the admin logo (components/admin/Logo.tsx).
export function BrandMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path d="M9 22.5V10l7 8.5 7-8.5v12.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function BrandLogo({ name, mark = true }: { name: string; mark?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {mark && <BrandMark />}
      <span className="truncate font-bold tracking-[-0.02em] text-ink">{name}</span>
    </span>
  )
}
