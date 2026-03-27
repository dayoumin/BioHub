'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Dna, BarChart3, Grid3X3, GitFork, ArrowRight, HelpCircle, FileText, FlaskConical, Search, Database } from 'lucide-react'
import type { ComponentType } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { Button } from '@/components/ui/button'

// ── 타입 ──

interface Tool {
  id: string
  title: string
  description: string
  input: string
  href: string
  ready: boolean
  badge: string
  icon: ComponentType<{ className?: string }>
}

// ── 상수 ──

const TOOLS: Tool[] = [
  {
    id: 'barcoding',
    title: 'DNA 바코딩 종 판별',
    description: '서열 입력 → 종 동정 + 결과 해석 + 대안 마커 안내',
    input: '서열 1개 (FASTA)',
    href: '/genetics/barcoding',
    ready: true,
    badge: '사용 가능',
    icon: Dna,
  },
  {
    id: 'blast-search',
    title: 'BLAST 서열 검색',
    description: 'blastn · blastp · blastx — 범용 서열 유사성 검색',
    input: 'DNA 또는 단백질 서열',
    href: '/genetics/blast',
    ready: true,
    badge: '사용 가능',
    icon: Search,
  },
  {
    id: 'genbank-search',
    title: 'GenBank 서열 검색',
    description: 'NCBI GenBank에서 서열 검색 + FASTA 다운로드',
    input: '종명, accession, 키워드',
    href: '/genetics/genbank',
    ready: true,
    badge: '사용 가능',
    icon: Database,
  },
  {
    id: 'seq-stats',
    title: '서열 기본 통계',
    description: 'GC 함량, 길이 분포, 염기 조성 분석',
    input: '서열 1개 이상',
    href: '/genetics/seq-stats',
    ready: false,
    badge: '준비 중',
    icon: BarChart3,
  },
  {
    id: 'similarity',
    title: '다종 유사도 행렬',
    description: '거리 행렬 (K2P) + 클러스터링',
    input: '서열 여러 개 (정렬된 FASTA)',
    href: '/genetics/similarity',
    ready: false,
    badge: '준비 중',
    icon: Grid3X3,
  },
  {
    id: 'phylogeny',
    title: '계통수 시각화',
    description: 'NJ / UPGMA 계통수 생성',
    input: '서열 여러 개',
    href: '/genetics/phylogeny',
    ready: false,
    badge: '준비 중',
    icon: GitFork,
  },
]

const WORKFLOW_STEPS = [
  { label: '서열 확보', icon: FileText },
  { label: '품질 확인', icon: BarChart3 },
  { label: '종 판별', icon: Dna },
  { label: '비교 분석', icon: FlaskConical },
]

const READY_TOOLS = TOOLS.filter(t => t.ready)
const PENDING_TOOLS = TOOLS.filter(t => !t.ready)

// ── 페이지 ──

export default function GeneticsHome() {
  const [guideOpen, setGuideOpen] = useState(false)
  const guideRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!guideOpen) return
    function handleClick(e: MouseEvent): void {
      if (guideRef.current && !guideRef.current.contains(e.target as Node)) {
        setGuideOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setGuideOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [guideOpen])

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">유전적 분석</h1>
          <p className="text-sm text-muted-foreground">
            DNA 서열 기반 종 판별, 서열 통계, 계통 분석 도구
          </p>
        </div>
        <div ref={guideRef} className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setGuideOpen(prev => !prev)}
            className={`gap-1.5 text-xs ${
              guideOpen
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'text-muted-foreground hover:border-primary/20 hover:text-foreground'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            도움말
          </Button>
          {guideOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-[min(480px,calc(100vw-2rem))] rounded-xl border border-border bg-card p-5 shadow-lg">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">상황별 도구 선택</h3>
                  <div className="space-y-3">
                    <GuideRow icon={Dna} question="이 시료가 어떤 종인지 모르겠어요" answer="DNA 바코딩 종 판별" />
                    <GuideRow icon={Search} question="비슷한 서열을 데이터베이스에서 찾고 싶어요" answer="BLAST 서열 검색" />
                    <GuideRow icon={Database} question="GenBank에서 참조 서열을 다운로드하고 싶어요" answer="GenBank 서열 검색" />
                    <GuideRow icon={Grid3X3} question="종 간 유전적 거리를 비교하고 싶어요" answer="다종 유사도 행렬" />
                    <GuideRow icon={GitFork} question="진화적 관계를 시각화하고 싶어요" answer="계통수 시각화" />
                    <GuideRow icon={Dna} question="집단 간 유전적 차이를 분석하고 싶어요" answer="Bio-Tools → HW 검정 / Fst" />
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">일반적인 분석 순서</h3>
                  <div>
                    {WORKFLOW_STEPS.map((step, i) => {
                      const Icon = step.icon
                      return (
                        <div key={step.label} className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                              {i + 1}
                            </div>
                            {i < WORKFLOW_STEPS.length - 1 && (
                              <div className="h-4 w-px bg-border" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 pb-1">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{step.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground/70">
                    처음이라면 <span className="font-medium text-primary">DNA 바코딩</span>부터 시작하세요.
                    서열 하나만 있으면 종을 판별할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 활성 도구 — 그리드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {READY_TOOLS.map((tool) => (
          <ReadyCard key={tool.id} tool={tool} />
        ))}
      </div>

      {/* 처음 사용자 안내 */}
      <div className="mb-10 rounded-lg border border-border/60 bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground">
          처음이라면 각 도구 페이지에서 <span className="font-medium text-foreground">예제 서열/검색어</span>로 바로 체험할 수 있습니다.
        </p>
      </div>

      {/* 준비 중 도구 */}
      {PENDING_TOOLS.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            개발 예정
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PENDING_TOOLS.map((tool) => (
              <PendingCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      )}

      {/* 집단 유전학 cross-link */}
      <PopulationGeneticsLinks />
    </div>
  )
}

// ── 컴포넌트 ──

function ReadyCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon

  return (
    <Link href={tool.href}>
      <div className="group flex h-full flex-col rounded-xl border border-primary/20 bg-primary/5 p-5 transition hover:border-primary/40 hover:shadow-md">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-base font-semibold">{tool.title}</h2>
        </div>
        <p className="mb-3 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground/70">{tool.input}</p>
          <ArrowRight className="h-4 w-4 text-primary/40 transition group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  )
}

function PendingCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 cursor-not-allowed">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{tool.title}</h3>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tool.badge}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70">{tool.description}</p>
        </div>
      </div>
    </div>
  )
}

const CROSS_LINK_TOOL_IDS = ['hardy-weinberg', 'fst'] as const

const crossLinkClass =
  'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/30 hover:text-primary'

function PopulationGeneticsLinks(): React.ReactElement | null {
  const tools = CROSS_LINK_TOOL_IDS.map(getBioToolById).filter(
    (t): t is NonNullable<typeof t> => Boolean(t)
  )
  if (tools.length === 0) return null

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        집단 유전학
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        대립유전자 빈도 기반 집단 분석은 Bio-Tools에서 제공합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <Link key={tool.id} href={`/bio-tools?tool=${tool.id}`} className={crossLinkClass}>
            {tool.nameKo}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function GuideRow({ icon: Icon, question, answer }: { icon: ComponentType<{ className?: string }>; question: string; answer: string }) {
  return (
    <div className="rounded-lg p-2 transition hover:bg-muted/30">
      <p className="mb-1 text-xs text-muted-foreground">&ldquo;{question}&rdquo;</p>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-xs font-medium">{answer}</span>
      </div>
    </div>
  )
}
