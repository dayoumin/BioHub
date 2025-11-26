'use client'

/**
 * VariableSelectionStep - Dynamic Variable Selection by Method
 *
 * Renders different variable selector components based on the selected statistical method.
 * Uses detectedVariables from Step 2 as initial selection.
 */

import React, { useMemo, useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Settings2 } from 'lucide-react'
import { VariableSelectorToggle } from '@/components/common/VariableSelectorToggle'
import {
  TwoWayAnovaSelector,
  CorrelationSelector,
  GroupComparisonSelector,
  MultipleRegressionSelector,
  PairedSelector
} from '@/components/common/variable-selectors'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

interface VariableSelectionStepProps {
  onComplete?: () => void
  onBack?: () => void
}

/**
 * Get selector type based on method ID
 */
function getSelectorType(methodId: string | undefined): string {
  if (!methodId) return 'default'

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

  // Group comparison (t-test, one-way ANOVA, nonparametric)
  if (
    methodId === 't-test' ||
    methodId === 'two-sample-t' ||
    methodId === 'independent-t-test' ||
    methodId === 'welch-t' ||
    methodId === 'one-way-anova' ||
    methodId === 'anova' ||
    methodId === 'mann-whitney' ||
    methodId === 'kruskal-wallis'
  ) {
    return 'group-comparison'
  }

  // Default: simple regression / basic selector
  return 'default'
}

export function VariableSelectionStep({ onComplete, onBack }: VariableSelectionStepProps) {
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
      case 'two-way-anova':
        // TwoWayAnovaSelector expects groupVar as "factor1,factor2"
        if (detectedVariables.factors && detectedVariables.factors.length >= 2) {
          result.groupVar = detectedVariables.factors.slice(0, 2).join(',')
        }
        result.dependentVar = detectedVariables.dependentCandidate
        break

      case 'correlation':
        // CorrelationSelector expects variables array
        result.variables = detectedVariables.numericVars
        break

      case 'paired':
        // PairedSelector expects variables as [var1, var2]
        if (detectedVariables.pairedVars) {
          result.variables = detectedVariables.pairedVars
        } else if (detectedVariables.numericVars && detectedVariables.numericVars.length >= 2) {
          result.variables = detectedVariables.numericVars.slice(0, 2)
        }
        break

      case 'multiple-regression':
        // MultipleRegressionSelector expects dependentVar + independentVar (array)
        result.dependentVar = detectedVariables.dependentCandidate
        if (detectedVariables.numericVars && detectedVariables.numericVars.length > 1) {
          // Exclude dependent from independents
          const independents = detectedVariables.numericVars.filter(
            v => v !== detectedVariables.dependentCandidate
          )
          result.independentVar = independents.join(',')
        }
        break

      case 'group-comparison':
        // GroupComparisonSelector expects groupVar + dependentVar
        result.groupVar = detectedVariables.groupVariable
        result.dependentVar = detectedVariables.dependentCandidate
        break

      default:
        // Default selector: dependentVar + independentVar
        result.dependentVar = detectedVariables.dependentCandidate
        if (detectedVariables.numericVars && detectedVariables.numericVars.length > 1) {
          result.independentVar = detectedVariables.numericVars.find(
            v => v !== detectedVariables.dependentCandidate
          )
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
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please upload data first.
        </AlertDescription>
      </Alert>
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
      case 'two-way-anova':
        return (
          <TwoWayAnovaSelector
            {...commonProps}
            onComplete={handleComplete}
            title="Two-way ANOVA Variable Selection"
            description="Select 2 categorical factors and 1 numeric dependent variable"
          />
        )

      case 'correlation':
        return (
          <CorrelationSelector
            {...commonProps}
            onComplete={handleComplete}
            title="Correlation Variable Selection"
            description="Select 2 or more numeric variables for correlation analysis"
            minVariables={2}
            maxVariables={10}
          />
        )

      case 'paired':
        return (
          <PairedSelector
            {...commonProps}
            onComplete={handleComplete}
            title="Paired Samples Selection"
            description="Select two related measurements to compare"
            labels={{
              first: 'Time 1 / Before',
              second: 'Time 2 / After'
            }}
          />
        )

      case 'multiple-regression':
        return (
          <MultipleRegressionSelector
            {...commonProps}
            onComplete={handleComplete}
            title="Multiple Regression Variables"
            description="Select dependent (Y) and multiple independent (X) variables"
            minIndependent={2}
            maxIndependent={10}
          />
        )

      case 'group-comparison':
        return (
          <GroupComparisonSelector
            {...commonProps}
            onComplete={handleComplete}
            title="Group Comparison Variables"
            description="Select a group variable and a dependent variable"
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
            title="Variable Selection"
            description="Select dependent and independent variables for analysis"
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-primary" />
        <div className="text-xl font-semibold">Variable Selection</div>
        {selectedMethod && (
          <Badge variant="secondary" className="ml-auto">
            {selectedMethod.name}
          </Badge>
        )}
      </div>

      {/* AI Detected Variables Info */}
      {detectedVariables && (
        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <AlertDescription className="text-sm">
            <span className="font-medium">AI suggested variables: </span>
            {detectedVariables.factors && (
              <span>Factors: {detectedVariables.factors.join(', ')} </span>
            )}
            {detectedVariables.groupVariable && (
              <span>Group: {detectedVariables.groupVariable} </span>
            )}
            {detectedVariables.dependentCandidate && (
              <span>Dependent: {detectedVariables.dependentCandidate}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Dynamic Selector */}
      {renderSelector()}
    </div>
  )
}
