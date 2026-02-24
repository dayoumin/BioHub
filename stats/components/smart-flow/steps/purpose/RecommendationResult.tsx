'use client'

/**
 * RecommendationResult - 추천 결과 표시 UI (2025 현대화)
 *
 * 향상된 기능:
 * - 타임라인 스타일 "왜 이 방법?" 시각화
 * - Framer Motion 스프링 애니메이션
 * - 접근성 개선 (prefers-reduced-motion 지원)
 */

import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  List,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import type { DecisionResult, StatisticalMethod } from '@/types/smart-flow'
import {
  timelineItemVariants,
  containerVariants,
  pageFadeUpVariants,
  badgePopVariants,
  getReducedMotionVariants,
} from './motion-variants'

interface RecommendationResultProps {
  result: DecisionResult
  onConfirm: () => void
  onBrowseAll: () => void
  onBack: () => void
  onSelectAlternative: (method: StatisticalMethod) => void
  /** 비활성화 상태 */
  disabled?: boolean
}

export const RecommendationResult = memo(function RecommendationResult({
  result,
  onConfirm,
  onBrowseAll,
  onBack,
  onSelectAlternative,
  disabled = false,
}: RecommendationResultProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const toggleAlternatives = useCallback(() => {
    setShowAlternatives(prev => !prev)
  }, [])

  const pageVariants = prefersReducedMotion
    ? getReducedMotionVariants(pageFadeUpVariants)
    : pageFadeUpVariants
  const timeline = prefersReducedMotion
    ? getReducedMotionVariants(timelineItemVariants)
    : timelineItemVariants
  const container = prefersReducedMotion
    ? getReducedMotionVariants(containerVariants)
    : containerVariants
  const badge = prefersReducedMotion
    ? getReducedMotionVariants(badgePopVariants)
    : badgePopVariants

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={disabled}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
        <motion.div
          variants={badge}
          initial="hidden"
          animate="visible"
        >
          <Badge variant="outline" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            AI 분석 완료
          </Badge>
        </motion.div>
      </div>

      {/* 추천 결과 카드 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          delay: 0.1
        }}
      >
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
          <CardContent className="pt-6 space-y-4">
            {/* 헤더 */}
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={prefersReducedMotion ? { duration: 0 } : {
                  type: 'spring',
                  stiffness: 500,
                  damping: 25,
                  delay: 0.2
                }}
                className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
              >
                <Check className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <p className="text-sm text-primary font-medium">
                  이 방법이 적합합니다
                </p>
                <h3 className="text-xl font-bold mt-1">
                  {result.method.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.method.description}
                </p>
              </div>
            </div>

            {/* 선택 근거 - 타임라인 스타일 */}
            <div className="space-y-3 pt-4">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-0.5 bg-primary rounded" />
                왜 이 방법인가요?
              </p>
              <motion.div
                variants={container}
                initial="hidden"
                animate="visible"
                className="relative pl-4 border-l-2 border-primary/20 space-y-4"
              >
                {result.reasoning.map((step, index) => (
                  <motion.div
                    key={index}
                    custom={index}
                    variants={timeline}
                    className="relative"
                  >
                    {/* 타임라인 노드 */}
                    <div className="absolute -left-[calc(0.5rem+1px)] top-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    {/* 내용 */}
                    <div className="pl-3">
                      <span className="font-medium text-sm text-foreground">
                        {step.step}
                      </span>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* 경고 */}
            <AnimatePresence>
              {result.warnings && result.warnings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 pt-2"
                >
                  {result.warnings.map((warning, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 p-2.5 rounded-md bg-warning-bg border border-warning-border text-warning text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{warning}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 확인 버튼 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.4 }}
            >
              <Button
                onClick={onConfirm}
                disabled={disabled}
                className="w-full gap-2 mt-4"
                size="lg"
              >
                이 방법으로 분석하기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 대안 선택지 */}
      {result.alternatives.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <button
            type="button"
            onClick={toggleAlternatives}
            disabled={disabled}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <motion.span
              animate={{ rotate: showAlternatives ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
            다른 선택지 ({result.alternatives.length}개)
          </button>

          <AnimatePresence>
            {showAlternatives && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 overflow-hidden"
              >
                {result.alternatives.map((alt, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm',
                        disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => !disabled && onSelectAlternative(alt.method)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">
                                {alt.method.name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                대안
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alt.reason}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            disabled={disabled}
                          >
                            선택
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 직접 선택 링크 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="pt-2"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBrowseAll}
          disabled={disabled}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <List className="h-4 w-4" />
          전체 목록에서 직접 선택
        </Button>
      </motion.div>
    </motion.div>
  )
})

export default RecommendationResult
