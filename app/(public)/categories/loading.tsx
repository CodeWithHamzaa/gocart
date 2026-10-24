// M27b: skeleton geometry matches the loaded grid. This route has no notFound() path, so it doesn't
// hit the loading.tsx/Suspense status-code conflict documented in M27a's category-detail route.
// M63: the redesigned layout (breadcrumb, heading, circle cards).
export default function CategoriesLoading() {
  return (
    <div className="mx-4 sm:mx-6">
      <div className="mx-auto min-h-[70vh] max-w-7xl pb-16">
        <div className="mb-2 mt-4 h-4 w-40 animate-pulse rounded bg-line" />
        <div className="mb-8 mt-3 h-9 w-56 animate-pulse rounded bg-line" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-3 rounded-3xl bg-white px-3 pb-5 pt-6 shadow-card ring-1 ring-line">
              <div className="size-28 animate-pulse rounded-full bg-line sm:size-32" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
