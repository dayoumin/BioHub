import { Suspense } from 'react'
import { GeneticsHistorySidebar } from '@/components/genetics/GeneticsHistorySidebar'
import { GeneticsSubNav } from '@/components/genetics/GeneticsSubNav'

export default function GeneticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1300px] gap-6 px-4 py-8">
      <div className="min-w-0 flex-1">
        <GeneticsSubNav />
        <Suspense>{children}</Suspense>
      </div>
      <Suspense><GeneticsHistorySidebar /></Suspense>
    </div>
  )
}
