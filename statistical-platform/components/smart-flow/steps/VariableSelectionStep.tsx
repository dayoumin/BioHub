'use client'

import React, { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Info, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import { VariableAssignment } from '@/components/variable-selection/VariableSelector'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

interface VariableSelectionStepProps {
  onComplete?: () => void
  onBack?: () => void
}

export function VariableSelectionStep({ onComplete, onBack }: VariableSelectionStepProps) {
  const {
    uploadedData,
    selectedMethod,
    variableMapping,
    setVariableMapping,
    goToNextStep,
    goToPreviousStep
  } = useSmartFlowStore()

  const [selectedMode, setSelectedMode] = useState<'simple' | 'advanced' | 'premium'>('simple')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)

  // 메서드 정보 가져오기
  const methodRequirements = selectedMethod ? getMethodRequirements(selectedMethod.id) : null

  // 변수 선택 완료 처리
  const handleVariablesSelected = (assignment: VariableAssignment) => {
    // variableMapping 형식으로 변환
    const mapping = {
      dependent: assignment.dependent as string | string[] | undefined,
      independent: assignment.independent as string | string[] | undefined,
      factor: assignment.factor as string | string[] | undefined,
      covariate: assignment.covariate as string | string[] | undefined,
      blocking: assignment.blocking as string | undefined,
      within: assignment.within as string | string[] | undefined,
      between: assignment.between as string | string[] | undefined,
      time: assignment.time as string | undefined,
      event: assignment.event as string | undefined,
      censoring: assignment.censoring as string | undefined,
      weight: assignment.weight as string | undefined
    }

    setVariableMapping(mapping as VariableMapping)
    setIsValid(true)
    setValidationErrors([])

    // 자동으로 다음 단계로 진행
    if (onComplete) {
      onComplete()
    } else {
      goToNextStep()
    }
  }

  // 검증 콜백
  const handleValidation = (errors: string[]) => {
    setValidationErrors(errors)
    setIsValid(errors.length === 0)
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

  if (!selectedMethod) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          먼저 분석 방법을 선택해주세요.
        </AlertDescription>
      </Alert>
    )
  }

  if (!methodRequirements) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          선택한 분석 방법 ({selectedMethod.id})에 대한 변수 요구사항을 찾을 수 없습니다.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xl font-semibold">
            변수 선택
            <Badge variant="secondary">{selectedMethod.name}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {methodRequirements.description}
          </p>
        </div>
        {isValid && (
          <Badge className="bg-success text-white">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            변수 선택 완료
          </Badge>
        )}
      </div>

      <div className="space-y-6">
        {/* UI 모드 선택 */}
        <Tabs value={selectedMode} onValueChange={(v) => setSelectedMode(v as any)} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">드래그앤드롭 (추천)</TabsTrigger>
            <TabsTrigger value="advanced">3단 레이아웃</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="mt-4">
            <VariableSelectorModern
              methodId={selectedMethod.id}
              data={uploadedData}
              onVariablesSelected={handleVariablesSelected}
              onBack={onBack || goToPreviousStep}
            />
          </TabsContent>

          <TabsContent value="advanced" className="mt-4">
            <VariableSelector
              methodId={selectedMethod.id}
              data={uploadedData}
              onVariablesSelected={handleVariablesSelected}
            />
          </TabsContent>
        </Tabs>

        {/* 검증 오류 표시 */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">변수 선택 오류:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* 현재 선택된 변수 표시 */}
        {variableMapping && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">현재 선택된 변수:</p>
              <div className="space-y-1 text-sm">
                {Object.entries(variableMapping).map(([key, value]) => {
                  if (!value) return null
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Badge variant="outline">{key}</Badge>
                      <span>{Array.isArray(value) ? value.join(', ') : value}</span>
                    </div>
                  )
                })}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
