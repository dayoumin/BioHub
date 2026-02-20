'use client'

/**
 * 통계 분석 중 오버레이 컴포넌트
 *
 * isAnalyzing 상태일 때 표시되는 전체 화면 오버레이
 * - 중앙에 로딩 애니메이션
 * - 분석 메시지 표시
 * - 배경 블러 효과
 */

import { Loader2 } from 'lucide-react'

interface AnalyzingOverlayProps {
  isAnalyzing: boolean
  message?: string
}

export function AnalyzingOverlay({ isAnalyzing, message = '통계 분석 중...' }: AnalyzingOverlayProps) {
  if (!isAnalyzing) {
    return null
  }

  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
      <div className="bg-card border rounded-2xl p-8 shadow-2xl max-w-sm mx-4 animate-in zoom-in-95 duration-300">
        <div className="space-y-6">
          {/* 로딩 애니메이션 */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" style={{ width: '80px', height: '80px' }} />

              {/* Spinning ring */}
              <div className="relative flex items-center justify-center" style={{ width: '80px', height: '80px' }}>
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>

              {/* Inner pulse */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary/20 rounded-full animate-ping" />
            </div>
          </div>

          {/* 메시지 */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{message}</h3>
            <p className="text-sm text-muted-foreground">
              Python 통계 엔진으로 분석하고 있습니다
            </p>
          </div>

          {/* 진행 점 애니메이션 */}
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}