import type { BioToolHistoryEntry } from '@/lib/bio-tools'
import type {
  AlphaDiversityResult,
  AlphaDiversitySiteResult,
  AlphaDiversitySummaryRow,
  BetaDiversityResult,
  ConditionFactorComparison,
  ConditionFactorGroupStats,
  ConditionFactorResult,
  FstResult,
  HardyWeinbergResult,
  HwLocusResult,
  IccResult,
  KmCurve,
  LengthWeightResult,
  MantelResult,
  MetaAnalysisResult,
  NmdsResult,
  PermanovaResult,
  RarefactionCurve,
  RarefactionResult,
  RocAucResult,
  RocPoint,
  SurvivalResult,
  VbgfParameterRow,
  VbgfResult,
} from '@/types/bio-tools-results'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isNumberMatrix(value: unknown): value is number[][] {
  return Array.isArray(value) && value.every((row) => (
    Array.isArray(row) && row.every(isFiniteNumber)
  ))
}

function isNumberArrayOfLength(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every(isFiniteNumber)
}

function isFiniteNumberArrayOfLength(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every(isFiniteNumber)
}

function isNumberTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value)
    && value.length === 2
    && isFiniteNumber(value[0])
    && isFiniteNumber(value[1])
  )
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

const ALPHA_DIVERSITY_INDEX_LABELS: Record<string, string> = {
  speciesRichness: 'Species richness',
  totalAbundance: 'Total abundance',
  shannonH: "Shannon H'",
  simpsonDominance: 'Simpson D',
  simpsonDiversity: 'Simpson 1-D',
  simpsonReciprocal: 'Simpson 1/D',
  margalef: 'Margalef d',
  pielou: "Pielou J'",
}

function isAlphaDiversityIndexKey(value: unknown): value is keyof typeof ALPHA_DIVERSITY_INDEX_LABELS {
  return typeof value === 'string' && Object.hasOwn(ALPHA_DIVERSITY_INDEX_LABELS, value)
}

function isProbability(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0
}

function isAlphaDiversitySiteResult(value: unknown): value is AlphaDiversitySiteResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.siteName === 'string'
    && Number.isInteger(record.speciesRichness)
    && isNonNegativeFiniteNumber(record.speciesRichness)
    && isNonNegativeFiniteNumber(record.totalAbundance)
    && isNonNegativeFiniteNumber(record.shannonH)
    && isNonNegativeFiniteNumber(record.simpsonDominance)
    && isNonNegativeFiniteNumber(record.simpsonDiversity)
    && isNonNegativeFiniteNumber(record.simpsonReciprocal)
    && isNonNegativeFiniteNumber(record.margalef)
    && isNonNegativeFiniteNumber(record.pielou)
  )
}

function isAlphaDiversitySummaryRow(value: unknown): value is AlphaDiversitySummaryRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    isAlphaDiversityIndexKey(record.index)
    && isNonNegativeFiniteNumber(record.mean)
    && isNonNegativeFiniteNumber(record.sd)
    && isNonNegativeFiniteNumber(record.min)
    && isNonNegativeFiniteNumber(record.max)
    && record.min <= record.max
    && record.mean >= record.min
    && record.mean <= record.max
  )
}

export function isAlphaDiversityResult(value: unknown): value is AlphaDiversityResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isPositiveInteger(record.siteCount)) {
    return false
  }
  if (!isStringArray(record.speciesNames) || record.speciesNames.length === 0) {
    return false
  }
  const speciesNames = record.speciesNames
  if (
    !Array.isArray(record.siteResults)
    || record.siteResults.length !== record.siteCount
    || !record.siteResults.every(isAlphaDiversitySiteResult)
  ) {
    return false
  }
  const siteResults = record.siteResults
  if (
    siteResults.some((site) => (
      site.speciesRichness > speciesNames.length
      || site.totalAbundance < site.speciesRichness
    ))
  ) {
    return false
  }
  return (
    Array.isArray(record.summaryTable)
    && record.summaryTable.every(isAlphaDiversitySummaryRow)
  )
}

function isLengthWeightGrowthType(value: unknown): value is LengthWeightResult['growthType'] {
  return (
    value === 'isometric'
    || value === 'positive_allometric'
    || value === 'negative_allometric'
  )
}

function isLengthWeightLogLogPoint(value: unknown): value is { logL: number; logW: number } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return isFiniteNumber(record.logL) && isFiniteNumber(record.logW)
}

export function isLengthWeightResult(value: unknown): value is LengthWeightResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isPositiveInteger(record.nObservations)) {
    return false
  }
  return (
    isNonNegativeFiniteNumber(record.a)
    && record.a > 0
    && isFiniteNumber(record.b)
    && isFiniteNumber(record.logA)
    && isProbability(record.rSquared)
    && isNonNegativeFiniteNumber(record.bStdError)
    && isFiniteNumber(record.isometricTStat)
    && isProbability(record.isometricPValue)
    && isLengthWeightGrowthType(record.growthType)
    && isFiniteNumberArrayOfLength(record.predicted, record.nObservations)
    && Array.isArray(record.logLogPoints)
    && record.logLogPoints.length === record.nObservations
    && record.logLogPoints.every(isLengthWeightLogLogPoint)
  )
}

