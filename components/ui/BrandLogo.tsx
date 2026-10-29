// The store logo from the redesign (design: Main, header and footer): four rounded bars with the
// tall one in pink, then the store name with its last two letters in the brand colour ("mir" + "za").
// The name is the Settings `storeName`, never hard-coded, so renaming the store in /admin renames
// the logo. A name of three letters or fewer is shown in one colour.
export default function BrandLogo({ name, mark = true }: { name: string; mark?: boolean }) {
  const split = name.length > 3 ? name.length - 2 : name.length
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {mark && (
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
          <rect x="2" y="12" width="4" height="10" rx="2" className="fill-primary" />
          <rect x="9" y="6" width="4" height="22" rx="2" className="fill-primary" />
          <rect x="16" y="2" width="4" height="18" rx="2" className="fill-pink" />
          <rect x="23" y="10" width="4" height="12" rx="2" className="fill-primary" />
        </svg>
      )}
      <span className="truncate">
        {name.slice(0, split)}
        <span className="text-primary">{name.slice(split)}</span>
      </span>
    </span>
  )
}
