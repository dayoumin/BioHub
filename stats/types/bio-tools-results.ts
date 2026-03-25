/**
 * Bio-Tools 결과 타입 중앙 정의
 *
 * 모든 bio-tools 페이지에서 이 파일의 타입을 import하여 사용한다.
 * Worker Python 반환값과 1:1 대응되어야 하며, 필드명은 camelCase 필수.
 */

// ============================================================
// Fisheries (Worker 7)
// ============================================================

/** Condition Factor — 그룹별 기술통계 */
export interface ConditionFactorGroupStats {
  mean: number
  std: number
  n: number
  median: number
}

/** Condition Factor — 그룹 간 비교 검정 */
export interface ConditionFactorComparison {
  test: 't-test' | 'ANOVA'
  statistic: number
  pValue: number
  df: number
  df2?: number
}

/** Fulton's Condition Factor (K = 100 × W / L³) */
export interface ConditionFactorResult {
  individualK: number[]
  mean: number
  std: number
  median: number
  min: number
  max: number
  n: number
  groupStats?: Record<string, ConditionFactorGroupStats>
  comparison?: ConditionFactorComparison
}

/** Length-Weight 관계 (W = aL^b) */
export interface LengthWeightResult {
  a: number
  b: number
  logA: number
  rSquared: number
  bStdError: number
  isometricTStat: number
  isometricPValue: number
  growthType: 'isometric' | 'positive_allometric' | 'negative_allometric'
  predicted: number[]
  nObservations: number
  logLogPoints: Array<{ logL: number; logW: number }>
}

/** VBGF 파라미터 테이블 행 */
export interface VbgfParameterRow {
  name: string
  unit: string
  estimate: number
  standardError: number
  ciLower: number
  ciUpper: number
}

/** Von Bertalanffy Growth Function */
export interface VbgfResult {
  lInf: number
  k: number
  t0: number
  standardErrors: number[]
  ci95: number[]
  rSquared: number
  predicted: number[]
  residuals: number[]
  nObservations: number
  aic: number | null
  parameterTable: VbgfParameterRow[]
}

// ============================================================
// Ecology (Worker 8)
// ============================================================

/** Alpha Diversity — 사이트별 결과 */
export interface AlphaDiversitySiteResult {
  siteName: string
  speciesRichness: number
  totalAbundance: number
  shannonH: number
  simpsonDominance: number
  simpsonDiversity: number
  simpsonReciprocal: number
  margalef: number
  pielou: number
}

/** Alpha Diversity — 요약 통계 행 */
export interface AlphaDiversitySummaryRow {
  index: string
  mean: number
  sd: number
  min: number
  max: number
}

/** Alpha Diversity */
export interface AlphaDiversityResult {
  siteResults: AlphaDiversitySiteResult[]
  summaryTable: AlphaDiversitySummaryRow[]
  speciesNames: string[]
  siteCount: number
}

/** Beta Diversity (거리 행렬) */
export interface BetaDiversityResult {
  distanceMatrix: number[][]
  siteLabels: string[]
  metric: string
}

/** Rarefaction — 사이트별 곡선 */
export interface RarefactionCurve {
  siteName: string
  steps: number[]
  expectedSpecies: number[]
}

/** Rarefaction */
export interface RarefactionResult {
  curves: RarefactionCurve[]
}

/** NMDS (비계량 다차원 척도법) */
export interface NmdsResult {
  coordinates: number[][]
  stress: number
  stressInterpretation: string
  siteLabels: string[]
  groups: string[] | null
}

/** PERMANOVA */
export interface PermanovaResult {
  pseudoF: number
  pValue: number
  rSquared: number
  permutations: number
  ssBetween: number
  ssWithin: number
  ssTotal: number
}

/** Mantel Test */
export interface MantelResult {
  r: number
  pValue: number
  permutations: number
  method: string
}

// ============================================================
// Survival / Statistics (Worker 5)
// ============================================================

/** Meta-Analysis */
export interface MetaAnalysisResult {
  pooledEffect: number
  pooledSE: number
  ci: [number, number]
  zValue: number
  pValue: number
  Q: number
  QpValue: number
  iSquared: number
  tauSquared: number
  model: string
  weights: number[]
  studyCiLower: number[]
  studyCiUpper: number[]
  studyNames: string[]
  effectSizes: number[]
}

/** ROC 곡선 좌표 */
export interface RocPoint {
  fpr: number
  tpr: number
}

/** ROC-AUC */
export interface RocAucResult {
  rocPoints: RocPoint[]
  auc: number
  aucCI: { lower: number; upper: number }
  optimalThreshold: number
  sensitivity: number
  specificity: number
}

/** Kaplan-Meier 곡선 */
export interface KmCurve {
  time: number[]
  survival: number[]
  ciLo: number[]
  ciHi: number[]
  atRisk: number[]
  medianSurvival: number | null
  censored: number[]
  nEvents: number
}

/** Survival (Kaplan-Meier + Log-rank) */
export interface SurvivalResult {
  curves: Record<string, KmCurve>
  logRankP: number | null
  medianSurvivalTime: number | null
}

/** ICC 유형 */
export type IccType = 'ICC1_1' | 'ICC2_1' | 'ICC3_1'

/** Intraclass Correlation Coefficient */
export interface IccResult {
  icc: number
  iccType: IccType
  fValue: number
  df1: number
  df2: number
  pValue: number
  ci: [number, number]
  msRows: number
  msCols: number
  msError: number
  nSubjects: number
  nRaters: number
  interpretation: string
}

// ============================================================
// Genetics (Worker 9)
// ============================================================

/** HW 단일 유전자좌 결과 */
export interface HwLocusResult {
  locus: string
  observedCounts: number[]
  expectedCounts: number[]
  alleleFreqP: number
  alleleFreqQ: number
  chiSquare: number
  pValue: number
  degreesOfFreedom: number
  inEquilibrium: boolean
  isMonomorphic: boolean
  nTotal: number
  lowExpectedWarning: boolean
}

/** Hardy-Weinberg 평형 검정 결과 */
export interface HardyWeinbergResult {
  alleleFreqP: number
  alleleFreqQ: number
  observedCounts: number[]
  expectedCounts: number[]
  chiSquare: number
  pValue: number
  degreesOfFreedom: number
  inEquilibrium: boolean
  isMonomorphic: boolean
  interpretation: string
  nTotal: number
  lowExpectedWarning: boolean
  locusResults: HwLocusResult[] | null
}

/** Fst (집단 분화 지수) 결과 */
export interface FstResult {
  globalFst: number
  pairwiseFst: number[][] | null
  populationLabels: string[]
  nPopulations: number
  interpretation: string
}
