'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calculator,
  ArrowRightLeft,
  Info,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Zap
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

type InputType = 't' | 'f' | 'chi-square' | 'r' | 'd' | 'odds-ratio' | 'means'

interface ConversionResult {
  cohensD?: number | null
  hedgesG?: number | null
  r?: number | null
  rSquared?: number | null
  etaSquared?: number | null
  omegaSquared?: number | null
  cohensF?: number | null
  cohensW?: number | null
  phi?: number | null
  cramersV?: number | null
  oddsRatio?: number | null
  logOddsRatio?: number | null
  fishersZ?: number | null
  seZ?: number | null
  seD?: number | null
  dCiLower?: number | null
  dCiUpper?: number | null
  meanDiff?: number | null
  pooledStd?: number | null
  dInterpretation?: string
  rInterpretation?: string
  etaInterpretation?: string
  wInterpretation?: string
  orInterpretation?: string
  inputType?: string
  formula?: string
  interpretationGuide?: {
    cohensD: { small: number; medium: number; large: number }
    r: { small: number; medium: number; large: number }
    etaSquared: { small: number; medium: number; large: number }
    oddsRatio: { small: number; medium: number; large: number }
  }
}

const INPUT_TYPE_INFO: Record<InputType, {
  label: string
  description: string
  fields: Array<{ key: string; label: string; placeholder: string; required: boolean }>
}> = {
  't': {
    label: 't-statistic',
    description: 't-test result from statistics',
    fields: [
      { key: 'value', label: 't value', placeholder: '2.45', required: true },
      { key: 'df', label: 'df (degrees of freedom)', placeholder: '28', required: true },
      { key: 'n1', label: 'N1 (group 1, optional)', placeholder: '15', required: false },
      { key: 'n2', label: 'N2 (group 2, optional)', placeholder: '15', required: false },
    ]
  },
  'f': {
    label: 'F-statistic',
    description: 'ANOVA F-test result',
    fields: [
      { key: 'value', label: 'F value', placeholder: '4.52', required: true },
      { key: 'dfBetween', label: 'df between', placeholder: '2', required: true },
      { key: 'dfWithin', label: 'df within', placeholder: '57', required: true },
    ]
  },
  'chi-square': {
    label: 'Chi-square',
    description: 'Chi-square test statistic',
    fields: [
      { key: 'value', label: 'Chi-square value', placeholder: '10.5', required: true },
      { key: 'n', label: 'N (total sample)', placeholder: '100', required: true },
      { key: 'df', label: 'min(r-1, c-1) (optional if rows/cols provided)', placeholder: '1', required: false },
      { key: 'rows', label: 'Rows (optional)', placeholder: '2', required: false },
      { key: 'cols', label: 'Columns (optional)', placeholder: '2', required: false },
    ]
  },
  'r': {
    label: 'Correlation (r)',
    description: 'Pearson correlation coefficient',
    fields: [
      { key: 'value', label: 'r value', placeholder: '0.35', required: true },
      { key: 'n', label: 'N (optional, for SE)', placeholder: '50', required: false },
    ]
  },
  'd': {
    label: "Cohen's d",
    description: 'Standardized mean difference',
    fields: [
      { key: 'value', label: 'd value', placeholder: '0.5', required: true },
      { key: 'n1', label: 'N1 (optional)', placeholder: '30', required: false },
      { key: 'n2', label: 'N2 (optional)', placeholder: '30', required: false },
    ]
  },
  'odds-ratio': {
    label: 'Odds Ratio',
    description: 'Odds ratio from 2x2 table',
    fields: [
      { key: 'value', label: 'Odds Ratio', placeholder: '2.5', required: true },
      { key: 'ciLower', label: '95% CI Lower (optional)', placeholder: '1.2', required: false },
      { key: 'ciUpper', label: '95% CI Upper (optional)', placeholder: '5.2', required: false },
    ]
  },
  'means': {
    label: 'Two Group Means',
    description: 'Calculate d from means and SDs',
    fields: [
      { key: 'value', label: 'Mean 1', placeholder: '105', required: true },
      { key: 'std1', label: 'SD 1', placeholder: '15', required: true },
      { key: 'n1', label: 'N1', placeholder: '30', required: true },
      { key: 'mean2', label: 'Mean 2', placeholder: '100', required: true },
      { key: 'std2', label: 'SD 2', placeholder: '15', required: true },
      { key: 'n2', label: 'N2', placeholder: '30', required: true },
    ]
  }
}

