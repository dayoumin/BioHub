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
 * TODO: 내부 동작(업로드/계산기)과 페이지 이동(시각화/Bio-Tools)의 시각적 구분 필요
 *       현재 4개 카드가 동일한 스타일이라 사용자가 동작 차이를 인지 못함
 *       옵션: (1) 페이지 이동 카드에 ↗ 아이콘 추가 (2) 카드 스타일 차별화 (3) 그리드 분리
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart2, ChevronRight, Calculator, Upload, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { actionCardBase, iconContainerMuted, iconContainerPrimary } from '@/components/common/card-styles'
import { SampleSizeModal } from './SampleSizeModal'

// ===== Props =====

interface TrackSuggestionsProps {
  onStartAnalysis?: (example: string) => void
  onUploadClick?: () => void
}

// ===== Component =====

export function TrackSuggestions({ onStartAnalysis, onUploadClick }: TrackSuggestionsProps) {
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
        <h2 className="text-lg font-bold mb-3">{t.hub.quickStart.title}</h2>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* 데이터 업로드 */}
          <motion.button
            type="button"
            onClick={onUploadClick}
            data-testid="hub-upload-btn"
            className={actionCardBase}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className={iconContainerPrimary}>
              <Upload className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">{t.hub.quickStart.uploadData}</span>
          </motion.button>

          {/* 표본 크기 계산기 */}
          <motion.button
            type="button"
            onClick={handleOpenSampleSize}
            data-testid="hub-sample-size-card"
            className={actionCardBase}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38 }}
          >
            <div className={iconContainerMuted}>
              <Calculator className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">{t.hub.quickStart.sampleSize}</span>
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
              className={cn(actionCardBase, 'h-full relative')}
            >
              <div className={iconContainerMuted}>
                <BarChart2 className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{t.hub.quickStart.visualization}</span>
              <ChevronRight className="absolute right-3 top-3 w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50" />
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
              className={cn(actionCardBase, 'h-full relative')}
            >
              <div className={iconContainerMuted}>
                <FlaskConical className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{t.hub.quickStart.bioTools}</span>
              <ChevronRight className="absolute right-3 top-3 w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50" />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <SampleSizeModal open={sampleSizeOpen} onClose={handleCloseSampleSize} onStartAnalysis={onStartAnalysis} />
    </>
  )
}