function isVbgfParameterRow(value: unknown): value is VbgfParameterRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.name === 'string'
    && record.name.trim().length > 0
    && typeof record.unit === 'string'
    && isFiniteNumber(record.estimate)
    && isNonNegativeFiniteNumber(record.standardError)
    && isFiniteNumber(record.ciLower)
    && isFiniteNumber(record.ciUpper)
    && record.ciLower <= record.estimate
    && record.estimate <= record.ciUpper
  )
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function areNearlyEqual(left: number, right: number): boolean {
  const tolerance = Math.max(1e-8, Math.abs(left), Math.abs(right)) * 1e-6
  return Math.abs(left - right) <= tolerance
}

function isExpectedVbgfParameterRow(
  row: VbgfParameterRow,
  expectedName: string,
  expectedEstimate: number,
  expectedStandardError: number,
  expectedCiHalfWidth: number,
): boolean {
  return (
    row.name === expectedName
    && areNearlyEqual(row.estimate, expectedEstimate)
    && areNearlyEqual(row.standardError, expectedStandardError)
    && areNearlyEqual(row.ciLower, expectedEstimate - expectedCiHalfWidth)
    && areNearlyEqual(row.ciUpper, expectedEstimate + expectedCiHalfWidth)
  )
}

export function isVbgfResult(value: unknown): value is VbgfResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isPositiveInteger(record.nObservations) || record.nObservations < 3) {
    return false
  }
  if (!Array.isArray(record.parameterTable) || record.parameterTable.length !== 3) {
    return false
  }
  if (!record.parameterTable.every(isVbgfParameterRow)) {
    return false
  }
  if (
    !isPositiveFiniteNumber(record.lInf)
    || !isPositiveFiniteNumber(record.k)
    || !isFiniteNumber(record.t0)
    || !isFiniteNumber(record.rSquared)
    || record.rSquared > 1
    || !isNullableFiniteNumber(record.aic)
    || !isFiniteNumberArrayOfLength(record.standardErrors, 3)
    || record.standardErrors.some((standardError) => standardError < 0)
    || !isFiniteNumberArrayOfLength(record.ci95, 3)
    || record.ci95.some((ci) => ci < 0)
    || !isFiniteNumberArrayOfLength(record.predicted, record.nObservations)
    || record.predicted.some((predicted) => predicted <= 0)
    || !isFiniteNumberArrayOfLength(record.residuals, record.nObservations)
  ) {
    return false
  }

  const parameterRows = record.parameterTable
  return (
    isExpectedVbgfParameterRow(parameterRows[0], 'L∞', record.lInf, record.standardErrors[0], record.ci95[0])
    && isExpectedVbgfParameterRow(parameterRows[1], 'K', record.k, record.standardErrors[1], record.ci95[1])
    && isExpectedVbgfParameterRow(parameterRows[2], 't₀', record.t0, record.standardErrors[2], record.ci95[2])
  )
}

export function isPermanovaResult(value: unknown): value is PermanovaResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    !isNonNegativeFiniteNumber(record.ssBetween)
    || !isNonNegativeFiniteNumber(record.ssWithin)
    || !isNonNegativeFiniteNumber(record.ssTotal)
  ) {
    return false
  }
  const sumOfSquaresDelta = Math.abs((record.ssBetween + record.ssWithin) - record.ssTotal)
  const tolerance = Math.max(1e-8, Math.abs(record.ssTotal) * 1e-6)

  return (
    isNonNegativeFiniteNumber(record.pseudoF)
    && isProbability(record.pValue)
    && isProbability(record.rSquared)
    && isPositiveInteger(record.permutations)
    && sumOfSquaresDelta <= tolerance
  )
}

export function isMantelResult(value: unknown): value is MantelResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    isFiniteNumber(record.r)
    && record.r >= -1
    && record.r <= 1
    && isProbability(record.pValue)
    && isPositiveInteger(record.permutations)
    && typeof record.method === 'string'
    && record.method.trim().length > 0
  )
}

export function isBetaDiversityResult(value: unknown): value is BetaDiversityResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isStringArray(record.siteLabels) || record.siteLabels.length === 0) {
    return false
  }
  if (typeof record.metric !== 'string' || record.metric.trim().length === 0) {
    return false
  }
  const siteLabels = record.siteLabels
  if (
    !isNumberMatrix(record.distanceMatrix)
    || record.distanceMatrix.length !== siteLabels.length
    || record.distanceMatrix.some((row) => row.length !== siteLabels.length)
  ) {
    return false
  }

  const matrix = record.distanceMatrix
  for (let rowIndex = 0; rowIndex < siteLabels.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < siteLabels.length; colIndex += 1) {
      const valueAtCell = matrix[rowIndex]?.[colIndex]
      const transposedValue = matrix[colIndex]?.[rowIndex]
      if (!isNonNegativeFiniteNumber(valueAtCell) || !isNonNegativeFiniteNumber(transposedValue)) {
        return false
      }
      if (rowIndex === colIndex && Math.abs(valueAtCell) > 1e-8) {
        return false
      }
      if (Math.abs(valueAtCell - transposedValue) > 1e-8) {
        return false
      }
    }
  }

  return true
}

function isNmdsCoordinate(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 && value.every(isFiniteNumber)
}

export function isNmdsResult(value: unknown): value is NmdsResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    !Array.isArray(record.coordinates)
    || record.coordinates.length < 2
    || !record.coordinates.every(isNmdsCoordinate)
  ) {
    return false
  }

  const coordinates = record.coordinates
  const dimensions = coordinates[0].length
  if (coordinates.some((coordinate) => coordinate.length !== dimensions)) {
    return false
  }

  if (
    !isStringArray(record.siteLabels)
    || record.siteLabels.length !== coordinates.length
    || record.siteLabels.some((label) => label.trim().length === 0)
  ) {
    return false
  }

  return (
    isNonNegativeFiniteNumber(record.stress)
    && typeof record.stressInterpretation === 'string'
    && record.stressInterpretation.trim().length > 0
    && (
      record.groups === null
      || (
        isStringArray(record.groups)
        && record.groups.length === coordinates.length
        && record.groups.every((group) => group.trim().length > 0)
      )
    )
  )
}

