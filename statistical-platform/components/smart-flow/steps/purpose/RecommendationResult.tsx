'use client'

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
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useCallback } from 'react'
import type { DecisionResult, StatisticalMethod } from '@/types/smart-flow'

interface RecommendationResultProps {
  result: DecisionResult
  onConfirm: () => void
  onBrowseAll: () => void
  onBack: () => void
  onSelectAlternative: (method: StatisticalMethod) => void
}

export function RecommendationResult({
  result,
  onConfirm,
  onBrowseAll,
  onBack,
  onSelectAlternative
}: RecommendationResultProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)

  const toggleAlternatives = useCallback(() => {
    setShowAlternatives(prev => !prev)
  }, [])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
      </div>

      {/* 추천 결과 카드 */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 space-y-4">
          {/* 헤더 */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Check className="h-5 w-5 text-primary" />
            </div>
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

          {/* 선택 근거 */}
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-foreground">선택 근거:</p>
            <div className="space-y-1.5">
              {result.reasoning.map((step, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    <span className="font-medium">{step.step}</span>
                    <span className="text-muted-foreground"> → {step.description}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 경고 */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {result.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 text-amber-700 text-sm"
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* 확인 버튼 */}
          <Button
            onClick={onConfirm}
            className="w-full gap-2 mt-4"
            size="lg"
          >
            이 방법으로 분석하기
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* 대안 선택지 */}
      {result.alternatives.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={toggleAlternatives}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAlternatives ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            다른 선택지 ({result.alternatives.length}개)
          </button>

          {showAlternatives && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {result.alternatives.map((alt, index) => (
                <Card
                  key={index}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm'
                  )}
                  onClick={() => onSelectAlternative(alt.method)}
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
                      >
                        선택
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 직접 선택 링크 */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBrowseAll}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <List className="h-4 w-4" />
          전체 목록에서 직접 선택
        </Button>
      </div>
    </div>
  )
}
