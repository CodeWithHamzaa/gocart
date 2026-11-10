// M27b: skeleton geometry matches the loaded grid. This route has no notFound() path, so it doesn't
// hit the loading.tsx/Suspense status-code conflict documented in M27a's category-detail route.
// M63: the redesigned layout (breadcrumb, heading, circle cards). M101: lavender tile placeholders.
export default function CategoriesLoading() {
  return (
    <div className="mx-4 sm:mx-6">
      <div className="mx-auto min-h-[70vh] max-w-7xl pb-16">
        <div className="mb-2 mt-4 h-4 w-40 animate-pulse rounded-full bg-surface-muted" />
        <div className="mb-8 mt-3 h-9 w-56 animate-pulse rounded-full bg-surface-muted" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex h-[180px] animate-pulse rounded-card bg-surface-muted sm:h-[260px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