function isStrictlyIncreasingNonNegativeNumberArray(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isNonNegativeFiniteNumber)) {
    return false
  }
  return value.every((item, index) => index === 0 || item > value[index - 1])
}

function isRarefactionCurve(value: unknown): value is RarefactionCurve {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (typeof record.siteName !== 'string' || record.siteName.trim().length === 0) {
    return false
  }
  if (!isStrictlyIncreasingNonNegativeNumberArray(record.steps)) {
    return false
  }
  const steps = record.steps
  if (!Array.isArray(record.expectedSpecies)) {
    return false
  }
  const expectedSpecies = record.expectedSpecies
  return (
    expectedSpecies.length === steps.length
    && expectedSpecies.length > 0
    && expectedSpecies.every(isNonNegativeFiniteNumber)
    && expectedSpecies.every((item, index) => index === 0 || item >= expectedSpecies[index - 1])
  )
}

export function isRarefactionResult(value: unknown): value is RarefactionResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    Array.isArray(record.curves)
    && record.curves.length > 0
    && record.curves.every(isRarefactionCurve)
  )
}

function isConditionFactorGroupStats(value: unknown): value is ConditionFactorGroupStats {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    isNonNegativeFiniteNumber(record.mean)
    && isNonNegativeFiniteNumber(record.std)
    && isPositiveInteger(record.n)
    && isNonNegativeFiniteNumber(record.median)
  )
}

function isConditionFactorGroupStatsRecord(value: unknown): value is Record<string, ConditionFactorGroupStats> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.entries(value).every(([groupName, groupStats]) => (
    groupName.trim().length > 0 && isConditionFactorGroupStats(groupStats)
  ))
}

function isConditionFactorComparison(value: unknown): value is ConditionFactorComparison {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    (record.test === 't-test' || record.test === 'ANOVA')
    && isFiniteNumber(record.statistic)
    && isProbability(record.pValue)
    && isPositiveFiniteNumber(record.df)
    && (
      record.test === 'ANOVA'
        ? isPositiveFiniteNumber(record.df2)
        : record.df2 === undefined || isPositiveFiniteNumber(record.df2)
    )
  )
}

export function isConditionFactorResult(value: unknown): value is ConditionFactorResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isPositiveInteger(record.n)) {
    return false
  }
  if (!Array.isArray(record.individualK) || record.individualK.length !== record.n || !record.individualK.every(isNonNegativeFiniteNumber)) {
    return false
  }
  if (record.groupStats !== undefined) {
    if (!isConditionFactorGroupStatsRecord(record.groupStats)) {
      return false
    }
    const groupCountTotal = Object.values(record.groupStats).reduce((total, stats) => total + stats.n, 0)
    if (groupCountTotal > record.n) {
      return false
    }
  }
  return (
    isNonNegativeFiniteNumber(record.mean)
    && isNonNegativeFiniteNumber(record.std)
    && isNonNegativeFiniteNumber(record.median)
    && isNonNegativeFiniteNumber(record.min)
    && isNonNegativeFiniteNumber(record.max)
    && record.min <= record.max
    && record.mean >= record.min
    && record.mean <= record.max
    && record.median >= record.min
    && record.median <= record.max
    && (record.comparison === undefined || isConditionFactorComparison(record.comparison))
  )
}

function isRocPoint(value: unknown): value is RocPoint {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return isProbability(record.fpr) && isProbability(record.tpr)
}

function isRocAucCi(value: unknown): value is RocAucResult['aucCI'] {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    isProbability(record.lower)
    && isProbability(record.upper)
    && record.lower <= record.upper
  )
}

export function isRocAucResult(value: unknown): value is RocAucResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isRocAucCi(record.aucCI) || !isProbability(record.auc)) {
    return false
  }
  return (
    record.auc >= record.aucCI.lower
    && record.auc <= record.aucCI.upper
    && isFiniteNumber(record.optimalThreshold)
    && isProbability(record.sensitivity)
    && isProbability(record.specificity)
    && Array.isArray(record.rocPoints)
    && record.rocPoints.length > 0
    && record.rocPoints.every(isRocPoint)
  )
}

function isNullableNonNegativeFiniteNumber(value: unknown): value is number | null {
  return value === null || isNonNegativeFiniteNumber(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isNonNegativeFiniteNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNonNegativeFiniteNumber)
}

function isProbabilityArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isProbability)
}

function isNonNegativeIntegerArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNonNegativeInteger)
}

