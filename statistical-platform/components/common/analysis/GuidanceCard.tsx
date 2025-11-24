'use client'

import { CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

export interface GuidanceCardProps {
  /** 카드 제목 (예: "데이터 준비 완료!", "분석 방법이 결정되었습니다!") */
  title: string
  /** 부제목 또는 설명 (선택) */
  description?: string | React.ReactNode
  /** 다음 단계 리스트 (현재 사용하지 않음, 하위 호환성 유지) */
  steps?: Array<{
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
 * 디자인 특징:
 * - 🎨 그라데이션 배경 (blue → indigo → purple)
 * - 🗑️ 최소주의: 핵심 메시지 + CTA만 표시
 * - ✨ 부드러운 음영 + hover 효과
 * - 📐 반응형: 모바일(수직) / 데스크탑(수평)
 * - 🎯 단일 행동 유도
 */
export function GuidanceCard({
  title,
  description,
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
      className={`
        border border-blue-200 dark:border-blue-800
        bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50
        dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30
        shadow-sm hover:shadow-md transition-shadow duration-200
        ${prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-4'}
      `}
      style={prefersReducedMotion ? undefined : {
        animationDuration: `${animationDelay}ms`,
        animationFillMode: 'backwards'
      }}
      data-testid={testId}
    >
      <CardContent className="p-4">
        {/* 경고 메시지 (최상단) */}
        {warningMessage && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mb-3">
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-100">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{warningMessage}</span>
            </div>
          </div>
        )}

        {/* 메인 컨텐츠: 수평 레이아웃 (모바일에서 수직) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 좌측: 아이콘 + 제목 + 설명 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="text-left min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {title}
              </h3>
              {description && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {typeof description === 'string' ? <p>{description}</p> : description}
                </div>
              )}
            </div>
          </div>

          {/* 우측: CTA 버튼 */}
          <Button
            size="default"
            onClick={onCtaClick}
            disabled={ctaDisabled}
            className="flex-shrink-0 shadow-sm"
          >
            {ctaText}
            {ctaIcon && <span className="ml-2">{ctaIcon}</span>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
