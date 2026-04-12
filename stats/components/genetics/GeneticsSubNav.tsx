'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dna, Search, Database, BarChart3, Grid3X3, GitFork, ChevronLeft, Fingerprint, FlaskConical, Atom } from 'lucide-react'
import type { CSSProperties } from 'react'

const TOOLS = [
  { id: 'barcoding', title: 'DNA 바코딩 종 판별', href: '/genetics/barcoding', icon: Dna },
  { id: 'blast', title: 'BLAST 서열 검색', href: '/genetics/blast', icon: Search },
  { id: 'genbank', title: 'GenBank 서열 검색', href: '/genetics/genbank', icon: Database },
  { id: 'seq-stats', title: '서열 기본 통계', href: '/genetics/seq-stats', icon: BarChart3 },
  { id: 'similarity', title: '다종 유사도 행렬', href: '/genetics/similarity', icon: Grid3X3 },
  { id: 'phylogeny', title: '계통수 시각화', href: '/genetics/phylogeny', icon: GitFork },
  { id: 'bold-id', title: 'BOLD 종 동정', href: '/genetics/bold-id', icon: Fingerprint },
  { id: 'translation', title: 'Translation 워크벤치', href: '/genetics/translation', icon: FlaskConical },
  { id: 'protein', title: '단백질 특성 분석', href: '/genetics/protein', icon: Atom },
]

const GENETICS_ACCENT_VAR = '--section-accent-hub' as const

const geneticsAccentText = {
  color: `var(${GENETICS_ACCENT_VAR})`,
} as const satisfies CSSProperties

const geneticsAccentSurface = {
  backgroundColor: `color-mix(in oklch, var(${GENETICS_ACCENT_VAR}) 8%, var(--surface-container-lowest))`,
} as const satisfies CSSProperties

export function GeneticsSubNav() {
  const pathname = usePathname()
  
  // 메인 페이지면 서브네비게이션 숨김
  if (pathname === '/genetics') return null

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[1.5rem] bg-surface-container-low/70 p-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Link
          href="/genetics"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-container-lowest hover:text-foreground"
          title="유전적 분석 홈으로 이동"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </Link>
        <div className="flex overflow-x-auto whitespace-nowrap gap-1 pb-1 -mb-1 scrollbar-hide">
          {TOOLS.map(tool => {
            const isActive = pathname.startsWith(tool.href)
            const Icon = tool.icon
            
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-surface-container-lowest hover:text-foreground'
                }`}
                style={isActive ? geneticsAccentSurface : undefined}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? '' : 'text-muted-foreground/70'}`}
                  style={isActive ? geneticsAccentText : undefined}
                />
                {tool.title}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
