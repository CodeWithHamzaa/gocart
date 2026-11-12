'use client'

import { buttonClasses } from '@/components/ui/Button'
// M27a: a Payload/database query failure renders this boundary with a retry
// affordance — never a silent empty category, which would misrepresent the
// catalog as smaller than it is on a page whose whole purpose is being
// indexed accurately.
// M63: the redesigned panel.
export default function CategoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-4 sm:mx-6">
      <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tighter text-ink">Something went wrong</h1>
        <p className="max-w-md text-muted">
          We couldn&apos;t load this category right now. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className={buttonClasses()}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
