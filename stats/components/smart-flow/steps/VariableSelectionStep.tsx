'use client'

/**
 * VariableSelectionStep - Dynamic Variable Selection by Method
 *
 * Renders different variable selector components based on the selected statistical method.
 * Uses detectedVariables from Step 2 as initial selection.
 */

import React, { useMemo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Settings2, Sparkles, Upload } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { VariableSelectorToggle } from '@/components/common/VariableSelectorToggle'
import {
  TwoWayAnovaSelector,
  CorrelationSelector,
  GroupComparisonSelector,
  MultipleRegressionSelector,
  PairedSelector,
  OneSampleSelector
} from '@/components/common/variable-selectors'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { StepHeader } from '@/components/smart-flow/common'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { useTerminology } from '@/hooks/use-terminology'

interface VariableSelectionStepProps {
  onComplete?: () => void
  onBack?: () => void
}

/**
 * Get selector type based on method ID
 */
function getSelectorType(methodId: string | undefined): string {
  if (!methodId) return 'default'

  // One-sample t-test
  if (methodId === 'one-sample-t' || methodId === 'one-sample-t-test') {
    return 'one-sample'
  }

  // Two-way ANOVA
  if (methodId === 'two-way-anova' || methodId === 'three-way-anova') {
    return 'two-way-anova'
  }

  // Correlation analysis
  if (
    methodId === 'pearson-correlation' ||
    methodId === 'spearman-correlation' ||
    methodId === 'kendall-correlation' ||
    methodId === 'correlation'
  ) {
    return 'correlation'
  }

  // Paired tests (includes 'paired-t-test' from recommender)
  if (
    methodId === 'paired-t' ||
    methodId === 'paired-t-test' ||
    methodId === 'wilcoxon' ||
    methodId === 'wilcoxon-signed-rank' ||
    methodId === 'sign-test' ||
    methodId === 'mcnemar'
  ) {
    return 'paired'
  }

  // Multiple regression
  if (
    methodId === 'multiple-regression' ||
    methodId === 'stepwise' ||
    methodId === 'stepwise-regression'
  ) {
    return 'multiple-regression'
  }

  // Group comparison (t-test, one-way ANOVA, ANCOVA, nonparametric)
  if (
    methodId === 't-test' ||
    methodId === 'two-sample-t' ||
    methodId === 'independent-t-test' ||
    methodId === 'welch-t' ||
    methodId === 'one-way-anova' ||
    methodId === 'anova' ||
    methodId === 'ancova' ||
    methodId === 'mann-whitney' ||
    methodId === 'kruskal-wallis'
  ) {
    return 'group-comparison'
  }

  // Default: simple regression / basic selector
  return 'default'
}

