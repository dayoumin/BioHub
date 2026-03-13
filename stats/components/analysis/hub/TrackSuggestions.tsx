'use client'

/**
 * TrackSuggestions — 빠른 시작 아이콘 그리드 (4종)
 *
 * Stitch 시안 기반 리뉴얼: 아이콘 + 라벨 중심의 컴팩트 그리드
 * - 새 분석: ChatInput에 예시 주입
 * - 표본 크기 계산기: 모달 팝업
 * - 데이터 시각화: /graph-studio 이동
 * - 데이터 업로드: Step 1로 이동
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
