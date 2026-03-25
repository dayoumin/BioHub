'use client'

/**
 * AutoRecommendationConfirm - AI 자동 추천 결과 확인 카드
 *
 * 데이터 업로드 후 AI가 자동으로 추천한 분석 방법을 사용자에게 보여주고
 * 확인/변경을 선택할 수 있게 합니다.
 *
 * - 추천 방법 + 신뢰도 + 근거
 * - 변수 할당 미리보기
 * - 대안 방법 선택
 * - "다른 방법 찾기" (채팅/브라우즈 전환)
 */

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  AlertTriangle,
  MessageSquare,
  List,
  Sparkles,
  Info,
} from 'lucide-react'
import { AssumptionBadges } from '@/components/analysis/common/AssumptionBadges'
import { WarningBanner } from '@/components/common/WarningBanner'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useTerminology } from '@/hooks/use-terminology'
import type { AIRecommendation, StatisticalMethod } from '@/types/analysis'
import type { LlmProvider } from '@/lib/services/llm-recommender'

interface AutoRecommendationConfirmProps {
  recommendation: AIRecommendation
  provider?: LlmProvider | null
  disabled?: boolean
  onConfirm: (method: StatisticalMethod) => void
  onSelectAlternative: (method: StatisticalMethod) => void
  onOpenChat: () => void
  onBrowseAll: () => void
}

export const AutoRecommendationConfirm = memo(function AutoRecommendationConfirm({
  recommendation,
  provider,
  disabled = false,
  onConfirm,
  onSelectAlternative,
  onOpenChat,
  onBrowseAll,
}: AutoRecommendationConfirmProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()

  const handleConfirm = useCallback(() => {
    onConfirm(recommendation.method)
  }, [onConfirm, recommendation.method])

  const handleAlternativeClick = useCallback((alt: StatisticalMethod) => {
    onSelectAlternative(alt)
  }, [onSelectAlternative])

  const confidenceColor = recommendation.confidence >= 0.8
    ? 'border-green-500/40 text-green-600 bg-green-50 dark:bg-green-950/20'
    : recommendation.confidence >= 0.5
      ? 'border-yellow-500/40 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20'
      : 'border-red-500/40 text-red-600 bg-red-50 dark:bg-red-950/20'

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* 메인 추천 카드 */}
      <Card className="border-primary/20 shadow-sm" data-testid="auto-recommendation-card">
        <CardContent className="p-6 space-y-5">
          {/* 상단: 배지 + 신뢰도 */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              {provider === 'keyword'
                ? t.naturalLanguageInput.providers.keyword
                : t.naturalLanguageInput.recommendation.badgeLabel}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', confidenceColor)}>
              {Math.round(recommendation.confidence * 100)}{t.naturalLanguageInput.recommendation.confidenceUnit}
            </Badge>
          </div>

          {/* 메서드명 + 설명 */}
          <div>
            <h3 className="text-xl font-bold tracking-tight">
              {recommendation.method.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {recommendation.method.description}
            </p>
          </div>

          {/* 모호성 안내 */}
          {recommendation.ambiguityNote && (
            <WarningBanner data-testid="ambiguity-note" icon={<Info />}>
              {recommendation.ambiguityNote}
            </WarningBanner>
          )}

          {/* 추천 근거 */}
          {recommendation.reasoning.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <span className="w-4 h-0.5 bg-primary rounded" />
                {t.naturalLanguageInput.recommendation.reasoningTitle}
              </p>
              <ul className="space-y-1.5 pl-1">
                {recommendation.reasoning.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 변수 할당 미리보기 */}
          {recommendation.variableAssignments && (
            <div data-testid="variable-assignments" className="space-y-2">
              <p className="text-sm font-medium">{t.naturalLanguageInput.recommendation.variableAssignmentTitle}</p>
              <div className="flex flex-wrap gap-1.5">
                {recommendation.variableAssignments.dependent?.map(v => (
                  <Badge key={`dep-${v}`} variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
                    {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.dependent}</span>
                  </Badge>
                ))}
                {recommendation.variableAssignments.independent?.map(v => (
                  <Badge key={`ind-${v}`} variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300">
                    {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.independent}</span>
                  </Badge>
                ))}
                {recommendation.variableAssignments.factor?.map(v => (
                  <Badge key={`fac-${v}`} variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                    {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.factor}</span>
                  </Badge>
                ))}
                {recommendation.variableAssignments.covariate?.map(v => (
                  <Badge key={`cov-${v}`} variant="outline" className="text-xs border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400">
                    {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.covariate}</span>
                  </Badge>
                ))}
                {recommendation.variableAssignments.within?.map(v => (
                  <Badge key={`wit-${v}`} variant="outline" className="text-xs border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300">
                    {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.within}</span>
                  </Badge>
                ))}
                {recommendation.variableAssignments.between?.map(v => (
                  <Badge key={`bet-${v}`} variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-300">
                    {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.between}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 가정 검정 배지 — recommendation.assumptions 단일 소스 */}
          <AssumptionBadges assumptions={recommendation.assumptions} />

          {/* 경고 */}
          {recommendation.warnings && recommendation.warnings.length > 0 && (
            <div data-testid="recommendation-warnings" className="space-y-1">
              {recommendation.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA: 확인 버튼 */}
          <Button
            onClick={handleConfirm}
            disabled={disabled}
            size="lg"
            className="w-full gap-2"
            data-testid="select-recommended-method"
          >
            {t.naturalLanguageInput.buttons.selectMethod}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* 대안 방법 */}
      {recommendation.alternatives && recommendation.alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t.naturalLanguageInput.recommendation.alternativesTitle(recommendation.alternatives.length)}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recommendation.alternatives.map((alt, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleAlternativeClick(alt)}
                data-testid={`alternative-method-${i}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{alt.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{alt.description}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      {t.naturalLanguageInput.buttons.select}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 하단: 다른 방법 찾기 */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenChat}
          disabled={disabled}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="w-4 h-4" />
          {t.naturalLanguageInput.buttons.askAiAgain}
        </Button>
        <span className="text-muted-foreground/40">|</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBrowseAll}
          disabled={disabled}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <List className="w-4 h-4" />
          {t.naturalLanguageInput.buttons.browseAll}
        </Button>
      </div>
    </motion.div>
  )
})

export default AutoRecommendationConfirm
