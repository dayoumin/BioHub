'use client'

/**
 * 통계 분석 브라우저 허브
 *
 * /analysis 페이지 전용.
 * 카테고리 브라우저 + 검색 — 챗 없음.
 * 메서드 선택 시 onMethodSelect 콜백으로 분석 시작.
 */

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { CategoryBrowser } from '@/components/common/CategoryBrowser'
import { PURPOSE_CATEGORIES } from '@/lib/constants/purpose-categories'

interface StatisticsBrowserHubProps {
  onMethodSelect: (methodId: string) => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function StatisticsBrowserHub({ onMethodSelect }: StatisticsBrowserHubProps): React.ReactElement {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className="w-full space-y-6 py-8"
      data-testid="statistics-browser-hub"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      {/* 헤더 */}
      <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })}>
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-1">
            통계 분석
          </h1>
          <p className="text-lg text-muted-foreground">
            분석 목적에 맞는 통계 방법을 찾아보세요
          </p>
        </div>
      </motion.div>

      {/* 카테고리 브라우저 */}
      <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })}>
        <CategoryBrowser
          categories={PURPOSE_CATEGORIES}
          onMethodSelect={onMethodSelect}
        />
      </motion.div>
    </motion.div>
  )
}
