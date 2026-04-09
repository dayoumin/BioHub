'use client'

/**
 * VariableSelectionStep - Dynamic Variable Selection by Method
 *
 * Renders different variable selector components based on the selected statistical method.
 * Uses detectedVariables from Step 2 as initial selection.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Settings2, Sparkles, Upload, Info } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { AutoConfirmSelector, ChiSquareSelector } from '@/components/common/variable-selectors'
import { UnifiedVariableSelector } from '@/components/analysis/variable-selector/UnifiedVariableSelector'
import type { SelectorType } from '@/components/analysis/variable-selector/slot-configs'
import { getSlotConfigs } from '@/components/analysis/variable-selector/slot-configs'
import { getSelectorType } from '@/lib/registry'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { VariableMapping, ColumnInfo } from '@/lib/statistics/variable-mapping'
import { startPreemptiveAssumptions } from '@/lib/services/preemptive-assumption-service'
import { useTerminology } from '@/hooks/use-terminology'
import { CollapsibleSection, StepHeader } from '@/components/analysis/common'
import { AnalysisOptionsSection } from '@/components/analysis/variable-selector/AnalysisOptions'

/** U1-3: 비교용 정규화 — 키 정렬 + 배열 정렬 + null/undefined 제거 */
function normalizeMapping(m: VariableMapping): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(m).sort()) {
    const value = m[key as keyof VariableMapping]
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      result[key] = [...value].sort()
    } else {
      result[key] = value
    }
  }
  return result
}

interface VariableSelectionStepProps {
  onComplete?: () => void
  onBack?: () => void
}

/**
 * SELECTOR_MAP은 method-registry.ts로 이전됨.
 * getSelectorType(methodId) 사용.
 * @see lib/registry/method-registry.ts
 */

