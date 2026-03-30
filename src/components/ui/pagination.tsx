'use client'

import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export default function Pagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  // Build page number windows: always show first, last, current ±1, with ellipsis
  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis-start')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('ellipsis-end')
    pages.push(totalPages)
  }

  return (
    <div className={cn('flex items-center justify-between gap-4 px-4 py-3', className)}>
      {/* Info */}
      <span className="text-sm text-body dark:text-dark-6">
        {start}–{end} of {totalItems}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke text-sm text-body transition-colors hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stroke-dark dark:text-dark-6 dark:hover:bg-[#1a2535]"
          aria-label="Previous page"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === 'ellipsis-start' || p === 'ellipsis-end' ? (
            <span
              key={p}
              className="flex h-8 w-8 items-center justify-center text-sm text-body dark:text-dark-6"
            >
              …
            </span>
          ) : (
            <button
              key={`page-${p}`}
              onClick={() => onPageChange(p)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                p === page
                  ? 'border-primary bg-primary text-white'
                  : 'border-stroke text-body hover:bg-gray-2 dark:border-stroke-dark dark:text-dark-6 dark:hover:bg-[#1a2535]',
              )}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke text-sm text-body transition-colors hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stroke-dark dark:text-dark-6 dark:hover:bg-[#1a2535]"
          aria-label="Next page"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
