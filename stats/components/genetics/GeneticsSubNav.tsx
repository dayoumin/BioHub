'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dna, Search, Database, ChevronLeft } from 'lucide-react'

const TOOLS = [
  { id: 'barcoding', title: 'DNA 바코딩 종 판별', href: '/genetics/barcoding', icon: Dna },
  { id: 'blast', title: 'BLAST 서열 검색', href: '/genetics/blast', icon: Search },
  { id: 'genbank', title: 'GenBank 서열 검색', href: '/genetics/genbank', icon: Database },
]

export function GeneticsSubNav() {
  const pathname = usePathname()
  
  // 메인 페이지면 서브네비게이션 숨김
  if (pathname === '/genetics') return null

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-muted/30 p-2">
      <div className="flex items-center gap-2">
        <Link
          href="/genetics"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          title="유전적 분석 홈으로 이동"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </Link>
        <div className="h-4 w-px bg-border/30 mx-1" />
        <div className="flex overflow-x-auto whitespace-nowrap gap-1 pb-1 -mb-1 scrollbar-hide">
          {TOOLS.map(tool => {
            const isActive = pathname.startsWith(tool.href)
            const Icon = tool.icon
            
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
                {tool.title}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
