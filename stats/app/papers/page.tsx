'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, BarChart3, Table2, ArrowRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHistoryStore } from '@/lib/stores/history-store'
import { loadAndRestoreHistory } from '@/lib/stores/store-orchestration'
import { useModeStore } from '@/lib/stores/mode-store'
import { cn } from '@/lib/utils'

// ── 히스토리 카드 ─────────────────────────────────────────────

interface DraftHistoryCardProps {
  id: string
  name: string
  method: string
  timestamp: Date
  onClick: () => void
}

function DraftHistoryCard({ name, method, timestamp, onClick }: DraftHistoryCardProps) {
  const timeAgo = getTimeAgo(timestamp)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border bg-card w-full text-left',
        'hover:shadow-sm hover:border-primary/30 transition-all',
      )}
    >
      <div className="shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{method}</p>
        <p className="text-xs text-muted-foreground truncate">{name}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" />
        {timeAgo}
      </div>
    </button>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return '방금'
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

// ── 기능 카드 ─────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Table2,
    title: '통계 결과 표',
    desc: '기술통계, 검정 결과, 사후검정 표를 자동 생성',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    icon: BarChart3,
    title: '분석 그래프',
    desc: '분석 차트를 그대로 삽입, PNG 저장',
    color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
  },
  {
    icon: FileText,
    title: '결과 해석 텍스트',
    desc: 'APA 형식 Methods & Results 자동 작성',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
] as const

// ── 메인 페이지 ───────────────────────────────────────────────

export default function PapersPage() {
  const router = useRouter()
  const { analysisHistory } = useHistoryStore()
  const setShowHub = useModeStore(s => s.setShowHub)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // paperDraft가 있는 히스토리만 필터
  const draftHistories = mounted
    ? analysisHistory.filter(h => {
        const r = h.results as Record<string, unknown> | null
        return r !== null
      }).slice(0, 6)
    : []

  const handleHistoryClick = useCallback(async (historyId: string) => {
    await loadAndRestoreHistory(historyId)
    setShowHub(false)
    router.push('/')
  }, [router, setShowHub])

  const handleStartAnalysis = useCallback(() => {
    setShowHub(true)
    router.push('/')
  }, [router, setShowHub])

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">결과 정리</h1>
        <p className="text-muted-foreground text-lg">
          통계 분석 결과를 논문·보고서에 바로 활용할 수 있게 정리합니다
        </p>
      </div>

      {/* 3가지 기능 소개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col items-center text-center p-5 rounded-xl border bg-card">
            <div className={cn('p-3 rounded-xl mb-3', f.color)}>
              <f.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* 분석 결과가 있는 히스토리 */}
      {draftHistories.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">이전 분석 결과</h2>
          <p className="text-sm text-muted-foreground">분석 결과를 선택하면 결과 정리 패널을 열 수 있습니다</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {draftHistories.map((h) => (
              <DraftHistoryCard
                key={h.id}
                id={h.id}
                name={h.name || h.dataFileName}
                method={h.method?.name ?? '분석'}
                timestamp={new Date(h.timestamp)}
                onClick={() => handleHistoryClick(h.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 rounded-xl border border-dashed">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-1">아직 분석 결과가 없습니다</p>
          <p className="text-xs text-muted-foreground/60 mb-4">통계 분석을 먼저 실행하면 여기서 결과를 정리할 수 있습니다</p>
          <Button onClick={handleStartAnalysis} className="gap-2">
            분석 시작하기
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
