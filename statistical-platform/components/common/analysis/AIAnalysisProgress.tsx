/**
 * AIAnalysisProgress - 범용 AI 분석 프로그레스 컴포넌트
 *
 * 사용처:
 * 1. Smart Flow: 분석 목적 선택 후 AI 분석 중
 * 2. 개별 통계 페이지: 데이터 적합도 체크 중
 * 3. 기타: 다단계 분석 프로세스
 *
 * 특징:
 * - 프로그레스 바 (0-100%)
 * - 단계별 체크마크 애니메이션
 * - 커스터마이징 가능한 단계 메시지
 * - 완전한 타입 안전성
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Check, Loader2 } from 'lucide-react'

export interface AnalysisStep {
  /** 단계 레이블 */
  label: string
  /** 완료 임계값 (0-100) */
  threshold: number
}

export interface AIAnalysisProgressProps {
  /** 현재 진행률 (0-100) */
  progress: number
  /** 분석 단계 목록 (옵션, 기본값: 3단계) */
  steps?: AnalysisStep[]
  /** 타이틀 (옵션, 기본값: "AI 분석 중...") */
  title?: string
  /** 추가 CSS 클래스 (옵션) */
  className?: string
}

const DEFAULT_STEPS: AnalysisStep[] = [
  { label: '데이터 특성 분석 중...', threshold: 30 },
  { label: '통계 가정 검정 중...', threshold: 60 },
  { label: '최적 방법 추천 중...', threshold: 100 }
]

export function AIAnalysisProgress({
  progress,
  steps = DEFAULT_STEPS,
  title = 'AI 분석 중...',
  className
}: AIAnalysisProgressProps) {
  return (
    <Card className={`border-2 border-primary/20 bg-primary/5 ${className || ''}`}>
      <CardContent className="py-8">
        <div className="space-y-6">
          {/* 프로그레스 바 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{title}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* 단계별 메시지 */}
          <div className="space-y-3 text-sm">
            {steps.map((step, index) => {
              const isCompleted = progress >= step.threshold
              const isActive = index === 0
                ? progress < steps[0].threshold
                : progress >= steps[index - 1].threshold && progress < step.threshold
              const isPending = index > 0 && progress < steps[index - 1].threshold

              return (
                <div key={index} className="flex items-center gap-3">
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-success shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
                  )}
                  <span
                    className={
                      isCompleted || isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
