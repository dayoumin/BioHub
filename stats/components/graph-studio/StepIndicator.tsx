'use client';

/**
 * 3단계 흐름 표시기 — DataUploadPanel + ChartSetupPanel 공유
 *
 * ① 데이터 선택 > ② 차트 설정 > ③ 편집
 */

import { ChevronRight } from 'lucide-react';

const STEPS = ['① 데이터 선택', '② 차트 설정', '③ 편집'] as const;

interface StepIndicatorProps {
  currentStep: 0 | 1 | 2;
}

export function StepIndicator({ currentStep }: StepIndicatorProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
      {STEPS.map((step, i) => (
        <span key={step} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {i === currentStep ? (
            <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {step}
            </span>
          ) : (
            <span>{step}</span>
          )}
        </span>
      ))}
    </div>
  );
}
