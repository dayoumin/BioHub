/**
 * Pyodide 관련 타입 정의
 * Pyodide는 CDN에서 로드됩니다 (npm 패키지 사용 안 함)
 */

export interface PyodideInterface {
  loadPackage: (packages: string | string[]) => Promise<void>
  runPython: (code: string) => any
  runPythonAsync: (code: string) => Promise<any>
  globals: any
  FS: {
    writeFile(path: string, data: string | Uint8Array): void
    readFile(path: string, options?: { encoding?: string }): string | Uint8Array
    unlink(path: string): void
    mkdir(path: string): void
  }
  loadedPackages: Record<string, string>
  isPyProxy: (obj: any) => boolean
  version: string
}

export interface StatisticalTestResult {
  statistic: number
  pvalue: number
  df?: number
  interpretation?: string
  effectSize?: number
  confidenceInterval?: [number, number]
}

export interface DescriptiveStatsResult {
  mean: number
  median: number
  std: number
  variance: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  skew: number
  kurtosis: number
  cv: number
  count: number
}

export interface NormalityTestResult {
  statistic: number
  pValue: number
  isNormal: boolean
  interpretation: string
}

export interface OutlierResult {
  outliers: number[]
  outlierIndices: number[]
  lowerBound: number
  upperBound: number
}

export interface CorrelationResult {
  correlation: number
  pValue: number
  interpretation: string
  strength: string
}

export interface HomogeneityTestResult {
  statistic: number
  pValue: number
  isHomogeneous: boolean
  method: string
}

export interface ANOVAResult {
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  interpretation: string
}

export interface TukeyHSDResult {
  comparison: string
  meanDiff: number
  pAdj: number
  lower: number
  upper: number
  significant: boolean
}

export interface RegressionResult {
  slope: number
  intercept: number
  rValue: number
  rSquared: number
  pValue: number
  stdErr: number
  equation: string
}

/**
 * Window 전역 타입 확장
 * Pyodide CDN 스크립트로 로드 시 사용
 */
declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
    pyodide?: PyodideInterface
  }
}