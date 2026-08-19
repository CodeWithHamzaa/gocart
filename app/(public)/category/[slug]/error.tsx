'use client'

// M27a: a Payload/database query failure renders this boundary with a retry
// affordance — never a silent empty category, which would misrepresent the
// catalog as smaller than it is on a page whose whole purpose is being
// indexed accurately.
export default function CategoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-6">
      <div className="max-w-7xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Something went wrong</h1>
        <p className="text-slate-500 max-w-md">
          We couldn&apos;t load this category right now. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="bg-slate-800 text-white px-6 py-2.5 text-sm font-medium rounded hover:bg-slate-900 transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
