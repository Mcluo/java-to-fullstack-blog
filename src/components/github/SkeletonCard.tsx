'use client'

export default function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-12 bg-gray-100 rounded" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
          </div>

          {/* AI recommendation area */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg space-y-2">
            <div className="h-3 w-16 bg-blue-100 rounded" />
            <div className="h-3.5 w-full bg-blue-100/60 rounded" />
            <div className="h-3.5 w-2/3 bg-blue-100/60 rounded" />
          </div>

          {/* Topics */}
          <div className="flex gap-1.5">
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
            <div className="h-5 w-14 bg-gray-100 rounded-full" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="h-3.5 w-14 bg-gray-100 rounded" />
            <div className="h-3.5 w-14 bg-gray-100 rounded" />
            <div className="h-3.5 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
