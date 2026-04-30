import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-white/5', className)} />
  )
}

export function PageSkeleton() {
  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-64 h-screen bg-[#0f0f0f] border-r border-white/5 shrink-0 p-4 gap-4">
        <div className="flex items-center gap-3 h-8 mb-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="flex-1 h-5" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-xl" />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header skeleton */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Page content skeleton */}
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
