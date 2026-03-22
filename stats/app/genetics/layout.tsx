import { HistorySidebar } from '@/components/genetics/HistorySidebar'

export default function GeneticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
      <div className="min-w-0 flex-1">
        {children}
      </div>
      <HistorySidebar />
    </div>
  )
}
