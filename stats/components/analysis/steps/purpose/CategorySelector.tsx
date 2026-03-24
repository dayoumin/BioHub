'use client'

/**
 * CategorySelector - 대분류 선택 UI
 *
 * 4개 대분류 카드를 표시하고 사용자 선택을 처리합니다.
 * Framer Motion으로 부드러운 애니메이션을 제공합니다.
 */

import { memo, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import { GitCompare, TrendingUp, LineChart, Layers, Sparkles, List, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import { Badge } from '@/components/ui/badge'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useTerminology } from '@/hooks/use-terminology'
import type { AnalysisCategory, CategoryDefinition } from '@/types/analysis'
import {
  cardVariants,
  containerVariants,
  hoverScaleVariants,
  getReducedMotionVariants,
} from './motion-variants'

/** 보조 경로 링크 스타일 (CategorySelector, NaturalLanguageInput 공용) */
export const secondaryLinkClass = cn(
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
  'text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50',
  'transition-colors',
)

export interface SecondaryLinkProps {
  onClick: () => void
  disabled: boolean
  icon: ComponentType<{ className?: string }>
  label: string
}

export function SecondaryLink({ onClick, disabled, icon: Icon, label }: SecondaryLinkProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(secondaryLinkClass, disabled && 'opacity-50 cursor-not-allowed')}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

// 아이콘 매핑
const ICON_MAP = {
  GitCompare,
  TrendingUp,
  LineChart,
  Layers,
}

interface CategorySelectorProps {
  /** 카테고리 선택 콜백 */
  onSelect: (category: AnalysisCategory) => void
  /** 데이터 기반 추천 카테고리 (옵션) */
  recommendedCategory?: AnalysisCategory | null
  /** 비활성화 상태 */
  disabled?: boolean
  /** 추가 CSS 클래스 */
  className?: string
  /** "전체 목록에서 선택" 클릭 콜백 */
  onBrowseAll?: () => void
  /** "AI에게 추천받기" 클릭 콜백 */
  onAiChat?: () => void
}

export const CategorySelector = memo(function CategorySelector({
  onSelect,
  recommendedCategory,
  disabled = false,
  className,
  onBrowseAll,
  onAiChat,
}: CategorySelectorProps) {
  const t = useTerminology()
  const categories = t.progressiveCategoryData
  const prefersReducedMotion = useReducedMotion()
  const variants = prefersReducedMotion
    ? getReducedMotionVariants(cardVariants)
    : cardVariants
  const container = prefersReducedMotion
    ? getReducedMotionVariants(containerVariants)
    : containerVariants

  return (
    <div className={cn('space-y-6', className)}>
      {/* 타이틀 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-foreground">
          무엇을 알고 싶으신가요?
        </h2>
        <p className="text-muted-foreground mt-2">
          분석 목적에 맞는 카테고리를 선택해주세요
        </p>
      </motion.div>

      {/* 카테고리 카드 그리드 */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {categories.map((category, index) => {
          const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP]
          const isRecommended = recommendedCategory === category.id

          return (
            <motion.button
              key={category.id}
              custom={index}
              variants={variants}
              {...(prefersReducedMotion ? {} : hoverScaleVariants)}
              onClick={() => !disabled && onSelect(category.id)}
              disabled={disabled}
              className={cn(
                'relative p-6 rounded-xl border-2 text-left transition-colors',
                focusRing,
                disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:border-primary/50 hover:shadow-lg',
                isRecommended
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              )}
            >
              {/* 추천 배지 */}
              {isRecommended && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                  className="absolute -top-2 -right-2"
                >
                  <Badge className="bg-amber-500/90 text-white border-0 shadow-md">
                    <Sparkles className="w-3 h-3 mr-1" />
                    추천
                  </Badge>
                </motion.div>
              )}

              {/* 아이콘 */}
              <div
                className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center mb-4',
                  isRecommended
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {IconComponent && <IconComponent className="w-6 h-6" />}
              </div>

              {/* 텍스트 */}
              <h3 className="font-semibold text-lg text-foreground mb-1">
                {category.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {category.description}
              </p>

              {/* 중분류 미리보기 */}
              <div className="mt-4 flex flex-wrap gap-1">
                {category.subcategories.slice(0, 3).map((sub) => (
                  <span
                    key={sub.id}
                    className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {sub.title}
                  </span>
                ))}
                {category.subcategories.length > 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    +{category.subcategories.length - 3}
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* 하단 보조 경로 */}
      {(onBrowseAll || onAiChat) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
          className="flex items-center justify-center gap-3 pt-2"
        >
          {onBrowseAll && (
            <SecondaryLink onClick={onBrowseAll} disabled={disabled} icon={List} label="전체 목록에서 선택" />
          )}
          {onBrowseAll && onAiChat && (
            <span className="text-border">|</span>
          )}
          {onAiChat && (
            <SecondaryLink onClick={onAiChat} disabled={disabled} icon={MessageSquare} label="AI에게 추천받기" />
          )}
        </motion.div>
      )}
    </div>
  )
})

export default CategorySelector