export function VariableSelectionStep({ onComplete, onBack }: VariableSelectionStepProps) {
  // Terminology System
  const t = useTerminology()

  const {
    uploadedData,
    selectedMethod,
    detectedVariables,
    validationResults,
    setVariableMapping,
    goToNextStep,
    goToPreviousStep
  } = useSmartFlowStore()

  // Determine selector type
  const selectorType = useMemo(() => {
    return getSelectorType(selectedMethod?.id)
  }, [selectedMethod?.id])

  // Get column info for validation
  const columnInfo = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.map(col => ({
      name: col.name,
      type: col.type as 'numeric' | 'categorical' | 'date' | 'text',
      uniqueValues: col.uniqueValues
    }))
  }, [validationResults])

  // Handle variable selection complete with validation
  const handleComplete = useCallback((mapping: VariableMapping) => {
    // Validate mapping
    if (selectedMethod && columnInfo.length > 0) {
      const validation = validateVariableMapping(selectedMethod, mapping, columnInfo)
      if (!validation.isValid) {
        console.warn('[VariableSelection] Validation errors:', validation.errors)
        // Still proceed but log warnings
      }
    }

    setVariableMapping(mapping)

    if (onComplete) {
      onComplete()
    } else {
      goToNextStep()
    }
  }, [selectedMethod, columnInfo, setVariableMapping, onComplete, goToNextStep])

  // Legacy handler for VariableSelectorToggle
  const handleLegacyComplete = useCallback((selection: { dependent: string | null; independent: string | null }) => {
    handleComplete({
      dependentVar: selection.dependent || undefined,
      independentVar: selection.independent || undefined
    })
  }, [handleComplete])

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
        // Covariate for ANCOVA
        if (detectedVariables.covariates?.length) {
          result.covariate = detectedVariables.covariates
        }
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
        // LLM enhanced: use independentVars directly
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
        // Covariate for ANCOVA-style group comparison
        if (detectedVariables.covariates?.length) {
          result.covariate = detectedVariables.covariates
        }
        break

      default:
        result.dependentVar = detectedVariables.dependentCandidate
        // LLM enhanced: use independentVars if available
        if (detectedVariables.independentVars?.length) {
          result.independentVar = detectedVariables.independentVars[0]
        } else if (detectedVariables.numericVars && detectedVariables.numericVars.length > 1) {
          result.independentVar = detectedVariables.numericVars.find(
            v => v !== detectedVariables.dependentCandidate
          )
        }
        // Covariate
        if (detectedVariables.covariates?.length) {
          result.covariate = detectedVariables.covariates
        }
        break
    }

    return result
  }, [detectedVariables, selectorType])

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      goToPreviousStep()
    }
  }, [onBack, goToPreviousStep])

  // No data check
  if (!uploadedData || uploadedData.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title={t.smartFlow.emptyStates.dataRequired}
        description={t.smartFlow.emptyStates.dataRequiredDescription}
      />
    )
  }

  // Render appropriate selector based on method
  const renderSelector = () => {
    const commonProps = {
      data: uploadedData,
      onBack: handleBack,
      initialSelection,
      className: 'mt-4'
    }

    switch (selectorType) {
      case 'one-sample':
        return (
          <OneSampleSelector
            {...commonProps}
            onComplete={handleComplete}
          />
        )

      case 'two-way-anova':
        return (
          <TwoWayAnovaSelector
            {...commonProps}
            onComplete={handleComplete}
          />
        )

      case 'correlation':
        return (
          <CorrelationSelector
            {...commonProps}
            onComplete={handleComplete}
            minVariables={2}
            maxVariables={10}
          />
        )

      case 'paired':
        return (
          <PairedSelector
            {...commonProps}
            onComplete={handleComplete}
          />
        )

      case 'multiple-regression':
        return (
          <MultipleRegressionSelector
            {...commonProps}
            onComplete={handleComplete}
            minIndependent={2}
            maxIndependent={10}
          />
        )

      case 'group-comparison':
        return (
          <GroupComparisonSelector
            {...commonProps}
            onComplete={handleComplete}
            requireTwoGroups={
              selectedMethod?.id === 't-test' ||
              selectedMethod?.id === 'two-sample-t' ||
              selectedMethod?.id === 'independent-t-test' ||
              selectedMethod?.id === 'mann-whitney'
            }
            methodName={selectedMethod?.name}
          />
        )

      default:
        // Default: simple dependent/independent selector
        return (
          <VariableSelectorToggle
            data={uploadedData}
            onComplete={handleLegacyComplete}
            onBack={handleBack}
            title={t.smartFlow.stepTitles.variableSelection}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <StepHeader
          icon={Settings2}
          title={t.smartFlow.stepTitles.variableSelection}
          badge={selectedMethod ? { label: selectedMethod.name } : undefined}
        />

      {/* AI Detected Variables Info */}
      {detectedVariables && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/30">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm space-y-1.5">
            <span className="font-semibold tracking-tight text-foreground/90">AI 추천 변수</span>
            <div className="flex flex-wrap gap-1.5">
              {detectedVariables.dependentCandidate && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 font-medium">
                  종속: {detectedVariables.dependentCandidate}
                </Badge>
              )}
              {detectedVariables.groupVariable && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 font-medium">
                  집단: {detectedVariables.groupVariable}
                </Badge>
              )}
              {detectedVariables.factors && detectedVariables.factors.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 font-medium">
                  요인: {detectedVariables.factors.join(', ')}
                </Badge>
              )}
              {detectedVariables.independentVars && detectedVariables.independentVars.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 font-medium">
                  독립: {detectedVariables.independentVars.join(', ')}
                </Badge>
              )}
              {detectedVariables.covariates && detectedVariables.covariates.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-muted border-border/50 font-medium">
                  공변량: {detectedVariables.covariates.join(', ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Selector */}
      {renderSelector()}
    </div>
  )
}
