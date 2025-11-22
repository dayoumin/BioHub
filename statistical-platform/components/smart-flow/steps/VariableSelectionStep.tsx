'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { VariableSelectorToggle } from '@/components/common/VariableSelectorToggle'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

interface VariableSelectionStepProps {
  onComplete?: () => void
  onBack?: () => void
}

export function VariableSelectionStep({ onComplete, onBack }: VariableSelectionStepProps) {
  const {
    uploadedData,
    selectedMethod,
    setVariableMapping,
    goToNextStep,
    goToPreviousStep
  } = useSmartFlowStore()

  // 변수 선택 완료 처리
  const handleComplete = (selection: { dependent: string | null; independent: string | null }) => {
    const mapping: VariableMapping = {
      dependentVar: selection.dependent || undefined,
      independentVar: selection.independent || undefined
    }

    setVariableMapping(mapping)

    // 자동으로 다음 단계로 진행
    if (onComplete) {
      onComplete()
    } else {
      goToNextStep()
    }
  }

  if (!uploadedData || uploadedData.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          데이터를 먼저 업로드해주세요.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-xl font-semibold">변수 선택</div>
        {selectedMethod && (
          <Badge variant="secondary">{selectedMethod.name}</Badge>
        )}
      </div>

      <VariableSelectorToggle
        data={uploadedData}
        onComplete={handleComplete}
        onBack={onBack || goToPreviousStep}
        title="분석 변수 선택"
        description="분석에 사용할 종속변수와 독립변수를 선택하세요"
      />
    </div>
  )
}
