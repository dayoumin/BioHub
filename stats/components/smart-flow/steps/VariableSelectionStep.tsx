'use client'

/**
 * VariableSelectionStep - Dynamic Variable Selection by Method
 *
 * Renders different variable selector components based on the selected statistical method.
 * Uses detectedVariables from Step 2 as initial selection.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Settings2, Sparkles, Upload } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { VariableSelectorToggle } from '@/components/common/VariableSelectorToggle'
import {
  TwoWayAnovaSelector,
  CorrelationSelector,
  GroupComparisonSelector,
  MultipleRegressionSelector,
  PairedSelector,
  OneSampleSelector,
  ChiSquareSelector,
  AutoConfirmSelector
} from '@/components/common/variable-selectors'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { useTerminology } from '@/hooks/use-terminology'

interface VariableSelectionStepProps {
  onComplete?: () => void
  onBack?: () => void
}

type SelectorType =
  | 'one-sample'
  | 'two-way-anova'
  | 'correlation'
  | 'paired'
  | 'multiple-regression'
  | 'group-comparison'
  | 'chi-square'
  | 'auto'
  | 'default'

/**
 * Maps real statistical method IDs (from statistical-methods.ts) to selector types.
 * Only real IDs are listed — dead aliases are intentionally excluded.
 */
const SELECTOR_MAP: ReadonlyMap<string, SelectorType> = new Map([
  // One-sample tests
  ['one-sample-t',            'one-sample'],
  ['binomial-test',           'one-sample'],
  ['runs-test',               'one-sample'],
  ['mann-kendall',            'one-sample'],
  // Paired / within-subjects
  ['paired-t',                'paired'],
  ['wilcoxon',                'paired'],
  ['sign-test',               'paired'],
  ['cochran-q',               'paired'],
  // Group comparison
  ['t-test',                  'group-comparison'],
  ['welch-t',                 'group-comparison'],
  ['welch-anova',             'group-comparison'],
  ['anova',                   'group-comparison'],   // may upgrade to 'two-way-anova' below
  ['ancova',                  'group-comparison'],
  ['mann-whitney',            'group-comparison'],
  ['kruskal-wallis',          'group-comparison'],
  ['ks-test',                 'group-comparison'],
  ['mood-median',             'group-comparison'],
  ['non-parametric',          'group-comparison'],
  ['means-plot',              'group-comparison'],
  // Correlation / multivariate numeric
  ['correlation',             'correlation'],
  ['partial-correlation',     'correlation'],
  ['normality-test',          'one-sample'],
  ['friedman',                'correlation'],
  ['descriptive',             'correlation'],
  ['explore-data',            'correlation'],
  ['pca',                     'correlation'],
  ['factor-analysis',         'correlation'],
  ['cluster',                 'correlation'],
  ['reliability',             'correlation'],
  // Multiple regression
  ['regression',              'multiple-regression'],
  ['logistic-regression',     'multiple-regression'],
  ['poisson',                 'multiple-regression'],
  ['ordinal-regression',      'multiple-regression'],
  ['dose-response',           'multiple-regression'],
  ['response-surface',        'multiple-regression'],
  ['stepwise',                'multiple-regression'],
  // Chi-square / categorical
  ['chi-square',              'chi-square'],
  ['chi-square-goodness',     'chi-square'],
  ['chi-square-independence', 'chi-square'],
  ['mcnemar',                 'chi-square'],
  ['proportion-test',         'chi-square'],
  // Auto-confirm (complex methods without custom variable UI)
  ['repeated-measures-anova', 'auto'],
  ['manova',                  'auto'],
  ['mixed-model',             'auto'],
  ['arima',                   'auto'],
  ['seasonal-decompose',      'auto'],
  ['stationarity-test',       'auto'],
  ['kaplan-meier',            'auto'],
  ['cox-regression',          'auto'],
  ['discriminant',            'auto'],
  ['power-analysis',          'auto'],
])

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
  } = useSmartFlowStore()

  const [validationAlert, setValidationAlert] = useState<string | null>(null)

  // Determine selector type
  // Special case: anova + AI detected 2+ factors → two-way-anova
  const selectorType = useMemo((): SelectorType => {
    const id = selectedMethod?.id ?? ''
    const base = SELECTOR_MAP.get(id) ?? 'default'
    if (
      id === 'anova' &&
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
      type: col.type as 'numeric' | 'categorical' | 'date' | 'text',
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

  // Legacy handler for VariableSelectorToggle
  const handleLegacyComplete = useCallback((selection: { dependent: string | null; independent: string | null }) => {
    handleComplete({
      dependentVar: selection.dependent || undefined,
      independentVar: selection.independent || undefined
    })
  }, [handleComplete])

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
            minIndependent={1}
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
              selectedMethod?.id === 'welch-t' ||
              selectedMethod?.id === 'mann-whitney'
            }
            methodName={selectedMethod?.name}
            showCovariate={selectedMethod?.id === 'ancova'}
          />
        )

      case 'chi-square':
        return (
          <ChiSquareSelector
            {...commonProps}
            onComplete={handleComplete}
            methodId={selectedMethod?.id}
          />
        )

      case 'auto':
        return (
          <AutoConfirmSelector
            {...commonProps}
            onComplete={handleComplete}
          />
        )

      default:
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
