import type { BioToolId } from '@/lib/bio-tools/bio-tool-registry'
import type {
  AlphaDiversityResult,
  BetaDiversityResult,
  ConditionFactorResult,
  FstResult,
  HardyWeinbergResult,
  IccResult,
  LengthWeightResult,
  MantelResult,
  MetaAnalysisResult,
  NmdsResult,
  PermanovaResult,
  RarefactionResult,
  RocAucResult,
  SurvivalResult,
  VbgfResult,
} from '@/types/bio-tools-results'

export interface BioToolResultContractFixture<TResult = unknown> {
  toolId: BioToolId
  toolNameEn: string
  toolNameKo: string
  csvFileName: string
  columnConfig: Record<string, string>
  results: TResult
  producer: {
    workerPath: string
    requiredResultKeys: readonly string[]
  }
}

const alphaDiversityResult = {
  siteResults: [
    {
      siteName: 'Site A',
      speciesRichness: 3,
      totalAbundance: 12,
      shannonH: 1.01,
      simpsonDominance: 0.38,
      simpsonDiversity: 0.62,
      simpsonReciprocal: 2.63,
      margalef: 0.8,
      pielou: 0.92,
    },
  ],
  summaryTable: [
    { index: 'speciesRichness', mean: 3, sd: 0, min: 3, max: 3 },
    { index: 'shannonH', mean: 1.01, sd: 0, min: 1.01, max: 1.01 },
  ],
  speciesNames: ['sp_a', 'sp_b', 'sp_c'],
  siteCount: 1,
} satisfies AlphaDiversityResult

const betaDiversityResult = {
  distanceMatrix: [
    [0, 0.25],
    [0.25, 0],
  ],
  siteLabels: ['Site A', 'Site B'],
  metric: 'bray-curtis',
} satisfies BetaDiversityResult

const conditionFactorResult = {
  individualK: [1.12, 1.24, 1.33],
  mean: 1.23,
  std: 0.11,
  median: 1.24,
  min: 1.12,
  max: 1.33,
  n: 3,
  groupStats: {
    control: { mean: 1.18, std: 0.06, n: 2, median: 1.18 },
    treatment: { mean: 1.33, std: 0, n: 1, median: 1.33 },
  },
  comparison: {
    test: 't-test',
    statistic: 2.1,
    pValue: 0.08,
    df: 1,
  },
} satisfies ConditionFactorResult

const fstResult = {
  globalFst: 0.123456,
  pairwiseFst: [
    [0, 0.12, 0.18],
    [0.12, 0, 0.21],
    [0.18, 0.21, 0],
  ],
  populationLabels: ['Pop A', 'Pop B', 'Pop C'],
  nPopulations: 3,
  interpretation: 'large differentiation',
  nIndividuals: 30,
  nLoci: 4,
  permutationPValue: 0.0123,
  nPermutations: 999,
  bootstrapCi: [0.08, 0.17],
  nBootstrap: 1000,
} satisfies FstResult

const hardyWeinbergResult = {
  alleleFreqP: 0.62,
  alleleFreqQ: 0.38,
  observedCounts: [38, 44, 18],
  expectedCounts: [38.44, 47.12, 14.44],
  chiSquare: 0.92,
  pValue: 0.34,
  exactPValue: 0.29,
  degreesOfFreedom: 1,
  inEquilibrium: true,
  isMonomorphic: false,
  interpretation: 'in equilibrium',
  nTotal: 100,
  lowExpectedWarning: false,
  locusResults: null,
} satisfies HardyWeinbergResult

const iccResult = {
  icc: 0.72,
  iccType: 'ICC2_1',
  fValue: 6.4,
  df1: 9,
  df2: 18,
  pValue: 0.004,
  ci: [0.41, 0.89],
  msRows: 3.2,
  msCols: 0.4,
  msError: 0.5,
  nSubjects: 10,
  nRaters: 3,
  interpretation: 'good',
} satisfies IccResult

