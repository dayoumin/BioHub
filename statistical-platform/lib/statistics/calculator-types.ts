import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

export interface CalculationResult {
  success: boolean
  data?: {
    metrics?: Array<{ name: string; value: number | string }>
    tables?: Array<{ name: string; data: any[] }>
    charts?: Array<{ type: string; data: any }>
    interpretation?: string
  }
  error?: string
}

export const CANONICAL_METHOD_IDS = [
  'calculateDescriptiveStats',
  'normalityTest',
  'homogeneityTest',
  'oneSampleTTest',
  'twoSampleTTest',
  'pairedTTest',
  'welchTTest',
  'oneSampleProportionTest',
  'oneWayANOVA',
  'twoWayANOVA',
  'manova',
  'tukeyHSD',
  'bonferroni',
  'gamesHowell',
  'dunnTest',
  'simpleLinearRegression',
  'multipleRegression',
  'logisticRegression',
  'correlationAnalysis',
  'chiSquareTest',
  'kruskalWallis',
  'mannWhitneyU',
  'wilcoxonSignedRank',
  'kaplanMeierSurvival',
  'coxRegression',
  'pca',
  'hierarchicalClustering',
  'kMeansClustering',
  'timeSeriesDecomposition',
  'arimaForecast',
  'sarimaForecast',
  'varModel',
  'mixedEffectsModel'
] as const
\n
export type CanonicalMethodId = typeof CANONICAL_METHOD_IDS[number]

export type MethodHandler = (
  data: any[],
  parameters: Record<string, any>
) => Promise<CalculationResult>

export type HandlerMap = Partial<Record<CanonicalMethodId, MethodHandler>>

export interface CalculatorContext {
  pyodideService: PyodideStatisticsService
}

