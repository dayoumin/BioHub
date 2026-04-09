'use client'

/**
 * TrackSuggestions — 빠른 시작 아이콘 그리드 (4종)
 *
 * Stitch 시안 기반 리뉴얼: 아이콘 + 라벨 중심의 컴팩트 그리드
 *
 * 카드별 동작 유형:
 * - 데이터 업로드: 같은 페이지 내 동작 (Step 1 이동) — 통계 분석용 CSV 업로드 → 변수 매핑 → 분석
 * - 표본 크기 계산기: 같은 페이지 내 모달
 * - 데이터 시각화: /graph-studio 페이지 이동 — 차트 생성용 CSV 업로드 → 차트 타입 선택 → 편집
 * - Bio-Tools: /bio-tools 페이지 이동
 *
 * "결과 정리"는 분석 완료 후 동작이므로 빠른 시작에 포함하지 않음 — 사이드바 + 분석 결과 화면에서 접근
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart2, Calculator, Upload, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { actionCardBase, iconContainerMuted, iconContainerPrimary } from '@/components/common/card-styles'
import { SampleSizeModal } from './SampleSizeModal'

// ===== 섹션 아이덴티티 뱃지 스타일 상수 (렌더마다 객체 재생성 방지) =====

const BADGE_BASE = 'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium'
const BADGE_MUTED = cn(BADGE_BASE, 'bg-muted text-muted-foreground')
const BADGE_ANALYSIS_STYLE = {
  background: 'color-mix(in oklch, var(--section-accent-analysis) 12%, transparent)',
  color: 'var(--section-accent-analysis)',
} as const
const BADGE_GRAPH_STYLE = {
  background: 'color-mix(in oklch, var(--section-accent-graph) 12%, transparent)',
  color: 'var(--section-accent-graph)',
} as const

// ===== Props =====

interface TrackSuggestionsProps {
  onStartAnalysis?: (example: string) => void
  onUploadClick?: () => void
  showHeader?: boolean
}

// ===== Component =====

export function TrackSuggestions({ onStartAnalysis, onUploadClick, showHeader = true }: TrackSuggestionsProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const [sampleSizeOpen, setSampleSizeOpen] = useState(false)

  const handleOpenSampleSize = useCallback(() => {
    setSampleSizeOpen(true)
  }, [])

  const handleCloseSampleSize = useCallback(() => {
    setSampleSizeOpen(false)
  }, [])

  return (
    <>
      <div>
        {showHeader && <h2 className="text-lg font-bold mb-3">{t.hub.quickStart.title}</h2>}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* 데이터 업로드 */}
          <motion.button
            type="button"
            onClick={onUploadClick}
            data-testid="hub-upload-btn"
            className={cn(actionCardBase, 'min-h-[128px] items-start justify-between px-4 py-4')}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div className={iconContainerPrimary}>
                <Upload className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className={BADGE_BASE} style={BADGE_ANALYSIS_STYLE}>{t.hub.quickStart.badges.analysis}</span>
            </div>
            <div className="w-full text-left">
              <span className="block font-medium text-sm">{t.hub.quickStart.uploadData}</span>
              <span className="mt-1 block text-xs text-muted-foreground">분석에 필요한 데이터를 불러옵니다.</span>
            </div>
          </motion.button>

          {/* 표본 크기 계산기 */}
          <motion.button
            type="button"
            onClick={handleOpenSampleSize}
            data-testid="hub-sample-size-card"
            className={cn(actionCardBase, 'min-h-[128px] items-start justify-between px-4 py-4')}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38 }}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div className={iconContainerMuted}>
                <Calculator className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className={BADGE_MUTED}>{t.hub.quickStart.badges.tool}</span>
            </div>
            <div className="w-full text-left">
              <span className="block font-medium text-sm">{t.hub.quickStart.sampleSize}</span>
              <span className="mt-1 block text-xs text-muted-foreground">실험 설계 전 필요한 표본 수를 계산합니다.</span>
            </div>
          </motion.button>

          {/* 데이터 시각화 */}
          <motion.div
            className="h-full"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.46 }}
          >
            <Link
              href="/graph-studio"
              data-testid="hub-visualization-card"
              className={cn(actionCardBase, 'h-full min-h-[128px] items-start justify-between px-4 py-4')}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className={iconContainerMuted}>
                  <BarChart2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className={BADGE_BASE} style={BADGE_GRAPH_STYLE}>Graph Studio</span>
              </div>
              <div className="w-full text-left">
                <span className="block font-medium text-sm">{t.hub.quickStart.visualization}</span>
                <span className="mt-1 block text-xs text-muted-foreground">데이터를 차트로 빠르게 탐색하고 편집합니다.</span>
              </div>
            </Link>
          </motion.div>

          {/* Bio-Tools */}
          <motion.div
            className="h-full"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.54 }}
          >
            <Link
              href="/bio-tools"
              data-testid="hub-biotools-card"
              className={cn(actionCardBase, 'h-full min-h-[128px] items-start justify-between px-4 py-4')}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className={iconContainerMuted}>
                  <FlaskConical className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className={BADGE_MUTED}>Bio-Tools</span>
              </div>
              <div className="w-full text-left">
                <span className="block font-medium text-sm">{t.hub.quickStart.bioTools}</span>
                <span className="mt-1 block text-xs text-muted-foreground">분석 전후에 쓰는 보조 생물정보 도구를 엽니다.</span>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <SampleSizeModal open={sampleSizeOpen} onClose={handleCloseSampleSize} onStartAnalysis={onStartAnalysis} />
    </>
  )
}