const lengthWeightResult = {
  a: 0.012,
  b: 3.08,
  logA: -4.42,
  rSquared: 0.93,
  bStdError: 0.12,
  isometricTStat: 0.67,
  isometricPValue: 0.51,
  growthType: 'positive_allometric',
  predicted: [10.2, 15.4, 22.7],
  nObservations: 3,
  logLogPoints: [
    { logL: 2.3, logW: 2.1 },
    { logL: 2.5, logW: 2.6 },
    { logL: 2.7, logW: 3.1 },
  ],
} satisfies LengthWeightResult

const mantelResult = {
  r: 0.42,
  pValue: 0.03,
  permutations: 999,
  method: 'pearson',
} satisfies MantelResult

const metaAnalysisResult = {
  pooledEffect: 0.35,
  pooledSE: 0.08,
  ci: [0.19, 0.51],
  zValue: 4.38,
  pValue: 0.0001,
  Q: 3.4,
  QpValue: 0.18,
  iSquared: 41.2,
  tauSquared: 0.02,
  model: 'random-effects',
  weights: [0.45, 0.55],
  studyCiLower: [0.1, 0.21],
  studyCiUpper: [0.4, 0.62],
  studyNames: ['Study A', 'Study B'],
  effectSizes: [0.25, 0.4],
} satisfies MetaAnalysisResult

const nmdsResult = {
  coordinates: [
    [0.1, 0.2],
    [-0.3, 0.4],
    [0.2, -0.1],
  ],
  stress: 0.12,
  stressInterpretation: 'fair',
  siteLabels: ['Site A', 'Site B', 'Site C'],
  groups: ['control', 'control', 'treatment'],
} satisfies NmdsResult

const permanovaResult = {
  pseudoF: 2.7,
  pValue: 0.02,
  rSquared: 0.31,
  permutations: 999,
  ssBetween: 1.2,
  ssWithin: 2.7,
  ssTotal: 3.9,
} satisfies PermanovaResult

const rarefactionResult = {
  curves: [
    {
      siteName: 'Site A',
      steps: [1, 5, 10],
      expectedSpecies: [1, 2.4, 3.1],
    },
  ],
} satisfies RarefactionResult

const rocAucResult = {
  rocPoints: [
    { fpr: 0, tpr: 0 },
    { fpr: 0.2, tpr: 0.78 },
    { fpr: 1, tpr: 1 },
  ],
  auc: 0.84,
  aucCI: { lower: 0.72, upper: 0.93 },
  optimalThreshold: 0.61,
  sensitivity: 0.78,
  specificity: 0.81,
} satisfies RocAucResult

const survivalResult = {
  curves: {
    control: {
      time: [0, 5, 10],
      survival: [1, 0.8, 0.6],
      ciLo: [1, 0.62, 0.4],
      ciHi: [1, 0.95, 0.81],
      atRisk: [10, 8, 6],
      medianSurvival: null,
      censored: [12],
      nEvents: 3,
    },
  },
  logRankP: 0.04,
  medianSurvivalTime: 15,
} satisfies SurvivalResult

const vbgfResult = {
  lInf: 82,
  k: 0.31,
  t0: -0.42,
  standardErrors: [3.2, 0.04, 0.11],
  ci95: [6.27, 0.0784, 0.2156],
  rSquared: 0.91,
  predicted: [21.4, 38.2, 51.6],
  residuals: [0.5, -0.3, 0.1],
  nObservations: 3,
  aic: 24.8,
  parameterTable: [
    { name: 'L∞', unit: 'cm', estimate: 82, standardError: 3.2, ciLower: 75.73, ciUpper: 88.27 },
    { name: 'K', unit: 'year^-1', estimate: 0.31, standardError: 0.04, ciLower: 0.2316, ciUpper: 0.3884 },
    { name: 't₀', unit: 'year', estimate: -0.42, standardError: 0.11, ciLower: -0.6356, ciUpper: -0.2044 },
  ],
} satisfies VbgfResult

