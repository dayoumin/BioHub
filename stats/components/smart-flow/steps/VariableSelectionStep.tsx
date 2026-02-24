'use client'

/**
 * VariableSelectionStep - Dynamic Variable Selection by Method
 *
 * Renders different variable selector components based on the selected statistical method.
 * Uses detectedVariables from Step 2 as initial selection.
 */

import React, { useMemo, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
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

type SelectorType = 'one-sample' | 'two-way-anova' | 'correlation' | 'paired' | 'multiple-regression' | 'group-comparison' | 'default'

const SELECTOR_MAP: ReadonlyMap<string, SelectorType> = new Map([
  // One-sample
  ['one-sample-t',              'one-sample'],
  ['one-sample-t-test',         'one-sample'],
  // Two-way ANOVA
  ['two-way-anova',             'two-way-anova'],
  ['three-way-anova',           'two-way-anova'],
  // Correlation
  ['pearson-correlation',       'correlation'],
  ['spearman-correlation',      'correlation'],
  ['kendall-correlation',       'correlation'],
  ['correlation',               'correlation'],
  // Paired
  ['paired-t',                  'paired'],
  ['paired-t-test',             'paired'],
  ['wilcoxon',                  'paired'],
  ['wilcoxon-signed-rank',      'paired'],
  ['sign-test',                 'paired'],
  ['mcnemar',                   'paired'],
  // Multiple regression
  ['multiple-regression',       'multiple-regression'],
  ['stepwise',                  'multiple-regression'],
  ['stepwise-regression',       'multiple-regression'],
  // Group comparison
  ['t-test',                    'group-comparison'],
  ['two-sample-t',              'group-comparison'],
  ['independent-t-test',        'group-comparison'],
  ['welch-t',                   'group-comparison'],
  ['one-way-anova',             'group-comparison'],
  ['anova',                     'group-comparison'],
  ['ancova',                    'group-comparison'],
  ['mann-whitney',              'group-comparison'],
  ['kruskal-wallis',            'group-comparison'],
])

function getSelectorType(methodId: string | undefined): SelectorType {
  if (!methodId) return 'default'
  return SELECTOR_MAP.get(methodId) ?? 'default'
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
        logger.warn('[VariableSelection] Validation errors', { errors: validation.errors })
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
            <span className="font-semibold tracking-tight text-foreground/90">{t.smartFlow.aiVariables.title}</span>
            <div className="flex flex-wrap gap-1.5">
              {detectedVariables.dependentCandidate && (
                <Badge variant="outline" className="text-[10px] bg-info-bg border-info-border text-info font-medium">
                  {t.smartFlow.aiVariables.roles.dependent} {detectedVariables.dependentCandidate}
                </Badge>
              )}
              {detectedVariables.groupVariable && (
                <Badge variant="outline" className="text-[10px] bg-success-bg border-success-border text-success font-medium">
                  {t.smartFlow.aiVariables.roles.group} {detectedVariables.groupVariable}
                </Badge>
              )}
              {detectedVariables.factors && detectedVariables.factors.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-success-bg border-success-border text-success font-medium">
                  {t.smartFlow.aiVariables.roles.factors} {detectedVariables.factors.join(', ')}
                </Badge>
              )}
              {detectedVariables.independentVars && detectedVariables.independentVars.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-highlight-bg border-highlight-border text-highlight font-medium">
                  {t.smartFlow.aiVariables.roles.independent} {detectedVariables.independentVars.join(', ')}
                </Badge>
              )}
              {detectedVariables.covariates && detectedVariables.covariates.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-muted border-border/50 font-medium">
                  {t.smartFlow.aiVariables.roles.covariate} {detectedVariables.covariates.join(', ')}
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
