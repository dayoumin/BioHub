'use client'

/**
 * SubcategorySelector - 중분류 선택 UI
 *
 * 선택된 대분류의 중분류 목록을 표시하고 사용자 선택을 처리합니다.
 * 슬라이드 애니메이션으로 부드러운 전환을 제공합니다.
 */

import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useTerminology } from '@/hooks/use-terminology'
import type { AnalysisCategory, CategoryDefinition, SubcategoryDefinition } from '@/types/smart-flow'
import { getCategoryById } from './progressive-questions'
import {
  listItemVariants,
  containerVariants,
  hoverHighlightVariants,
  getReducedMotionVariants,
  pageFadeUpVariants,
} from './motion-variants'

interface SubcategorySelectorProps {
  /** 선택된 대분류 ID */
  categoryId: AnalysisCategory
  /** 중분류 선택 콜백 */
  onSelect: (subcategory: SubcategoryDefinition) => void
  /** 뒤로 가기 콜백 */
  onBack: () => void
  /** 전체 목록 보기 콜백 */
  onBrowseAll?: () => void
  /** 데이터 기반 추천 중분류 ID (옵션) */
  recommendedSubcategoryId?: string | null
  /** 비활성화 상태 */
  disabled?: boolean
  /** 추가 CSS 클래스 */
  className?: string
}

export const SubcategorySelector = memo(function SubcategorySelector({
  categoryId,
  onSelect,
  onBack,
  onBrowseAll,
  recommendedSubcategoryId,
  disabled = false,
  className,
}: SubcategorySelectorProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const category = getCategoryById(categoryId, t.progressiveCategoryData)

  if (!category) {
    return null
  }

  const itemVariants = prefersReducedMotion
    ? getReducedMotionVariants(listItemVariants)
    : listItemVariants
  const container = prefersReducedMotion
    ? getReducedMotionVariants(containerVariants)
    : containerVariants
  const pageVariants = prefersReducedMotion
    ? getReducedMotionVariants(pageFadeUpVariants)
    : pageFadeUpVariants

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('space-y-6', className)}
    >
      {/* 헤더: 뒤로가기 + 현재 카테고리 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={disabled}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로
          </Button>
          <Badge variant="outline" className="font-medium">
            {category.title}
          </Badge>
        </div>

        {/* 전체 목록 보기 버튼 */}
        {onBrowseAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBrowseAll}
            disabled={disabled}
            className="text-muted-foreground"
          >
            <List className="w-4 h-4 mr-1" />
            전체 방법 보기
          </Button>
        )}
      </div>

      {/* 타이틀 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-foreground">
          어떤 분석이 필요하신가요?
        </h2>
        <p className="text-muted-foreground mt-1">
          구체적인 분석 유형을 선택해주세요
        </p>
      </motion.div>

      {/* 중분류 목록 */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <AnimatePresence>
          {category.subcategories.map((subcategory, index) => {
            const isRecommended = recommendedSubcategoryId === subcategory.id

            return (
              <motion.button
                key={subcategory.id}
                custom={index}
                variants={itemVariants}
                {...(prefersReducedMotion ? {} : hoverHighlightVariants)}
                onClick={() => !disabled && onSelect(subcategory)}
                disabled={disabled}
                className={cn(
                  'w-full p-4 rounded-lg border text-left transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:border-primary/50 hover:bg-accent/30',
                  isRecommended
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {subcategory.title}
                      </span>
                      {isRecommended && (
                        <Badge className="bg-amber-500/90 text-white border-0 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          추천
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subcategory.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-4" />
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </motion.div>

      {/* 하단 안내 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-sm text-muted-foreground"
      >
        선택하면 데이터에 맞는 분석 방법을 자동으로 추천해드립니다
      </motion.p>
    </motion.div>
  )
})

export default SubcategorySelector