export const BIO_TOOL_RESULT_CONTRACT_FIXTURES = [
  {
    toolId: 'alpha-diversity',
    toolNameEn: 'Alpha Diversity',
    toolNameKo: '생물다양성 지수',
    csvFileName: 'alpha-diversity.csv',
    columnConfig: { site: 'site' },
    results: alphaDiversityResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker8-ecology.py',
      requiredResultKeys: [
        'siteResults',
        'summaryTable',
        'speciesNames',
        'siteCount',
        'siteName',
        'speciesRichness',
        'totalAbundance',
        'shannonH',
        'simpsonDiversity',
      ],
    },
  },
  {
    toolId: 'beta-diversity',
    toolNameEn: 'Beta Diversity',
    toolNameKo: '베타 다양성',
    csvFileName: 'beta-diversity.csv',
    columnConfig: { site: 'site' },
    results: betaDiversityResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker8-ecology.py',
      requiredResultKeys: ['distanceMatrix', 'siteLabels', 'metric'],
    },
  },
  {
    toolId: 'condition-factor',
    toolNameEn: 'Condition Factor',
    toolNameKo: '비만도',
    csvFileName: 'condition-factor.csv',
    columnConfig: { length: 'length', weight: 'weight' },
    results: conditionFactorResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker7-fisheries.py',
      requiredResultKeys: [
        'individualK',
        'mean',
        'std',
        'median',
        'min',
        'max',
        'n',
        'groupStats',
        'comparison',
        'pValue',
      ],
    },
  },
  {
    toolId: 'fst',
    toolNameEn: 'Fst',
    toolNameKo: '집단 분화 지수',
    csvFileName: 'fst.csv',
    columnConfig: { population: 'population' },
    results: fstResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker9-genetics.py',
      requiredResultKeys: [
        'globalFst',
        'pairwiseFst',
        'populationLabels',
        'nPopulations',
        'interpretation',
        'nIndividuals',
        'nLoci',
        'permutationPValue',
        'nPermutations',
      ],
    },
  },
  {
    toolId: 'hardy-weinberg',
    toolNameEn: 'Hardy-Weinberg',
    toolNameKo: 'Hardy-Weinberg 검정',
    csvFileName: 'hardy-weinberg.csv',
    columnConfig: { genotype: 'genotype' },
    results: hardyWeinbergResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker9-genetics.py',
      requiredResultKeys: [
        'alleleFreqP',
        'alleleFreqQ',
        'observedCounts',
        'expectedCounts',
        'chiSquare',
        'pValue',
        'exactPValue',
        'degreesOfFreedom',
        'inEquilibrium',
        'isMonomorphic',
        'nTotal',
        'lowExpectedWarning',
        'locusResults',
      ],
    },
  },
  {
    toolId: 'icc',
    toolNameEn: 'ICC',
    toolNameKo: '급내상관계수',
    csvFileName: 'icc.csv',
    columnConfig: { subject: 'subject', rater: 'rater' },
    results: iccResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker5-survival.py',
      requiredResultKeys: [
        'icc',
        'iccType',
        'fValue',
        'df1',
        'df2',
        'pValue',
        'ci',
        'msRows',
        'msCols',
        'msError',
        'nSubjects',
        'nRaters',
        'interpretation',
      ],
    },
  },
  {
    toolId: 'length-weight',
    toolNameEn: 'Length-Weight',
    toolNameKo: '체장-체중 관계식',
    csvFileName: 'length-weight.csv',
    columnConfig: { length: 'length', weight: 'weight' },
    results: lengthWeightResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker7-fisheries.py',
      requiredResultKeys: [
        'a',
        'b',
        'logA',
        'rSquared',
        'bStdError',
        'isometricTStat',
        'isometricPValue',
        'growthType',
        'predicted',
        'nObservations',
        'logLogPoints',
        'logL',
        'logW',
      ],
    },
  },
  {
    toolId: 'mantel-test',
    toolNameEn: 'Mantel Test',
    toolNameKo: 'Mantel 검정',
    csvFileName: 'mantel-test.csv',
    columnConfig: { method: 'pearson' },
    results: mantelResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker8-ecology.py',
      requiredResultKeys: ['r', 'pValue', 'permutations', 'method'],
    },
  },
  {
    toolId: 'meta-analysis',
    toolNameEn: 'Meta-Analysis',
    toolNameKo: '메타분석',
    csvFileName: 'meta-analysis.csv',
    columnConfig: { effect: 'effect', se: 'se' },
    results: metaAnalysisResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker5-survival.py',
      requiredResultKeys: [
        'pooledEffect',
        'pooledSE',
        'ci',
        'zValue',
        'pValue',
        'Q',
        'QpValue',
        'iSquared',
        'tauSquared',
        'model',
        'weights',
        'studyCiLower',
        'studyCiUpper',
        'studyNames',
        'effectSizes',
      ],
    },
  },
  {
    toolId: 'nmds',
    toolNameEn: 'NMDS',
    toolNameKo: '비계량 다차원 척도법',
    csvFileName: 'nmds.csv',
    columnConfig: { site: 'site' },
    results: nmdsResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker8-ecology.py',
      requiredResultKeys: ['coordinates', 'stress', 'stressInterpretation', 'siteLabels', 'groups'],
    },
  },
  {
    toolId: 'permanova',
    toolNameEn: 'PERMANOVA',
    toolNameKo: '순열 다변량 분산분석',
    csvFileName: 'permanova.csv',
    columnConfig: { group: 'group' },
    results: permanovaResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker8-ecology.py',
      requiredResultKeys: ['pseudoF', 'pValue', 'rSquared', 'permutations', 'ssBetween', 'ssWithin', 'ssTotal'],
    },
  },
  {
    toolId: 'rarefaction',
    toolNameEn: 'Rarefaction',
    toolNameKo: '종 희박화 곡선',
    csvFileName: 'rarefaction.csv',
    columnConfig: { site: 'site' },
    results: rarefactionResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker8-ecology.py',
      requiredResultKeys: ['curves', 'siteName', 'steps', 'expectedSpecies'],
    },
  },
  {
    toolId: 'roc-auc',
    toolNameEn: 'ROC / AUC',
    toolNameKo: 'ROC 곡선',
    csvFileName: 'roc-auc.csv',
    columnConfig: { outcome: 'outcome', score: 'score' },
    results: rocAucResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker5-survival.py',
      requiredResultKeys: [
        'rocPoints',
        'fpr',
        'tpr',
        'auc',
        'aucCI',
        'lower',
        'upper',
        'optimalThreshold',
        'sensitivity',
        'specificity',
      ],
    },
  },
  {
    toolId: 'survival',
    toolNameEn: 'Survival Analysis',
    toolNameKo: '생존 분석',
    csvFileName: 'survival.csv',
    columnConfig: { time: 'time', event: 'event' },
    results: survivalResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker5-survival.py',
      requiredResultKeys: [
        'curves',
        'time',
        'survival',
        'ciLo',
        'ciHi',
        'atRisk',
        'medianSurvival',
        'censored',
        'nEvents',
        'logRankP',
        'medianSurvivalTime',
      ],
    },
  },
  {
    toolId: 'vbgf',
    toolNameEn: 'VBGF',
    toolNameKo: 'von Bertalanffy 성장 모델',
    csvFileName: 'vbgf.csv',
    columnConfig: { age: 'age', length: 'length' },
    results: vbgfResult,
    producer: {
      workerPath: 'stats/public/workers/python/worker7-fisheries.py',
      requiredResultKeys: [
        'lInf',
        'k',
        't0',
        'standardErrors',
        'ci95',
        'rSquared',
        'predicted',
        'residuals',
        'nObservations',
        'aic',
        'parameterTable',
        'standardError',
        'ciLower',
        'ciUpper',
      ],
    },
  },
] as const satisfies readonly BioToolResultContractFixture[]

export const BIO_TOOL_RESULT_CONTRACT_FIXTURE_TOOL_IDS = BIO_TOOL_RESULT_CONTRACT_FIXTURES.map(
  (fixture) => fixture.toolId,
)