function isKmCurve(value: unknown): value is KmCurve {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    !isNonNegativeFiniteNumberArray(record.time)
    || !isProbabilityArray(record.survival)
    || !isProbabilityArray(record.ciLo)
    || !isProbabilityArray(record.ciHi)
    || !isNonNegativeIntegerArray(record.atRisk)
  ) {
    return false
  }

  const time = record.time
  const survival = record.survival
  const ciLo = record.ciLo
  const ciHi = record.ciHi
  const atRisk = record.atRisk
  const pointCount = time.length
  if (
    pointCount === 0
    || survival.length !== pointCount
    || ciLo.length !== pointCount
    || ciHi.length !== pointCount
    || atRisk.length !== pointCount
  ) {
    return false
  }
  for (let index = 1; index < pointCount; index += 1) {
    if (time[index] < time[index - 1]) {
      return false
    }
    if (atRisk[index] > atRisk[index - 1]) {
      return false
    }
  }
  if (
    ciLo.some((lower, index) => lower > survival[index] || lower > ciHi[index])
    || ciHi.some((upper, index) => upper < survival[index])
  ) {
    return false
  }

  const initialAtRisk = atRisk[0]
  return (
    time[0] === 0
    && survival[0] === 1
    && initialAtRisk >= 2
    && atRisk.every((count) => count <= initialAtRisk)
    && isNullableNonNegativeFiniteNumber(record.medianSurvival)
    && isNonNegativeFiniteNumberArray(record.censored)
    && record.censored.every((censoredTime) => censoredTime >= time[0])
    && isNonNegativeInteger(record.nEvents)
    && record.nEvents <= initialAtRisk
    && record.censored.length <= initialAtRisk - record.nEvents
  )
}

export function isSurvivalResult(value: unknown): value is SurvivalResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (typeof record.curves !== 'object' || record.curves === null || Array.isArray(record.curves)) {
    return false
  }

  const curves = Object.entries(record.curves as Record<string, unknown>)
  return (
    curves.length > 0
    && curves.every(([groupName, curve]) => groupName.trim().length > 0 && isKmCurve(curve))
    && (record.logRankP === null || isProbability(record.logRankP))
    && isNullableNonNegativeFiniteNumber(record.medianSurvivalTime)
  )
}

export function isMetaAnalysisResult(value: unknown): value is MetaAnalysisResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    !isStringArray(record.studyNames)
    || record.studyNames.length === 0
    || record.studyNames.some((studyName) => studyName.trim().length === 0)
  ) {
    return false
  }
  const studyCount = record.studyNames.length
  if (!isNumberTuple(record.ci) || record.ci[0] > record.ci[1]) {
    return false
  }
  if (
    !isFiniteNumberArrayOfLength(record.weights, studyCount)
    || !isFiniteNumberArrayOfLength(record.studyCiLower, studyCount)
    || !isFiniteNumberArrayOfLength(record.studyCiUpper, studyCount)
    || !isFiniteNumberArrayOfLength(record.effectSizes, studyCount)
  ) {
    return false
  }
  const studyCiLower = record.studyCiLower
  const studyCiUpper = record.studyCiUpper
  const effectSizes = record.effectSizes
  const weights = record.weights
  if (
    weights.some((weight) => weight < 0)
    || studyCiLower.some((lower, index) => lower > studyCiUpper[index])
    || effectSizes.some((effectSize, index) => (
      effectSize < studyCiLower[index] || effectSize > studyCiUpper[index]
    ))
  ) {
    return false
  }

  return (
    isFiniteNumber(record.pooledEffect)
    && record.pooledEffect >= record.ci[0]
    && record.pooledEffect <= record.ci[1]
    && isNonNegativeFiniteNumber(record.pooledSE)
    && isFiniteNumber(record.zValue)
    && isProbability(record.pValue)
    && isNonNegativeFiniteNumber(record.Q)
    && isProbability(record.QpValue)
    && isNonNegativeFiniteNumber(record.iSquared)
    && record.iSquared <= 100
    && isNonNegativeFiniteNumber(record.tauSquared)
    && typeof record.model === 'string'
    && record.model.trim().length > 0
  )
}

function isIccType(value: unknown): value is IccResult['iccType'] {
  return value === 'ICC1_1' || value === 'ICC2_1' || value === 'ICC3_1'
}

export function isIccResult(value: unknown): value is IccResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isNumberTuple(record.ci) || record.ci[0] > record.ci[1]) {
    return false
  }

  return (
    isFiniteNumber(record.icc)
    && record.icc >= -1
    && record.icc <= 1
    && record.icc >= record.ci[0]
    && record.icc <= record.ci[1]
    && record.ci[0] >= -1
    && record.ci[1] <= 1
    && isIccType(record.iccType)
    && isNonNegativeFiniteNumber(record.fValue)
    && isPositiveFiniteNumber(record.df1)
    && isPositiveFiniteNumber(record.df2)
    && isProbability(record.pValue)
    && isNonNegativeFiniteNumber(record.msRows)
    && isNonNegativeFiniteNumber(record.msCols)
    && isNonNegativeFiniteNumber(record.msError)
    && isPositiveInteger(record.nSubjects)
    && record.nSubjects >= 3
    && isPositiveInteger(record.nRaters)
    && record.nRaters >= 2
    && typeof record.interpretation === 'string'
  )
}

function isHwLocusResult(value: unknown): value is HwLocusResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.locus === 'string'
    && isNumberArrayOfLength(record.observedCounts, 3)
    && isNumberArrayOfLength(record.expectedCounts, 3)
    && isFiniteNumber(record.alleleFreqP)
    && isFiniteNumber(record.alleleFreqQ)
    && isFiniteNumber(record.chiSquare)
    && isFiniteNumber(record.pValue)
    && isFiniteNumber(record.exactPValue)
    && isFiniteNumber(record.degreesOfFreedom)
    && isBoolean(record.inEquilibrium)
    && isBoolean(record.isMonomorphic)
    && isFiniteNumber(record.nTotal)
    && isBoolean(record.lowExpectedWarning)
  )
}

