import { Suspense } from 'react'
import { GeneticsSidebarSlot } from '@/components/genetics/GeneticsSidebarSlot'

export default function GeneticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1300px] gap-6 px-4 py-8">
      <div className="min-w-0 flex-1">
        <Suspense>{children}</Suspense>
      </div>
      <GeneticsSidebarSlot />
    </div>
  )
}
