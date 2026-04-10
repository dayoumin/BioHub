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
import { AutoConfirmSelector } from '@/components/common/variable-selectors'
import { UnifiedVariableSelector } from '@/components/analysis/variable-selector/UnifiedVariableSelector'
import type { SelectorType } from '@/components/analysis/variable-selector/slot-configs'
import { getSlotConfigs } from '@/components/analysis/variable-selector/slot-configs'
import { getSelectorType } from '@/lib/registry'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { VariableMapping, ColumnInfo } from '@/lib/statistics/variable-mapping'
import { buildAnalysisExecutionContext } from '@/lib/utils/analysis-execution'
import { startPreemptiveAssumptions } from '@/lib/services'
import { useTerminology } from '@/hooks/use-terminology'
import { CollapsibleSection, StepHeader } from '@/components/analysis/common'
import { AnalysisOptionsSection } from '@/components/analysis/variable-selector/AnalysisOptions'
import { prepareManualMethodBrowsing } from '@/lib/stores/store-orchestration'

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

function countAssignedValues(value: VariableMapping[keyof VariableMapping]) {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean).length
  }
  return 0
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
    analysisOptions,
    suggestedSettings,
    setVariableMapping,
    updateVariableMappingWithInvalidation,
    goToNextStep,
    goToPreviousStep,
    navigateToStep
  } = useAnalysisStore()

  const stepTrack = useModeStore(state => state.stepTrack)
  const backLabel = (stepTrack === 'quick' || stepTrack === 'diagnostic') ? '데이터로 돌아가기' : t.analysis.layout.prevStep

  const [validationAlert, setValidationAlert] = useState<string | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const methodRequirements = useMemo(
    () => (selectedMethod?.id ? getMethodRequirements(selectedMethod.id) : undefined),
    [selectedMethod?.id]
  )

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
      const mappingForValidation = (
        selectedMethod.id === 'proportion-test' || selectedMethod.id === 'one-sample-proportion'
      )
        ? {
            ...mapping,
            nullProportion: String(analysisOptions.nullProportion ?? 0.5),
          }
        : mapping

      const validation = validateVariableMapping(selectedMethod, mappingForValidation, columnInfo)
      if (!validation.isValid) {
        logger.warn('[VariableSelection] Validation errors', { errors: validation.errors })
        setValidationAlert(validation.errors.join(' / '))
        return
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
  }, [selectedMethod, columnInfo, existingMapping, uploadedData, analysisOptions.nullProportion, setVariableMapping, updateVariableMappingWithInvalidation, onComplete, goToNextStep])

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

  const previewVariableMapping = useMemo(
    () => (existingMapping ?? initialSelection) as VariableMapping,
    [existingMapping, initialSelection]
  )

  const { executionSettingEntries } = useMemo(() => buildAnalysisExecutionContext({
    analysisOptions,
    methodRequirements,
    selectedMethodId: selectedMethod?.id,
    suggestedSettings,
    variableMapping: previewVariableMapping,
  }), [
    analysisOptions,
    methodRequirements,
    selectedMethod?.id,
    suggestedSettings,
    previewVariableMapping,
  ])

  const previewVariableCount = useMemo(() => {
    return Object.values(previewVariableMapping ?? {}).reduce((sum, value) => {
      return sum + countAssignedValues(value)
    }, 0)
  }, [previewVariableMapping])

  const previewMissingRequirements = useMemo(() => {
    if (selectorType === 'auto') return []

    return getSlotConfigs(selectorType).flatMap(slot => {
      if (!slot.required) return []

      const assignedCount = countAssignedValues(previewVariableMapping[slot.mappingKey])
      if (assignedCount === 0) {
        return [{
          key: slot.id,
          label: slot.label,
          detail: `${slot.label}을(를) 선택해야 합니다`,
        }]
      }

      if (slot.multiple && slot.minCount !== undefined && assignedCount < slot.minCount) {
        return [{
          key: slot.id,
          label: slot.label,
          detail: `${slot.label} ${slot.minCount}개 필요, 현재 ${assignedCount}개`,
        }]
      }

      return []
    })
  }, [selectorType, previewVariableMapping])

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

  const mismatchHint = useMemo(() => {
    if (!selectedMethod || selectorType !== 'group-comparison' || !detectedVariables) return undefined

    const isIndependentComparisonMethod = ['t-test', 'two-sample-t', 'welch-t', 'mann-whitney'].includes(selectedMethod.id)
    if (!isIndependentComparisonMethod) return undefined

    if (detectedVariables.pairedVars?.length === 2 && !detectedVariables.groupVariable) {
      return {
        title: '현재 데이터는 대응 비교 구조에 더 가깝습니다',
        message: `선택된 데이터는 ${detectedVariables.pairedVars.join(', ')}처럼 같은 대상의 전후 측정값으로 보입니다. 독립 집단 비교보다 대응표본 t-검정을 먼저 검토하는 편이 안전합니다.`,
        actionLabel: '대응표본 t-검정 또는 Wilcoxon 검정을 검토해보세요.',
        actionCtaLabel: '분석 방법 다시 선택',
      }
    }

    return undefined
  }, [selectedMethod, selectorType, detectedVariables])

  const handleMethodChange = useCallback(() => {
    prepareManualMethodBrowsing()
    navigateToStep(2)
  }, [navigateToStep])

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
          methodRequirements={methodRequirements}
          methodName={selectedMethod?.name}
          className="mt-4"
          onComplete={handleComplete}
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
        methodId={selectedMethod?.id}
        methodName={selectedMethod?.name}
        mismatchHint={mismatchHint}
        onFitAction={mismatchHint ? handleMethodChange : undefined}
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
        <Alert variant="destructive" className="border-error-border/70 bg-error-bg/80 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationAlert}</AlertDescription>
        </Alert>
      )}

      {/* AI Detected Variables Info — Axiom Slate: tonal surface shift, no border */}
      {detectedVariables && (
        <div className="flex items-start gap-4 rounded-2xl border border-border/50 bg-surface-container-lowest p-5 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
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

      {!detectedVariables && !existingMapping && (
        <Alert className="border-border/50 bg-surface-container-lowest shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
          <Info className="h-4 w-4" />
          <AlertDescription>
            자동 변수 감지에 실패했습니다. 아래 슬롯에서 분석에 필요한 변수를 직접 선택해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* F1: Method Variable Guide — 필수 슬롯이 프리필되지 않았을 때 표시 */}
      {needsVariableGuide && (
        <div className="flex items-start gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
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
            onClick={handleMethodChange}
          >
            다른 분석 방법 선택하기
          </Button>
        </div>
      )}

      {/* Analysis Options — Axiom Slate: tonal bg, no border */}
      <div className="rounded-2xl border border-border/50 bg-surface-container-lowest px-2 py-1 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
        <CollapsibleSection
          label={t.selectorUI.labels.analysisOptions}
          open={optionsOpen}
          onOpenChange={setOptionsOpen}
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          data-testid="analysis-options-section"
        >
          <AnalysisOptionsSection
            methodRequirements={methodRequirements}
            className="px-3 py-3"
          />
        </CollapsibleSection>
      </div>

      {selectedMethod && executionSettingEntries.length > 0 && (
        <div
          className="rounded-2xl border border-border/50 bg-surface-container-lowest px-5 py-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]"
          data-testid="analysis-execution-preview"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Step 3
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">다음 단계에서 적용될 실행 설정</p>
              <p className="mt-1 text-sm text-muted-foreground">
                현재 변수 선택과 분석 옵션 기준으로 Step 4에서 아래 설정이 그대로 사용됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="rounded-lg border border-border/50 bg-muted/25 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                변수 {previewVariableCount}개
              </div>
              {executionSettingEntries.map(entry => (
                <div
                  key={entry.key}
                  className="rounded-lg border border-border/50 bg-muted/25 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  data-testid={`execution-preview-setting-${entry.key}`}
                >
                  {entry.label === entry.value ? entry.label : `${entry.label} ${entry.value}`}
                </div>
              ))}
            </div>
          </div>
          {previewMissingRequirements.length > 0 && (
            <div
              className="mt-4 rounded-xl border border-warning-border/60 bg-warning-bg/70 px-4 py-3"
              data-testid="execution-preview-missing"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">
                실행 전 필요한 항목
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {previewMissingRequirements.map(item => (
                  <div
                    key={item.key}
                    className="rounded-lg border border-warning-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground"
                    data-testid={`execution-preview-missing-${item.key}`}
                  >
                    {item.detail}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
