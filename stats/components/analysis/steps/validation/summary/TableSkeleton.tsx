'use client'

import { memo } from 'react'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export const TableSkeleton = memo(function TableSkeleton({
  rows = 5,
  columns = 6
}: TableSkeletonProps) {
  return (
    <div className="w-full animate-pulse">
      {/* Table Header */}
      <div className="flex gap-2 p-2 border-b">
        {[...Array(columns)].map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"
          />
        ))}
      </div>

      {/* Table Rows */}
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="flex gap-2 p-2 border-b">
          {[...Array(columns)].map((_, colIdx) => (
            <div
              key={`cell-${rowIdx}-${colIdx}`}
              className="h-8 bg-gray-100 dark:bg-gray-800 rounded flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
})