export function VariableSelectionStep({ onComplete, onBack }: VariableSelectionStepProps) {
  const t = useTerminology()

  const {
    uploadedData,
    selectedMethod,
    detectedVariables,
    variableMapping: existingMapping,
    validationResults,
    setVariableMapping,
    updateVariableMappingWithInvalidation,
    goToNextStep,
    goToPreviousStep,
    navigateToStep
  } = useAnalysisStore()

  const stepTrack = useModeStore(state => state.stepTrack)
  const setStepTrack = useModeStore(state => state.setStepTrack)
  const backLabel = (stepTrack === 'quick' || stepTrack === 'diagnostic') ? '데이터로 돌아가기' : t.analysis.layout.prevStep

  const [validationAlert, setValidationAlert] = useState<string | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)

  // Determine selector type
  // Special case: one-way-anova/anova + AI detected 2+ factors → two-way-anova
  const selectorType = useMemo((): SelectorType => {
    const id = selectedMethod?.id ?? ''
    const base = getSelectorType(id)
    if (
      (id === 'one-way-anova' || id === 'anova') &&
      detectedVariables?.factors &&
      detectedVariables.factors.length >= 2
    ) {
      return 'two-way-anova'
    }
    return base
  }, [selectedMethod?.id, detectedVariables?.factors])

  // Get column info for validation
  const columnInfo = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.map(col => ({
      name: col.name,
      // ColumnStatistics.type ('numeric'|'categorical'|'mixed') → ColumnInfo.type
      // 'mixed' 타입은 카테고리로 분류 (숫자+문자 혼합 → 범주 취급이 안전)
      type: (col.type === 'mixed' ? 'categorical' : col.type) as ColumnInfo['type'],
      uniqueValues: col.uniqueValues
    }))
  }, [validationResults])

  // Handle variable selection complete with validation
  // U1-3: 변경 감지 — 이전 mapping과 다르면 results/assumptions 무효화
  const handleComplete = useCallback((mapping: VariableMapping) => {
    setValidationAlert(null)

    if (selectedMethod && columnInfo.length > 0) {
      const validation = validateVariableMapping(selectedMethod, mapping, columnInfo)
      if (!validation.isValid) {
        logger.warn('[VariableSelection] Validation errors', { errors: validation.errors })
        setValidationAlert(validation.errors.join(' / '))
        // Show alert but still allow progression
      }
    }

    // 변경 감지: 정규화 비교 (배열/문자열 표현 차이 대응)
    const isMappingChanged = !existingMapping
      || JSON.stringify(normalizeMapping(mapping)) !== JSON.stringify(normalizeMapping(existingMapping))

    if (isMappingChanged) {
      updateVariableMappingWithInvalidation(mapping)
    } else {
      setVariableMapping(mapping)
    }

    // 매핑 변경 시 Step 4 도달 전에 가정 검정 선행 실행
    if (isMappingChanged && uploadedData) {
      startPreemptiveAssumptions(mapping, uploadedData)
    }

    if (onComplete) {
      onComplete()
    } else {
      goToNextStep()
    }
  }, [selectedMethod, columnInfo, existingMapping, uploadedData, setVariableMapping, updateVariableMappingWithInvalidation, onComplete, goToNextStep])

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      goToPreviousStep()
    }
  }, [onBack, goToPreviousStep])

  // Build initial selection: variableMapping 우선, 없으면 detectedVariables fallback
  const initialSelection = useMemo((): Partial<VariableMapping> => {
    // U1-3: 이전 확정값이 있으면 1순위로 사용 (결과 화면에서 "변수 수정" 후 재진입 시)
    if (existingMapping) return existingMapping
    if (!detectedVariables) return {}

    const result: Partial<VariableMapping> = {}

    switch (selectorType) {
      case 'one-sample':
        result.dependentVar = detectedVariables.dependentCandidate
        break

      case 'two-way-anova':
        if (detectedVariables.factors && detectedVariables.factors.length >= 2) {
          result.groupVar = detectedVariables.factors.slice(0, 2).join(',')
        }
        result.dependentVar = detectedVariables.dependentCandidate
        break

      case 'correlation':
        result.variables = detectedVariables.numericVars
        break

      case 'paired':
        if (detectedVariables.pairedVars) {
          result.variables = detectedVariables.pairedVars
        } else if (detectedVariables.numericVars && detectedVariables.numericVars.length >= 2) {
          result.variables = detectedVariables.numericVars.slice(0, 2)
        }
        break

      case 'multiple-regression':
        result.dependentVar = detectedVariables.dependentCandidate
        if (detectedVariables.independentVars?.length) {
          result.independentVar = detectedVariables.independentVars.join(',')
        } else if (detectedVariables.numericVars && detectedVariables.numericVars.length > 1) {
          const independents = detectedVariables.numericVars.filter(
            v => v !== detectedVariables.dependentCandidate
          )
          result.independentVar = independents.join(',')
        }
        break

      case 'group-comparison':
        result.groupVar = detectedVariables.groupVariable
        result.dependentVar = detectedVariables.dependentCandidate
        if (detectedVariables.covariates?.length) {
          result.covariate = detectedVariables.covariates
        }
        break

      case 'chi-square':
        result.independentVar = detectedVariables.groupVariable || detectedVariables.independentVars?.[0]
        result.dependentVar = detectedVariables.dependentCandidate
        break

      case 'repeated-measures':
        if (detectedVariables.numericVars?.length) {
          result.variables = detectedVariables.numericVars
        }
        if (detectedVariables.groupVariable) {
          result.groupVar = detectedVariables.groupVariable
        }
        break

      case 'manova':
        if (detectedVariables.numericVars?.length) {
          result.variables = detectedVariables.numericVars
        }
        if (detectedVariables.groupVariable) {
          result.groupVar = detectedVariables.groupVariable
        }
        break

      case 'survival':
        result.timeVar = detectedVariables.dependentCandidate
        if (detectedVariables.eventVariable) {
          result.event = detectedVariables.eventVariable
        }
        if (detectedVariables.groupVariable) {
          result.groupVar = detectedVariables.groupVariable
        }
        if (detectedVariables.independentVars?.length) {
          result.independentVar = detectedVariables.independentVars.join(',')
        }
        break

      case 'time-series':
        result.dependentVar = detectedVariables.dependentCandidate
        // Time might be detected as an independent categorical/date variable
        if (detectedVariables.independentVars?.length) {
          result.timeVar = detectedVariables.independentVars[0]
        }
        break

      case 'mixed-model':
        result.dependentVar = detectedVariables.dependentCandidate
        if (detectedVariables.factors?.length) {
          result.groupVar = detectedVariables.factors.join(',')
        } else if (detectedVariables.groupVariable) {
          result.groupVar = detectedVariables.groupVariable
        }
        break

      case 'discriminant':
        result.dependentVar = detectedVariables.groupVariable || detectedVariables.dependentCandidate
        if (detectedVariables.independentVars?.length) {
          result.independentVar = detectedVariables.independentVars.join(',')
        } else if (detectedVariables.numericVars?.length) {
          const target = result.dependentVar
          const predictors = detectedVariables.numericVars.filter(v => v !== target)
          if (predictors.length) {
            result.independentVar = predictors.join(',')
          }
        }
        break

      case 'roc-curve':
        // state(실제 클래스) → dependentVar, test(예측 점수) → independentVar
        result.dependentVar = detectedVariables.eventVariable || detectedVariables.groupVariable
        result.independentVar = detectedVariables.dependentCandidate
        break

      case 'auto':
        result.dependentVar = detectedVariables.dependentCandidate
        if (detectedVariables.independentVars?.length) {
          result.independentVar = detectedVariables.independentVars.join(',')
        }
        if (detectedVariables.groupVariable) {
          result.groupVar = detectedVariables.groupVariable
        }
        if (detectedVariables.numericVars?.length) {
          result.variables = detectedVariables.numericVars
        }
        if (detectedVariables.eventVariable) {
          result.event = detectedVariables.eventVariable
        }
        break

      default:
        result.dependentVar = detectedVariables.dependentCandidate
        if (detectedVariables.independentVars?.length) {
          result.independentVar = detectedVariables.independentVars[0]
        } else if (detectedVariables.numericVars && detectedVariables.numericVars.length > 1) {
          result.independentVar = detectedVariables.numericVars.find(
            v => v !== detectedVariables.dependentCandidate
          )
        }
        if (detectedVariables.covariates?.length) {
          result.covariate = detectedVariables.covariates
        }
        break
    }

    return result
  }, [existingMapping, detectedVariables, selectorType])

  // F1: 필수 슬롯이 프리필되지 않았을 때 메서드별 가이드 표시
  const needsVariableGuide = useMemo(() => {
    if (!selectedMethod || selectorType === 'auto') return false
    const slots = getSlotConfigs(selectorType)
    const requiredSlots = slots.filter(s => s.required)
    return requiredSlots.some(slot => {
      const v = initialSelection[slot.mappingKey]
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
    })
  }, [selectedMethod, selectorType, initialSelection])

  // No data check
  if (!uploadedData || uploadedData.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title={t.analysis.emptyStates.dataRequired}
        description={t.analysis.emptyStates.dataRequiredDescription}
        action={
          onBack && (
            <Button variant="outline" onClick={onBack}>
              {t.analysis.layout.prevStep}
            </Button>
          )
        }
      />
    )
  }

  // Render appropriate selector based on method
  const renderSelector = () => {
    if (selectorType === 'auto') {
      return (
        <AutoConfirmSelector
          data={uploadedData}
          onBack={handleBack}
          backLabel={backLabel}
          initialSelection={initialSelection}
          className="mt-4"
          onComplete={handleComplete}
        />
      )
    }

    // Chi-square family: fallback to ChiSquareSelector
    // (goodness/proportion need 1-var mode + nullProportion; mcnemar needs binary filter)
    if (selectorType === 'chi-square') {
      return (
        <ChiSquareSelector
          data={uploadedData}
          onComplete={handleComplete}
          onBack={handleBack}
          backLabel={backLabel}
          initialSelection={initialSelection}
          className="mt-4"
          methodId={selectedMethod?.id}
        />
      )
    }

    // All other selector types use UnifiedVariableSelector
    return (
      <UnifiedVariableSelector
        data={uploadedData}
        selectorType={selectorType}
        onComplete={handleComplete}
        onBack={handleBack}
        backLabel={backLabel}
        initialSelection={initialSelection}
        className="mt-4"
      />
    )
  }

  return (
    <div className="space-y-8" data-testid="variable-selection-step" data-method-id={selectedMethod?.id ?? ''} data-selector-type={selectorType}>
      <StepHeader
        icon={Settings2}
        title={t.analysis.stepTitles.variableSelection}
        badge={selectedMethod ? { label: selectedMethod.name } : undefined}
      />

      {/* Validation Alert (from variable mapping validation) */}
      {validationAlert && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationAlert}</AlertDescription>
        </Alert>
      )}

      {/* AI Detected Variables Info — Axiom Slate: tonal surface shift, no border */}
      {detectedVariables && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-surface-container-low">
          <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-on-secondary-container" />
          </div>
          <div className="text-sm space-y-2">
            <span className="font-semibold tracking-tight text-foreground">{t.analysis.aiVariables.title}</span>
            <div className="flex flex-wrap gap-2">
              {detectedVariables.dependentCandidate && (
                <Badge variant="outline" className="text-[10px] bg-info-bg border-transparent text-info font-medium">
                  {t.analysis.aiVariables.roles.dependent} {detectedVariables.dependentCandidate}
                </Badge>
              )}
              {detectedVariables.groupVariable && (
                <Badge variant="outline" className="text-[10px] bg-success-bg border-transparent text-success font-medium">
                  {t.analysis.aiVariables.roles.group} {detectedVariables.groupVariable}
                </Badge>
              )}
              {detectedVariables.factors && detectedVariables.factors.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-success-bg border-transparent text-success font-medium">
                  {t.analysis.aiVariables.roles.factors} {detectedVariables.factors.join(', ')}
                </Badge>
              )}
              {detectedVariables.independentVars && detectedVariables.independentVars.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-highlight-bg border-transparent text-highlight font-medium">
                  {t.analysis.aiVariables.roles.independent} {detectedVariables.independentVars.join(', ')}
                </Badge>
              )}
              {detectedVariables.covariates && detectedVariables.covariates.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-surface-container border-transparent text-muted-foreground font-medium">
                  {t.analysis.aiVariables.roles.covariate} {detectedVariables.covariates.join(', ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* F1: Method Variable Guide — 필수 슬롯이 프리필되지 않았을 때 표시 */}
      {needsVariableGuide && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm space-y-2">
            <span className="font-semibold tracking-tight text-foreground">
              {selectedMethod?.name}
            </span>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              {getSlotConfigs(selectorType).map(slot => (
                <li key={slot.id}>
                  <strong className="text-foreground font-medium">{slot.label}</strong>: {slot.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Dynamic Selector */}
      {renderSelector()}

      {/* F2: Option to change method if quick/diagnostic */}
      {(stepTrack === 'quick' || stepTrack === 'diagnostic') && (
        <div className="flex justify-start px-2 pb-2">
          <Button 
            variant="link" 
            className="text-muted-foreground hover:text-primary px-0 h-auto font-normal text-sm"
            onClick={() => {
              setStepTrack('normal')
              navigateToStep(2)
            }}
          >
            다른 분석 방법 선택하기
          </Button>
        </div>
      )}

      {/* Analysis Options — Axiom Slate: tonal bg, no border */}
      <div className="rounded-2xl bg-surface-container-low px-2 py-1">
        <CollapsibleSection
          label={t.selectorUI.labels.analysisOptions}
          open={optionsOpen}
          onOpenChange={setOptionsOpen}
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          data-testid="analysis-options-section"
        >
          <AnalysisOptionsSection
            showTestValue={selectorType === 'one-sample'}
            className="px-3 py-3"
          />
        </CollapsibleSection>
      </div>
    </div>
  )
}
