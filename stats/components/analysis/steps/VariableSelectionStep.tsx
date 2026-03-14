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
import { AlertCircle, Settings2, Sparkles, Upload } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { AutoConfirmSelector, ChiSquareSelector } from '@/components/common/variable-selectors'
import { UnifiedVariableSelector } from '@/components/analysis/variable-selector/UnifiedVariableSelector'
import type { SelectorType } from '@/components/analysis/variable-selector/slot-configs'
import { getSelectorType } from '@/lib/registry'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { VariableMapping, ColumnInfo } from '@/lib/statistics/variable-mapping'
import { useTerminology } from '@/hooks/use-terminology'
import { CollapsibleSection } from '@/components/analysis/common'
import { AnalysisOptionsSection } from '@/components/analysis/variable-selector/AnalysisOptions'

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
    validationResults,
    setVariableMapping,
    goToNextStep,
    goToPreviousStep
  } = useAnalysisStore()

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

    setVariableMapping(mapping)

    if (onComplete) {
      onComplete()
    } else {
      goToNextStep()
    }
  }, [selectedMethod, columnInfo, setVariableMapping, onComplete, goToNextStep])

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      goToPreviousStep()
    }
  }, [onBack, goToPreviousStep])

  // Build initial selection from detectedVariables based on selector type
  const initialSelection = useMemo((): Partial<VariableMapping> => {
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
  }, [detectedVariables, selectorType])

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
        initialSelection={initialSelection}
        className="mt-4"
      />
    )
  }

  return (
    <div className="space-y-6" data-testid="variable-selection-step" data-method-id={selectedMethod?.id ?? ''} data-selector-type={selectorType}>
      {/* Method indicator — compact, no double header */}
      {selectedMethod && (
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge variant="outline" className="text-xs font-medium">
            {selectedMethod.name}
          </Badge>
        </div>
      )}

      {/* Validation Alert (from variable mapping validation) */}
      {validationAlert && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationAlert}</AlertDescription>
        </Alert>
      )}

      {/* AI Detected Variables Info */}
      {detectedVariables && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/30">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm space-y-1.5">
            <span className="font-semibold tracking-tight text-foreground/90">{t.analysis.aiVariables.title}</span>
            <div className="flex flex-wrap gap-1.5">
              {detectedVariables.dependentCandidate && (
                <Badge variant="outline" className="text-[10px] bg-info-bg border-info-border text-info font-medium">
                  {t.analysis.aiVariables.roles.dependent} {detectedVariables.dependentCandidate}
                </Badge>
              )}
              {detectedVariables.groupVariable && (
                <Badge variant="outline" className="text-[10px] bg-success-bg border-success-border text-success font-medium">
                  {t.analysis.aiVariables.roles.group} {detectedVariables.groupVariable}
                </Badge>
              )}
              {detectedVariables.factors && detectedVariables.factors.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-success-bg border-success-border text-success font-medium">
                  {t.analysis.aiVariables.roles.factors} {detectedVariables.factors.join(', ')}
                </Badge>
              )}
              {detectedVariables.independentVars && detectedVariables.independentVars.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-highlight-bg border-highlight-border text-highlight font-medium">
                  {t.analysis.aiVariables.roles.independent} {detectedVariables.independentVars.join(', ')}
                </Badge>
              )}
              {detectedVariables.covariates && detectedVariables.covariates.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-muted border-border/50 font-medium">
                  {t.analysis.aiVariables.roles.covariate} {detectedVariables.covariates.join(', ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Selector */}
      {renderSelector()}

      {/* Analysis Options */}
      <CollapsibleSection
        label={t.selectorUI.labels.analysisOptions}
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
        data-testid="analysis-options-section"
      >
        <AnalysisOptionsSection
          showTestValue={selectorType === 'one-sample'}
          className="px-2 py-3"
        />
      </CollapsibleSection>
    </div>
  )
}
