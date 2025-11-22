'use client'

import { CheckCircle, AlertTriangle, LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

export interface GuidanceCardProps {
  /** 카드 제목 (예: "데이터 준비 완료!", "분석 방법이 결정되었습니다!") */
  title: string
  /** 부제목 또는 설명 (선택) */
  description?: string | React.ReactNode
  /** 다음 단계 리스트 */
  steps: Array<{
    emoji: string
    text: string
  }>
  /** CTA 버튼 텍스트 */
  ctaText: string
  /** CTA 버튼 아이콘 (선택) */
  ctaIcon?: React.ReactNode
  /** CTA 버튼 클릭 핸들러 */
  onCtaClick: () => void
  /** CTA 버튼 비활성화 여부 (선택) */
  ctaDisabled?: boolean
  /** 경고 메시지 (선택, 경고가 있을 때만 표시) */
  warningMessage?: string
  /** 애니메이션 딜레이 (ms, 기본값: 700) */
  animationDelay?: number
  /** 테스트 ID (선택) */
  'data-testid'?: string
}

/**
 * Smart Flow 가이드 카드
 *
 * 사용처:
 * - Step 2 (DataValidationStep): 데이터 준비 완료
 * - Step 3 (PurposeInputStep): 분석 방법 결정
 *
 * 특징:
 * - 일관된 디자인 (border-dashed, bg-primary/5)
 * - 3단계 프로세스 리스트
 * - CTA 버튼 + 아이콘
 * - 경고 메시지 지원
 * - prefers-reduced-motion 지원
 */
export function GuidanceCard({
  title,
  description,
  steps,
  ctaText,
  ctaIcon,
  onCtaClick,
  ctaDisabled = false,
  warningMessage,
  animationDelay = 700,
  'data-testid': testId
}: GuidanceCardProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <Card
      className={`border-2 border-dashed border-primary/50 bg-primary/5 ${
        prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-4'
      }`}
      style={prefersReducedMotion ? undefined : {
        animationDuration: `${animationDelay}ms`,
        animationFillMode: 'backwards'
      }}
      data-testid={testId}
    >
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* 성공 아이콘 */}
          <CheckCircle className="w-16 h-16 text-success mx-auto" />

          {/* 제목 */}
          <h3 className="text-xl font-semibold">{title}</h3>

          {/* 설명 */}
          {description && (
            <div className="text-muted-foreground">
              {typeof description === 'string' ? <p>{description}</p> : description}
            </div>
          )}

          {/* 경고 메시지 */}
          {warningMessage && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mx-auto max-w-md">
              <div className="flex items-center gap-2 text-sm text-warning-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">{warningMessage}</span>
              </div>
            </div>
          )}

          {/* 다음 단계 리스트 */}
          <div className="bg-muted p-4 rounded-lg space-y-3 max-w-md mx-auto">
            <p className="text-sm font-medium">다음 단계:</p>
            <ol className="text-sm text-muted-foreground text-left space-y-2">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-bold text-primary">{step.emoji}</span>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA 버튼 */}
          <Button
            size="lg"
            onClick={onCtaClick}
            disabled={ctaDisabled}
            className="mt-4"
          >
            {ctaText}
            {ctaIcon && <span className="ml-2">{ctaIcon}</span>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