const INTERPRETATION_COLORS: Record<string, string> = {
  'negligible': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'small': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'large': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function EffectSizeConverterPage() {
  const [inputType, setInputType] = useState<InputType>('t')
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getValidationError = useCallback((): string | null => {
    const getNum = (key: string): number | null => {
      const raw = inputValues[key]
      if (raw === undefined) return null
      const trimmed = raw.trim()
      if (!trimmed) return null
      const num = Number(trimmed)
      return Number.isFinite(num) ? num : null
    }

    const getInt = (key: string): number | null => {
      const num = getNum(key)
      if (num === null) return null
      return Number.isInteger(num) ? num : null
    }

    const value = getNum('value')
    if (value === null) return 'Enter a valid numeric value.'

    if (inputType === 't') {
      const df = getInt('df')
      if (df === null || df <= 0) return 'df must be a positive integer.'
      const n1 = getInt('n1')
      const n2 = getInt('n2')
      if (n1 !== null && n1 <= 0) return 'N1 must be positive.'
      if (n2 !== null && n2 <= 0) return 'N2 must be positive.'
    }

    if (inputType === 'f') {
      const dfBetween = getInt('dfBetween')
      const dfWithin = getInt('dfWithin')
      if (dfBetween === null || dfBetween <= 0) return 'df between must be a positive integer.'
      if (dfWithin === null || dfWithin <= 0) return 'df within must be a positive integer.'
      if (value < 0) return 'F value must be non-negative.'
    }

    if (inputType === 'chi-square') {
      const n = getInt('n')
      if (n === null || n <= 0) return 'N must be a positive integer.'
      if (value < 0) return 'Chi-square value must be non-negative.'

      const df = getInt('df')
      const rows = getInt('rows')
      const cols = getInt('cols')

      const hasRowsCols = rows !== null && cols !== null
      if (!hasRowsCols && (df === null || df <= 0)) {
        return 'Provide min(r-1, c-1) or both rows and columns.'
      }
      if (rows !== null && rows < 2) return 'Rows must be >= 2.'
      if (cols !== null && cols < 2) return 'Columns must be >= 2.'
      if (df !== null && df <= 0) return 'min(r-1, c-1) must be a positive integer.'
    }

    if (inputType === 'r') {
      if (Math.abs(value) >= 1) return 'r must be between -1 and 1 (exclusive).'
      const n = getInt('n')
      if (n !== null && n <= 0) return 'N must be positive.'
    }

    if (inputType === 'd') {
      const n1 = getInt('n1')
      const n2 = getInt('n2')
      if (n1 !== null && n1 <= 0) return 'N1 must be positive.'
      if (n2 !== null && n2 <= 0) return 'N2 must be positive.'
    }

    if (inputType === 'odds-ratio') {
      if (value <= 0) return 'Odds Ratio must be positive.'
      const ciLower = getNum('ciLower')
      const ciUpper = getNum('ciUpper')
      if (ciLower !== null && ciLower <= 0) return 'CI lower must be positive.'
      if (ciUpper !== null && ciUpper <= 0) return 'CI upper must be positive.'
      if (ciLower !== null && ciUpper !== null && ciLower > ciUpper) return 'CI lower must be <= CI upper.'
    }

    if (inputType === 'means') {
      const std1 = getNum('std1')
      const std2 = getNum('std2')
      const n1 = getInt('n1')
      const n2 = getInt('n2')
      const mean2 = getNum('mean2')

      if (std1 === null || std2 === null || mean2 === null) return 'Enter valid mean/SD values.'
      if (std1 < 0 || std2 < 0) return 'SD must be non-negative.'
      if (n1 === null || n1 < 2) return 'N1 must be >= 2.'
      if (n2 === null || n2 < 2) return 'N2 must be >= 2.'
    }

    return null
  }, [inputType, inputValues])

  const breadcrumbs = useMemo(() => [
    { label: 'Home', href: '/' },
    { label: 'Data Tools', href: '/data-tools' },
    { label: 'Effect Size Converter' }
  ], [])

  const steps = useMemo(() => [
    { id: 0, label: 'Select Input Type' },
    { id: 1, label: 'Enter Values' },
    { id: 2, label: 'View Results' }
  ], [])

  const currentStep = result ? 2 : (Object.keys(inputValues).length > 0 ? 1 : 0)

  const handleInputTypeChange = useCallback((type: InputType) => {
    setInputType(type)
    setInputValues({})
    setResult(null)
    setError(null)
  }, [])

  const handleInputChange = useCallback((key: string, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }))
    setError(null)
  }, [])

  const handleConvert = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const validationError = getValidationError()
      if (validationError) {
        setError(validationError)
        return
      }

      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // Build parameters based on input type
      const params: Record<string, string | number | boolean> = {
        inputType,
        value: parseFloat(inputValues.value || '0')
      }

      // Add type-specific parameters
      const INTEGER_KEYS = new Set([
        'n',
        'n1',
        'n2',
        'df',
        'dfBetween',
        'dfWithin',
        'rows',
        'cols'
      ])
      const typeInfo = INPUT_TYPE_INFO[inputType]
      for (const field of typeInfo.fields) {
        if (field.key !== 'value' && inputValues[field.key]) {
          const val = inputValues[field.key]
          // Parse as int for count/df-like fields, float for others
          if (INTEGER_KEYS.has(field.key)) {
            params[field.key] = parseInt(val, 10)
          } else {
            params[field.key] = parseFloat(val)
          }
        }
      }

      const conversionResult = await pyodideCore.callWorkerMethod<ConversionResult>(
        PyodideWorker.Descriptive,
        'convert_effect_sizes',
        params
      )

      setResult(conversionResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setIsLoading(false)
    }
  }, [getValidationError, inputType, inputValues])

  const handleReset = useCallback(() => {
    setInputValues({})
    setResult(null)
    setError(null)
  }, [])

  const isFormValid = useCallback(() => {
    const typeInfo = INPUT_TYPE_INFO[inputType]
    const hasRequired = typeInfo.fields
      .filter(f => f.required)
      .every(f => inputValues[f.key] && !isNaN(parseFloat(inputValues[f.key])))

    return hasRequired && getValidationError() === null
  }, [getValidationError, inputType, inputValues])

  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '-'
    return val.toFixed(4)
  }

  const renderResultsTable = () => {
    if (!result) return null

    interface ResultRow {
      metric: string
      value: string
      interpretation: string
    }

    const data: ResultRow[] = []

    if (result.cohensD !== null && result.cohensD !== undefined) {
      data.push({
        metric: "Cohen's d",
        value: formatValue(result.cohensD),
        interpretation: result.dInterpretation || '-'
      })
    }

    if (result.hedgesG !== null && result.hedgesG !== undefined) {
      data.push({
        metric: "Hedges' g",
        value: formatValue(result.hedgesG),
        interpretation: result.dInterpretation || '-'
      })
    }

    if (result.r !== null && result.r !== undefined) {
      data.push({
        metric: 'Correlation (r)',
        value: formatValue(result.r),
        interpretation: result.rInterpretation || '-'
      })
    }

    if (result.rSquared !== null && result.rSquared !== undefined) {
      data.push({
        metric: 'R-squared',
        value: formatValue(result.rSquared),
        interpretation: `${(result.rSquared * 100).toFixed(1)}% variance explained`
      })
    }

    if (result.etaSquared !== null && result.etaSquared !== undefined) {
      data.push({
        metric: 'Eta-squared',
        value: formatValue(result.etaSquared),
        interpretation: result.etaInterpretation || '-'
      })
    }

    if (result.omegaSquared !== null && result.omegaSquared !== undefined) {
      data.push({
        metric: 'Omega-squared',
        value: formatValue(result.omegaSquared),
        interpretation: 'Less biased than eta-squared'
      })
    }

    if (result.cohensF !== null && result.cohensF !== undefined) {
      data.push({
        metric: "Cohen's f",
        value: formatValue(result.cohensF),
        interpretation: '-'
      })
    }

    if (result.phi !== null && result.phi !== undefined) {
      data.push({
        metric: 'Phi',
        value: formatValue(result.phi),
        interpretation: result.wInterpretation || '-'
      })
    }

    if (result.cramersV !== null && result.cramersV !== undefined) {
      data.push({
        metric: "Cramer's V",
        value: formatValue(result.cramersV),
        interpretation: result.wInterpretation || '-'
      })
    }

    if (result.cohensW !== null && result.cohensW !== undefined) {
      data.push({
        metric: "Cohen's w",
        value: formatValue(result.cohensW),
        interpretation: result.wInterpretation || '-'
      })
    }

    if (result.oddsRatio !== null && result.oddsRatio !== undefined) {
      data.push({
        metric: 'Odds Ratio',
        value: formatValue(result.oddsRatio),
        interpretation: result.orInterpretation || '-'
      })
    }

    if (result.fishersZ !== null && result.fishersZ !== undefined) {
      data.push({
        metric: "Fisher's z",
        value: formatValue(result.fishersZ),
        interpretation: 'For meta-analysis'
      })
    }

    const columns = [
      { key: 'metric', header: 'Effect Size Metric', type: 'text' as const },
      { key: 'value', header: 'Value', type: 'text' as const },
      { key: 'interpretation', header: 'Interpretation', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="Converted Effect Sizes"
      />
    )
  }

  const renderInterpretationGuide = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Effect Size Interpretation Guide
        </CardTitle>
        <CardDescription>Cohen (1988) guidelines</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Cohen&apos;s d</h4>
            <ul className="text-sm space-y-1">
              <li><Badge className={INTERPRETATION_COLORS['small']}>Small</Badge> 0.2</li>
              <li><Badge className={INTERPRETATION_COLORS['medium']}>Medium</Badge> 0.5</li>
              <li><Badge className={INTERPRETATION_COLORS['large']}>Large</Badge> 0.8</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Correlation (r)</h4>
            <ul className="text-sm space-y-1">
              <li><Badge className={INTERPRETATION_COLORS['small']}>Small</Badge> 0.1</li>
              <li><Badge className={INTERPRETATION_COLORS['medium']}>Medium</Badge> 0.3</li>
              <li><Badge className={INTERPRETATION_COLORS['large']}>Large</Badge> 0.5</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Eta-squared</h4>
            <ul className="text-sm space-y-1">
              <li><Badge className={INTERPRETATION_COLORS['small']}>Small</Badge> 0.01</li>
              <li><Badge className={INTERPRETATION_COLORS['medium']}>Medium</Badge> 0.06</li>
              <li><Badge className={INTERPRETATION_COLORS['large']}>Large</Badge> 0.14</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Odds Ratio</h4>
            <ul className="text-sm space-y-1">
              <li><Badge className={INTERPRETATION_COLORS['small']}>Small</Badge> 1.5</li>
              <li><Badge className={INTERPRETATION_COLORS['medium']}>Medium</Badge> 2.5</li>
              <li><Badge className={INTERPRETATION_COLORS['large']}>Large</Badge> 4.3</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <TwoPanelLayout
      analysisTitle="Effect Size Converter"
      analysisSubtitle="Convert between different effect size metrics"
      analysisIcon={<ArrowRightLeft className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={steps}
      onStepChange={() => {}}
    >
      <div className="space-y-6">
        {/* Input Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Select Input Type
            </CardTitle>
            <CardDescription>
              Choose the statistic you have from your analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={inputType} onValueChange={(v) => handleInputTypeChange(v as InputType)}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-7">
                <TabsTrigger value="t">t</TabsTrigger>
                <TabsTrigger value="f">F</TabsTrigger>
                <TabsTrigger value="chi-square">Chi2</TabsTrigger>
                <TabsTrigger value="r">r</TabsTrigger>
                <TabsTrigger value="d">d</TabsTrigger>
                <TabsTrigger value="odds-ratio">OR</TabsTrigger>
                <TabsTrigger value="means">Means</TabsTrigger>
              </TabsList>

              {(Object.keys(INPUT_TYPE_INFO) as InputType[]).map(type => (
                <TabsContent key={type} value={type} className="mt-4">
                  <div className="p-3 bg-muted rounded-lg mb-4">
                    <p className="text-sm font-medium">{INPUT_TYPE_INFO[type].label}</p>
                    <p className="text-sm text-muted-foreground">{INPUT_TYPE_INFO[type].description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {INPUT_TYPE_INFO[type].fields.map(field => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                          id={field.key}
                          type="number"
                          step="any"
                          placeholder={field.placeholder}
                          value={inputValues[field.key] || ''}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button
            onClick={handleConvert}
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? 'Converting...' : 'Convert'}
            <Zap className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Conversion Result
                </CardTitle>
                <CardDescription>
                  Input: {result.inputType} | Formula: {result.formula}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Main Effect Size Display */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {result.cohensD !== null && result.cohensD !== undefined && (
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Cohen&apos;s d</p>
                      <p className="text-2xl font-bold">{result.cohensD.toFixed(3)}</p>
                      <Badge className={INTERPRETATION_COLORS[result.dInterpretation || 'negligible']}>
                        {result.dInterpretation}
                      </Badge>
                    </div>
                  )}
                  {result.r !== null && result.r !== undefined && (
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Correlation (r)</p>
                      <p className="text-2xl font-bold">{result.r.toFixed(3)}</p>
                      <Badge className={INTERPRETATION_COLORS[result.rInterpretation || 'negligible']}>
                        {result.rInterpretation}
                      </Badge>
                    </div>
                  )}
                  {result.etaSquared !== null && result.etaSquared !== undefined && (
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Eta-squared</p>
                      <p className="text-2xl font-bold">{result.etaSquared.toFixed(3)}</p>
                      <Badge className={INTERPRETATION_COLORS[result.etaInterpretation || 'negligible']}>
                        {result.etaInterpretation}
                      </Badge>
                    </div>
                  )}
                  {result.oddsRatio !== null && result.oddsRatio !== undefined && (
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Odds Ratio</p>
                      <p className="text-2xl font-bold">{result.oddsRatio.toFixed(3)}</p>
                      <Badge className={INTERPRETATION_COLORS[result.orInterpretation || 'negligible']}>
                        {result.orInterpretation}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Confidence Interval if available */}
                {result.dCiLower !== null && result.dCiUpper !== null && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
                    <p className="text-sm">
                      <strong>95% CI for d:</strong> [{result.dCiLower?.toFixed(3)}, {result.dCiUpper?.toFixed(3)}]
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Results Table */}
            {renderResultsTable()}

            {/* Link to Power Analysis */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Use this effect size for power analysis?</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/statistics/power-analysis">
                      Go to Power Analysis
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Interpretation Guide */}
        {renderInterpretationGuide()}
      </div>
    </TwoPanelLayout>
  )
}
