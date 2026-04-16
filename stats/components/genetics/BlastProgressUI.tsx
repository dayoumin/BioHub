'use client'

import type { AnalysisPhase } from '@/lib/genetics/abortable-sleep'
import { Button } from '@/components/ui/button'
import { BIOLOGY_CALLOUT_ERROR, BIOLOGY_INSET_PANEL, BIOLOGY_PANEL } from '@/lib/design-tokens/biology'

interface BlastProgressUIProps {
  phase: AnalysisPhase
  currentStep: number
  elapsed: number
  estimatedTime: number
  stepLabels: readonly string[]
  errorMessage?: string
  onCancel: () => void
}

export function BlastProgressUI({
  phase,
  currentStep,
  elapsed,
  estimatedTime,
  stepLabels,
  errorMessage,
  onCancel,
}: BlastProgressUIProps): React.ReactElement {
  const phaseHeader =
    phase === 'submitting' ? '서열 제출 중...'
    : phase === 'polling' && currentStep === 1 ? '데이터베이스 검색 중...'
    : phase === 'polling' ? '유사도 분석 중...'
    : phase === 'fetching' ? '결과 수신 중...'
    : phase === 'error' ? '오류 발생' : ''

  return (
    <div className={`${BIOLOGY_PANEL} p-8`}>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{phaseHeader}</span>
          <span className="text-muted-foreground">{elapsed}초 경과</span>
        </div>

        {/* 4-segment progress bar */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-2 flex-1 transition-colors${
                i === 0 ? ' rounded-l-full' : i === 3 ? ' rounded-r-full' : ''
              } ${
                phase === 'error' ? 'bg-error/30'
                : i < currentStep ? 'bg-[color:var(--section-accent-bio)]'
                : i === currentStep ? 'animate-pulse bg-[color:var(--section-accent-bio)] opacity-60'
                : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground/60">
          <span>제출</span><span>검색</span><span>분석</span><span>결과</span>
        </div>
      </div>

      {/* 분석 과정 — 활성 단계에서 표시 */}
      {phase !== 'done' && phase !== 'error' && (
        <div className="space-y-3" role="status" aria-live="polite">
          <div className={BIOLOGY_INSET_PANEL}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">분석 과정</h4>
            <ol className="space-y-1.5 text-xs">
              {stepLabels.map((label, i) => (
                <li
                  key={i}
                  className={
                    i < currentStep ? 'text-[color:var(--section-accent-bio)]'
                    : i === currentStep ? 'font-medium text-[color:var(--section-accent-bio)]'
                    : 'text-muted-foreground/50'
                  }
                >
                  <span className="mr-1.5 inline-block w-4 text-center">
                    {i < currentStep ? '\u2713' : `${i + 1}.`}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </div>

          {phase === 'polling' && (
            <p className="text-sm text-muted-foreground">
              예상 시간: 약 {estimatedTime}초
              {estimatedTime > 0 && elapsed < estimatedTime
                ? ` · 남은 시간 약 ${Math.max(estimatedTime - elapsed, 1)}초`
                : ''}
            </p>
          )}

          {phase === 'fetching' && (
            <p className="text-sm text-muted-foreground">거의 완료되었습니다...</p>
          )}

          <p className="text-xs text-warning/90">
            분석이 완료될 때까지 이 페이지를 유지해주세요.
          </p>
          {elapsed > 120 && (
            <p className="text-xs text-warning">
              평소보다 오래 걸리고 있습니다. NCBI 서버 상태에 따라 지연될 수 있습니다.
            </p>
          )}

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={onCancel}
          >
            분석 취소
          </Button>
        </div>
      )}

      {phase === 'error' && errorMessage && (
        <div className={`${BIOLOGY_CALLOUT_ERROR} p-4`}>
          <p className="text-sm text-error">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
