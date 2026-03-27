import { GeneticsHistorySidebar } from '@/components/genetics/GeneticsHistorySidebar'

export default function GeneticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <div className="min-w-0 flex-1">
        {children}
      </div>
      <GeneticsHistorySidebar />
    </div>
  )
}