export function isHardyWeinbergResult(value: unknown): value is HardyWeinbergResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    isFiniteNumber(record.alleleFreqP)
    && isFiniteNumber(record.alleleFreqQ)
    && isNumberArrayOfLength(record.observedCounts, 3)
    && isNumberArrayOfLength(record.expectedCounts, 3)
    && isFiniteNumber(record.chiSquare)
    && isFiniteNumber(record.pValue)
    && isFiniteNumber(record.exactPValue)
    && isFiniteNumber(record.degreesOfFreedom)
    && isBoolean(record.inEquilibrium)
    && isBoolean(record.isMonomorphic)
    && typeof record.interpretation === 'string'
    && isFiniteNumber(record.nTotal)
    && isBoolean(record.lowExpectedWarning)
    && (
      record.locusResults === null
      || (
        Array.isArray(record.locusResults)
        && record.locusResults.every(isHwLocusResult)
      )
    )
  )
}

export function isFstResult(value: unknown): value is FstResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (!isPositiveInteger(record.nPopulations)) {
    return false
  }
  if (!isStringArray(record.populationLabels) || record.populationLabels.length !== record.nPopulations) {
    return false
  }
  if (
    !isNumberMatrix(record.pairwiseFst)
    || record.pairwiseFst.length !== record.nPopulations
    || record.pairwiseFst.some((row) => row.length !== record.nPopulations)
  ) {
    return false
  }

  return (
    isFiniteNumber(record.globalFst)
    && typeof record.interpretation === 'string'
    && (record.nIndividuals === undefined || isFiniteNumber(record.nIndividuals))
    && (record.nLoci === undefined || isFiniteNumber(record.nLoci))
    && (record.permutationPValue === undefined || record.permutationPValue === null || isFiniteNumber(record.permutationPValue))
    && (record.nPermutations === undefined || isFiniteNumber(record.nPermutations))
    && (record.bootstrapCi === undefined || record.bootstrapCi === null || isNumberTuple(record.bootstrapCi))
    && (record.nBootstrap === undefined || isFiniteNumber(record.nBootstrap))
  )
}

