'use client'

import Link from 'next/link'

const TOOLS = [
  {
    id: 'barcoding',
    title: 'DNA 바코딩 종 판별',
    description: '서열 입력 → 종 동정 + 결과 해석 + 대안 마커 안내',
    input: '서열 1개 (FASTA)',
    href: '/genetics/barcoding',
    ready: true,
    badge: 'E-0',
  },
  {
    id: 'seq-stats',
    title: '서열 기본 통계',
    description: 'GC 함량, 길이 분포, 염기 조성 분석',
    input: '서열 1개 이상',
    href: '/genetics/seq-stats',
    ready: false,
    badge: 'E-1',
  },
  {
    id: 'similarity',
    title: '다종 유사도 행렬',
    description: '거리 행렬 (K2P) + 클러스터링',
    input: '서열 여러 개 (정렬된 FASTA)',
    href: '/genetics/similarity',
    ready: false,
    badge: 'E-1',
  },
  {
    id: 'phylogeny',
    title: '계통수 시각화',
    description: 'NJ / UPGMA 계통수 생성',
    input: '서열 여러 개',
    href: '/genetics/phylogeny',
    ready: false,
    badge: 'E-1',
  },
  {
    id: 'population',
    title: '집단 유전학',
    description: 'Haplotype 빈도 · Fst · AMOVA',
    input: '서열 + 집단 정보',
    href: '/genetics/population',
    ready: false,
    badge: 'E-2',
  },
] as const

export default function GeneticsHome() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">유전적 분석</h1>
        <p className="text-sm text-muted-foreground">
          DNA 서열 기반 종 판별, 서열 통계, 계통 분석, 집단 유전학 도구
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
}

function ToolCard({ tool }: { tool: typeof TOOLS[number] }) {
  const content = (
    <div className={`group relative rounded-xl border p-5 transition ${
      tool.ready
        ? 'border-border bg-card hover:border-primary/40 hover:shadow-md cursor-pointer'
        : 'border-border/50 bg-muted/30 opacity-60 cursor-default'
    }`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tool.badge}
        </span>
        {!tool.ready && (
          <span className="text-xs text-muted-foreground">준비 중</span>
        )}
      </div>
      <h2 className={`mb-1 text-lg font-semibold ${tool.ready ? 'text-foreground' : 'text-muted-foreground'}`}>
        {tool.title}
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">{tool.description}</p>
      <p className="text-xs text-muted-foreground/70">입력: {tool.input}</p>
    </div>
  )

  if (tool.ready) {
    return <Link href={tool.href}>{content}</Link>
  }
  return content
}
