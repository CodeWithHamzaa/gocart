// M27b: skeleton geometry matches the loaded grid (1 / 2 / 3 columns). This
// route has no notFound() path, so it doesn't hit the loading.tsx/Suspense
// status-code conflict documented in M27a's category-detail route.
export default function CategoriesLoading() {
  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh]">
        <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mt-8 mb-5" />
        <div className="h-8 w-56 bg-slate-100 rounded animate-pulse mb-8" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-6 flex flex-col gap-3">
              <div className="bg-slate-100 h-32 rounded-lg animate-pulse" />
              <div className="h-5 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