export function buildFstSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: FstResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Fst'
  const lines = [`#### ${heading}`, '']
  lines.push(`- Global Fst: ${result.globalFst.toFixed(6)}`)
  lines.push(`- ${language === 'ko' ? '집단 수' : 'Population count'}: ${result.nPopulations}`)
  if (result.nIndividuals != null) {
    lines.push(`- ${language === 'ko' ? '개체 수' : 'Individual count'}: ${result.nIndividuals}`)
  }
  if (result.nLoci != null) {
    lines.push(`- ${language === 'ko' ? '유전자좌 수' : 'Locus count'}: ${result.nLoci}`)
  }
  if (result.permutationPValue != null) {
    lines.push(`- Permutation p-value: ${result.permutationPValue.toFixed(4)}`)
  }
  if (result.bootstrapCi != null) {
    lines.push(`- Bootstrap CI: [${result.bootstrapCi[0].toFixed(4)}, ${result.bootstrapCi[1].toFixed(4)}]`)
  }
  if (result.populationLabels.length > 0) {
    lines.push(`- ${language === 'ko' ? '집단 라벨' : 'Population labels'}: ${result.populationLabels.join(', ')}`)
  }

  const pairwiseLines: string[] = []
  for (let rowIndex = 0; rowIndex < result.pairwiseFst.length; rowIndex += 1) {
    const row = result.pairwiseFst[rowIndex]
    for (let colIndex = 0; colIndex < rowIndex; colIndex += 1) {
      const leftLabel = result.populationLabels[rowIndex] ?? `P${rowIndex + 1}`
      const rightLabel = result.populationLabels[colIndex] ?? `P${colIndex + 1}`
      const value = row?.[colIndex]
      if (isFiniteNumber(value)) {
        pairwiseLines.push(`  - ${leftLabel} vs ${rightLabel}: ${value.toFixed(4)}`)
      }
    }
  }

  if (pairwiseLines.length > 0) {
    lines.push(`- Pairwise Fst:`)
    lines.push(...pairwiseLines)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildHardyWeinbergSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: HardyWeinbergResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Hardy-Weinberg'
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? '대립유전자 빈도 p' : 'Allele frequency p'}: ${result.alleleFreqP.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '대립유전자 빈도 q' : 'Allele frequency q'}: ${result.alleleFreqQ.toFixed(4)}`)
  lines.push(`- Chi-square: ${result.chiSquare.toFixed(4)}`)
  lines.push(`- Chi-square p-value: ${result.pValue.toFixed(4)}`)
  lines.push(`- Exact p-value: ${result.exactPValue.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '표본 수' : 'Sample size'}: ${result.nTotal}`)
  lines.push(`- ${language === 'ko' ? '관측 유전자형 수' : 'Observed genotype counts'}: ${result.observedCounts.join(', ')}`)
  lines.push(`- ${language === 'ko' ? '기대 유전자형 수' : 'Expected genotype counts'}: ${result.expectedCounts.map((value) => value.toFixed(2)).join(', ')}`)
  if (result.lowExpectedWarning) {
    lines.push(`- ${language === 'ko' ? '주의' : 'Warning'}: ${language === 'ko' ? '일부 기대빈도가 5 미만입니다.' : 'Some expected counts are below 5.'}`)
  }

  const locusResults = result.locusResults ?? []
  if (locusResults.length > 0) {
    lines.push(`- ${language === 'ko' ? '유전자좌별 결과' : 'Locus-level results'}:`)
    for (const locus of locusResults) {
      lines.push(`  - ${locus.locus}: exact p=${locus.exactPValue.toFixed(4)}, N=${locus.nTotal}`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

function formatAlphaDiversityIndexLabel(index: string): string {
  return ALPHA_DIVERSITY_INDEX_LABELS[index] ?? index
}

export function buildAlphaDiversitySupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: AlphaDiversityResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Alpha Diversity'
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? '사이트 수' : 'Site count'}: ${result.siteCount}`)
  lines.push(`- ${language === 'ko' ? '종 수' : 'Species count'}: ${result.speciesNames.length}`)

  if (result.summaryTable.length > 0) {
    lines.push(`- ${language === 'ko' ? '지수 요약' : 'Index summary'}:`)
    for (const row of result.summaryTable) {
      const label = formatAlphaDiversityIndexLabel(row.index)
      lines.push(`  - ${label}: mean=${row.mean.toFixed(4)}, SD=${row.sd.toFixed(4)}, min=${row.min.toFixed(4)}, max=${row.max.toFixed(4)}`)
    }
  }

  if (result.siteResults.length > 0) {
    lines.push(`- ${language === 'ko' ? '사이트별 주요 지표' : 'Site-level metrics'}:`)
    for (const site of result.siteResults.slice(0, 5)) {
      lines.push(`  - ${site.siteName}: S=${site.speciesRichness}, N=${site.totalAbundance}, Shannon H'=${site.shannonH.toFixed(4)}, Simpson 1-D=${site.simpsonDiversity.toFixed(4)}`)
    }
    if (result.siteResults.length > 5) {
      lines.push(`  - ${language === 'ko' ? '나머지 사이트 수' : 'Additional sites'}: ${result.siteResults.length - 5}`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

export function buildLengthWeightSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: LengthWeightResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Length-Weight Relationship'
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? '관측치 수' : 'Observation count'}: ${result.nObservations}`)
  lines.push(`- ${language === 'ko' ? '관계식' : 'Equation'}: W = ${result.a.toExponential(4)} × L^${result.b.toFixed(4)}`)
  lines.push(`- a: ${result.a.toExponential(4)}`)
  lines.push(`- b: ${result.b.toFixed(4)}`)
  lines.push(`- b SE: ${result.bStdError.toFixed(4)}`)
  lines.push(`- log(a): ${result.logA.toFixed(4)}`)
  lines.push(`- R²: ${result.rSquared.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '등성장 검정' : 'Isometric test'}: t=${result.isometricTStat.toFixed(4)}, p=${result.isometricPValue.toFixed(4)}`)
  lines.push('')

  return lines.join('\n')
}

export function buildVbgfSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: VbgfResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'VBGF'
  const lines = [`#### ${heading}`, '']
  lines.push(`- L∞: ${result.lInf.toFixed(4)}`)
  lines.push(`- K: ${result.k.toFixed(4)}`)
  lines.push(`- t₀: ${result.t0.toFixed(4)}`)
  lines.push(`- R²: ${result.rSquared.toFixed(4)}`)
  if (result.aic != null) {
    lines.push(`- AIC: ${result.aic.toFixed(4)}`)
  }
  lines.push(`- ${language === 'ko' ? '관측치 수' : 'Observation count'}: ${result.nObservations}`)
  lines.push(`- ${language === 'ko' ? '예측값 수' : 'Predicted value count'}: ${result.predicted.length}`)
  lines.push(`- ${language === 'ko' ? '잔차 수' : 'Residual count'}: ${result.residuals.length}`)
  lines.push(`- ${language === 'ko' ? '파라미터 추정값' : 'Parameter estimates'}:`)
  for (const parameter of result.parameterTable) {
    const unitText = parameter.unit.trim().length > 0 ? ` ${parameter.unit}` : ''
    lines.push(`  - ${parameter.name}${unitText}: estimate=${parameter.estimate.toFixed(4)}, SE=${parameter.standardError.toFixed(4)}, CI=[${parameter.ciLower.toFixed(4)}, ${parameter.ciUpper.toFixed(4)}]`)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildPermanovaSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: PermanovaResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'PERMANOVA'
  const lines = [`#### ${heading}`, '']
  lines.push(`- Pseudo-F: ${result.pseudoF.toFixed(4)}`)
  lines.push(`- p-value: ${result.pValue.toFixed(4)}`)
  lines.push(`- R²: ${result.rSquared.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '순열 수' : 'Permutations'}: ${result.permutations}`)
  lines.push(`- SS ${language === 'ko' ? '(집단 간)' : '(between)'}: ${result.ssBetween.toFixed(4)}`)
  lines.push(`- SS ${language === 'ko' ? '(집단 내)' : '(within)'}: ${result.ssWithin.toFixed(4)}`)
  lines.push(`- SS ${language === 'ko' ? '(전체)' : '(total)'}: ${result.ssTotal.toFixed(4)}`)
  lines.push('')

  return lines.join('\n')
}

export function buildMantelSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: MantelResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Mantel Test'
  const lines = [`#### ${heading}`, '']
  lines.push(`- Mantel r: ${result.r.toFixed(4)}`)
  lines.push(`- p-value: ${result.pValue.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '순열 수' : 'Permutations'}: ${result.permutations}`)
  lines.push(`- ${language === 'ko' ? '방법' : 'Method'}: ${result.method}`)
  lines.push('')

  return lines.join('\n')
}

export function buildBetaDiversitySupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: BetaDiversityResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Beta Diversity'
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? '거리 지표' : 'Distance metric'}: ${result.metric}`)
  lines.push(`- ${language === 'ko' ? '사이트 수' : 'Site count'}: ${result.siteLabels.length}`)
  lines.push(`- ${language === 'ko' ? '사이트 라벨' : 'Site labels'}: ${result.siteLabels.join(', ')}`)

  const pairwiseLines: string[] = []
  for (let rowIndex = 0; rowIndex < result.distanceMatrix.length; rowIndex += 1) {
    const row = result.distanceMatrix[rowIndex]
    for (let colIndex = 0; colIndex < rowIndex; colIndex += 1) {
      const leftLabel = result.siteLabels[rowIndex] ?? `Site ${rowIndex + 1}`
      const rightLabel = result.siteLabels[colIndex] ?? `Site ${colIndex + 1}`
      const value = row?.[colIndex]
      if (isFiniteNumber(value)) {
        pairwiseLines.push(`  - ${leftLabel} vs ${rightLabel}: ${value.toFixed(4)}`)
      }
    }
  }

  if (pairwiseLines.length > 0) {
    lines.push(`- ${language === 'ko' ? '쌍별 거리' : 'Pairwise distances'}:`)
    lines.push(...pairwiseLines.slice(0, 20))
    if (pairwiseLines.length > 20) {
      lines.push(`  - ${language === 'ko' ? '나머지 쌍 수' : 'Additional pairs'}: ${pairwiseLines.length - 20}`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

export function buildNmdsSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: NmdsResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'NMDS'
  const lines = [`#### ${heading}`, '']
  const dimensionCount = result.coordinates[0]?.length ?? 0
  lines.push(`- Stress: ${result.stress.toFixed(6)}`)
  lines.push(`- ${language === 'ko' ? '차원 수' : 'Dimension count'}: ${dimensionCount}`)
  lines.push(`- ${language === 'ko' ? '지점 수' : 'Site count'}: ${result.siteLabels.length}`)
  if (result.groups) {
    const uniqueGroups = Array.from(new Set(result.groups))
    lines.push(`- ${language === 'ko' ? '그룹 수' : 'Group count'}: ${uniqueGroups.length}`)
  }
  lines.push(`- ${language === 'ko' ? '좌표' : 'Coordinates'}:`)
  for (let index = 0; index < result.coordinates.length && index < 10; index += 1) {
    const coordinates = result.coordinates[index]
    const coordinateText = coordinates.map((coordinate) => coordinate.toFixed(4)).join(', ')
    const groupText = result.groups ? `, group=${result.groups[index]}` : ''
    lines.push(`  - ${result.siteLabels[index]}: [${coordinateText}]${groupText}`)
  }
  if (result.coordinates.length > 10) {
    lines.push(`  - ${language === 'ko' ? '나머지 지점 수' : 'Additional sites'}: ${result.coordinates.length - 10}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildRarefactionSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: RarefactionResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Rarefaction'
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? '곡선 수' : 'Curve count'}: ${result.curves.length}`)
  lines.push(`- ${language === 'ko' ? '사이트 라벨' : 'Site labels'}: ${result.curves.map((curve) => curve.siteName).join(', ')}`)
  lines.push(`- ${language === 'ko' ? '곡선별 최종 값' : 'Final curve values'}:`)
  for (const curve of result.curves.slice(0, 10)) {
    const lastStep = curve.steps[curve.steps.length - 1]
    const lastExpectedSpecies = curve.expectedSpecies[curve.expectedSpecies.length - 1]
    lines.push(`  - ${curve.siteName}: n=${lastStep}, expected species=${lastExpectedSpecies.toFixed(4)}, points=${curve.steps.length}`)
  }
  if (result.curves.length > 10) {
    lines.push(`  - ${language === 'ko' ? '나머지 곡선 수' : 'Additional curves'}: ${result.curves.length - 10}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildConditionFactorSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: ConditionFactorResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || "Fulton's Condition Factor"
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? '표본 수' : 'Sample size'}: ${result.n}`)
  lines.push(`- ${language === 'ko' ? '평균 K' : 'Mean K'}: ${result.mean.toFixed(4)}`)
  lines.push(`- SD: ${result.std.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '중앙값' : 'Median'}: ${result.median.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '범위' : 'Range'}: ${result.min.toFixed(4)} - ${result.max.toFixed(4)}`)

  const groupStats = result.groupStats ? Object.entries(result.groupStats) : []
  if (groupStats.length > 0) {
    lines.push(`- ${language === 'ko' ? '그룹별 기술통계' : 'Group descriptive statistics'}:`)
    for (const [groupName, stats] of groupStats) {
      lines.push(`  - ${groupName}: mean=${stats.mean.toFixed(4)}, SD=${stats.std.toFixed(4)}, median=${stats.median.toFixed(4)}, N=${stats.n}`)
    }
  }

  if (result.comparison) {
    const statisticLabel = result.comparison.test === 't-test' ? 't' : 'F'
    const dfText = result.comparison.df2 != null
      ? `${result.comparison.df}, ${result.comparison.df2}`
      : `${result.comparison.df}`
    lines.push(`- ${language === 'ko' ? '그룹 비교 검정' : 'Group comparison test'}: ${result.comparison.test}, ${statisticLabel}=${result.comparison.statistic.toFixed(4)}, p=${result.comparison.pValue.toFixed(4)}, df=${dfText}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildRocAucSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: RocAucResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'ROC-AUC'
  const lines = [`#### ${heading}`, '']
  lines.push(`- AUC: ${result.auc.toFixed(4)}`)
  lines.push(`- AUC CI: [${result.aucCI.lower.toFixed(4)}, ${result.aucCI.upper.toFixed(4)}]`)
  lines.push(`- ${language === 'ko' ? '임계값' : 'Threshold'}: ${result.optimalThreshold.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '민감도' : 'Sensitivity'}: ${result.sensitivity.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '특이도' : 'Specificity'}: ${result.specificity.toFixed(4)}`)
  lines.push(`- ROC points: ${result.rocPoints.length}`)
  lines.push('')

  return lines.join('\n')
}

export function buildSurvivalSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: SurvivalResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Survival Analysis'
  const lines = [`#### ${heading}`, '']
  const curveEntries = Object.entries(result.curves)
  lines.push(`- ${language === 'ko' ? '곡선 수' : 'Curve count'}: ${curveEntries.length}`)
  if (result.logRankP != null) {
    lines.push(`- Log-rank p-value: ${result.logRankP.toFixed(4)}`)
  }
  if (result.medianSurvivalTime != null) {
    lines.push(`- ${language === 'ko' ? '대표 중앙 생존 시간' : 'Representative median survival time'}: ${result.medianSurvivalTime.toFixed(4)}`)
  }
  lines.push(`- ${language === 'ko' ? '그룹별 요약' : 'Group summaries'}:`)
  for (const [groupName, curve] of curveEntries) {
    const medianText = curve.medianSurvival != null ? curve.medianSurvival.toFixed(4) : 'NA'
    lines.push(`  - ${groupName}: N=${curve.atRisk[0]}, events=${curve.nEvents}, censored=${curve.censored.length}, median=${medianText}, points=${curve.time.length}`)
  }

  lines.push(`- ${language === 'ko' ? '곡선 endpoint' : 'Curve endpoints'}:`)
  for (const [groupName, curve] of curveEntries) {
    const lastIndex = curve.time.length - 1
    lines.push(`  - ${groupName}: time=${curve.time[lastIndex].toFixed(4)}, survival=${curve.survival[lastIndex].toFixed(4)}, CI=[${curve.ciLo[lastIndex].toFixed(4)}, ${curve.ciHi[lastIndex].toFixed(4)}], atRisk=${curve.atRisk[lastIndex]}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildMetaAnalysisSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: MetaAnalysisResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'Meta-Analysis'
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? '연구 수' : 'Study count'}: ${result.studyNames.length}`)
  lines.push(`- ${language === 'ko' ? '모델' : 'Model'}: ${result.model}`)
  lines.push(`- Pooled effect: ${result.pooledEffect.toFixed(4)}`)
  lines.push(`- Pooled SE: ${result.pooledSE.toFixed(4)}`)
  lines.push(`- CI: [${result.ci[0].toFixed(4)}, ${result.ci[1].toFixed(4)}]`)
  lines.push(`- z: ${result.zValue.toFixed(4)}`)
  lines.push(`- p-value: ${result.pValue.toFixed(4)}`)
  lines.push(`- Q: ${result.Q.toFixed(4)}`)
  lines.push(`- Q p-value: ${result.QpValue.toFixed(4)}`)
  lines.push(`- I²: ${result.iSquared.toFixed(4)}`)
  lines.push(`- τ²: ${result.tauSquared.toFixed(4)}`)

  lines.push(`- ${language === 'ko' ? '개별 연구 수치' : 'Study-level values'}:`)
  for (let index = 0; index < result.studyNames.length && index < 10; index += 1) {
    lines.push(`  - ${result.studyNames[index]}: effect=${result.effectSizes[index].toFixed(4)}, CI=[${result.studyCiLower[index].toFixed(4)}, ${result.studyCiUpper[index].toFixed(4)}], weight=${result.weights[index].toFixed(4)}`)
  }
  if (result.studyNames.length > 10) {
    lines.push(`  - ${language === 'ko' ? '나머지 연구 수' : 'Additional studies'}: ${result.studyNames.length - 10}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function buildIccSupplementaryMarkdown(
  entry: BioToolHistoryEntry,
  result: IccResult,
  language: 'ko' | 'en',
): string {
  const heading = entry.toolNameKo || entry.toolNameEn || 'ICC'
  const lines = [`#### ${heading}`, '']
  lines.push(`- ${language === 'ko' ? 'ICC 유형' : 'ICC type'}: ${result.iccType}`)
  lines.push(`- ICC: ${result.icc.toFixed(4)}`)
  lines.push(`- CI: [${result.ci[0].toFixed(4)}, ${result.ci[1].toFixed(4)}]`)
  lines.push(`- F: ${result.fValue.toFixed(4)}`)
  lines.push(`- df: ${result.df1.toFixed(4)}, ${result.df2.toFixed(4)}`)
  lines.push(`- p-value: ${result.pValue.toFixed(4)}`)
  lines.push(`- ${language === 'ko' ? '대상 수' : 'Subject count'}: ${result.nSubjects}`)
  lines.push(`- ${language === 'ko' ? '평가자 수' : 'Rater count'}: ${result.nRaters}`)
  lines.push(`- MS rows: ${result.msRows.toFixed(4)}`)
  lines.push(`- MS cols: ${result.msCols.toFixed(4)}`)
  lines.push(`- MS error: ${result.msError.toFixed(4)}`)
  lines.push('')

  return lines.join('\n')
}