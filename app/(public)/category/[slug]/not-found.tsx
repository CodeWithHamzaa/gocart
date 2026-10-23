import { SearchXIcon } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'

// M27a: real HTTP 404 for an unknown category slug (or a page number
// beyond the last real page) — never a silent empty grid.
// M63: the redesigned panel.
export default function CategoryNotFound() {
  return (
    <div className="mx-4 sm:mx-6">
      <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
        <EmptyState
          icon={<SearchXIcon size={28} />}
          title="Category not found"
          text="We couldn't find the category you're looking for. It may have moved or no longer exists."
          action={{ href: '/categories', label: 'Browse categories' }}
        />
      </div>
    </div>
  )
}
