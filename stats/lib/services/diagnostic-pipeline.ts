/**
 * Diagnostic Pipeline — Hub 채팅 진단 오케스트레이터
 *
 * 데이터 + 분석 요청 시 기초통계/변수탐지/가정검정을 순차 실행하여
 * DiagnosticReport를 구성한다.
 *
 * 단계:
 *   1. 기초통계 추출 (validationResults 가공)
 *   2. LLM 변수 탐지 (경량 1차 호출)
 *   3. 가정 검정 (Worker 3 or Worker 1 — 모든 그룹 보존)
 *   4. DiagnosticReport 조합
 *
 * 기존 runAssumptionTests()를 수정하지 않고,
 * Worker 결과를 DiagnosticAssumptions로 직접 매핑하여 3+그룹을 보존.
 */

import type {
  AIRecommendation,
  DataRow,
  ValidationResults,
  ColumnStatistics,
  DiagnosticAssumptions,
  DiagnosticReport,
  StatisticalAssumptions,
} from '@/types/analysis'
import type { WorkerNumber } from '@/lib/constants/methods-registry.types'
import type { WorkerMethodParam } from '@/lib/services/pyodide/core/pyodide-core.service'
import { openRouterRecommender } from './recommenders/openrouter-recommender'
import { getSystemPromptVariableDetector } from './ai/prompts'
import { buildDataContextMarkdown } from './ai/data-context-builder'
import { extractGroupedNumericData } from '@/lib/utils/grouped-data'
import { raceWithTimeout } from '@/lib/utils/promise-utils'
import { logger } from '@/lib/utils/logger'
import { MIN_GROUP_SIZE, resolveGroupVariable } from '@/lib/constants/statistical-constants'
import type { TestAssumptionsWorkerResult, NormalityWorkerResult } from '@/lib/services/pyodide/worker-result-types'

// ===== Types =====

export interface DiagnosticPipelineInput {
  userMessage: string
  data: readonly DataRow[]
  validationResults: ValidationResults
  /** analysis-store의 uploadNonce (데이터 버전 식별) */
  uploadNonce: number
}

/** 상태 콜백: Pipeline 진행 단계를 UI에 알림 */
export type DiagnosticStatusCallback = (status: string) => void

// ===== Constants =====

const WORKER_TIMEOUT_MS = 10_000

// ===== Main Functions =====

/**
 * 전체 Diagnostic Pipeline 실행.
 *
 * @param input - 사용자 메시지 + 데이터 + 검증 결과
 * @param onStatus - 진행 상태 콜백 (UI 표시용)
 * @returns DiagnosticReport
 */
export async function runDiagnosticPipeline(
  input: DiagnosticPipelineInput,
  onStatus?: DiagnosticStatusCallback,
): Promise<DiagnosticReport> {
  const { userMessage, data, validationResults, uploadNonce } = input

  // ── 1. 기초통계 추출 (동기) ──
  onStatus?.('데이터 진단 중...')
  const basicStats = extractBasicStats(validationResults)

  // ── 2. LLM 변수 탐지 + Pyodide pre-warm 병렬 ──
  // Pyodide 초기화(~2s cold)는 LLM 호출(~1-3s)과 독립이므로 동시 시작
  onStatus?.('변수 역할 분석 중...')
  // fire-and-forget: Pyodide 모듈 로드를 LLM 호출과 병렬로 시작 (cold start ~2s 절감)
  void import('@/lib/services/pyodide/core/pyodide-core.service')
    .then(m => { const p = m.PyodideCoreService.getInstance(); if (!p.isInitialized()) return p.initialize().then(() => p); return p })
    .catch(() => null)

  const detectionResult = await detectVariables(userMessage, validationResults)

  // 완전 미탐지 또는 부분 탐지 (필수 역할 부족) → 추가 질문
  if (detectionResult.clarificationNeeded) {
    return {
      uploadNonce,
      basicStats,
      assumptions: null,
      variableAssignments: detectionResult.variableAssignments, // 부분 탐지 결과 보존
      pendingClarification: buildPendingClarification(
        detectionResult.clarificationNeeded,
        detectionResult.variableAssignments,
        validationResults,
      ),
    }
  }

  // ── 3. 가정 검정 (pre-warm된 Pyodide 사용) ──
  onStatus?.('가정 검정 실행 중...')
  const assumptions = await runDiagnosticAssumptions(
    detectionResult.variableAssignments!,
    data,
    validationResults,
  )

  // ── 4. DiagnosticReport 조합 ──
  return {
    uploadNonce,
    basicStats,
    assumptions,
    variableAssignments: detectionResult.variableAssignments!,
    pendingClarification: null,
  }
}

/**
 * pendingClarification에 대한 사용자 답변으로 파이프라인 재개.
 *
 * 기존 report의 basicStats를 재사용하고, 변수 탐지 + 가정 검정만 재실행.
 */
export async function resumeDiagnosticPipeline(
  previousReport: DiagnosticReport,
  userAnswer: string,
  data: readonly DataRow[],
  validationResults: ValidationResults,
  onStatus?: DiagnosticStatusCallback,
): Promise<DiagnosticReport> {
  onStatus?.('답변 분석 중...')

  // 사용자 답변에서 변수명 매칭
  const newAssignments = resolveVariableFromAnswer(
    userAnswer,
    previousReport.pendingClarification,
    validationResults,
  )

  if (!newAssignments) {
    return {
      ...previousReport,
      pendingClarification: buildPendingClarification(
        '죄송합니다. 변수명을 정확히 파악하지 못했어요. 아래 목록에서 선택해 주세요.',
        previousReport.variableAssignments,
        validationResults,
      ),
    }
  }

  // 기존 부분 탐지 결과와 병합 (기존 + 새 답변)
  const merged = mergeVariableAssignments(previousReport.variableAssignments, newAssignments)

  // 병합 후 필수 역할 검증
  const hasDep = (merged.dependent?.length ?? 0) > 0
  if (!hasDep) {
    return {
      ...previousReport,
      variableAssignments: merged,
      pendingClarification: buildPendingClarification(
        '비교할 측정값(종속변수)을 알려주세요.',
        merged,
        validationResults,
      ),
    }
  }

  onStatus?.('가정 검정 실행 중...')
  const assumptions = await runDiagnosticAssumptions(
    merged,
    data,
    validationResults,
  )

  return {
    ...previousReport,
    assumptions,
    variableAssignments: merged,
    pendingClarification: null,
  }
}

// ===== DiagnosticAssumptions → StatisticalAssumptions 변환 =====

/**
 * DiagnosticAssumptions → StatisticalAssumptions 변환.
 *
 * Step 4 실행에서 기존 타입이 필요할 때 사용.
 * 3+그룹은 첫 2그룹만 group1/group2에 매핑하고, 전체 passed는 min(p)로 판정.
 */
export function toStatisticalAssumptions(da: DiagnosticAssumptions): StatisticalAssumptions {
  const groups = da.normality.groups
  if (groups.length === 0) {
    return { normality: undefined, homogeneity: undefined }
  }
  const pValues = groups.map(g => g.pValue)
  const minPValue = Math.min(...pValues)

  const result: StatisticalAssumptions = {
    normality: {
      shapiroWilk: {
        statistic: groups[0]?.statistic,
        pValue: minPValue,
        isNormal: da.normality.overallPassed,
      },
      ...(groups[0] && {
        group1: {
          statistic: groups[0].statistic,
          pValue: groups[0].pValue,
          isNormal: groups[0].passed,
          interpretation: groups[0].groupName,
        },
      }),
      ...(groups[1] && {
        group2: {
          statistic: groups[1].statistic,
          pValue: groups[1].pValue,
          isNormal: groups[1].passed,
          interpretation: groups[1].groupName,
        },
      }),
    },
    homogeneity: da.homogeneity
      ? {
          levene: {
            statistic: da.homogeneity.levene.statistic,
            pValue: da.homogeneity.levene.pValue,
            equalVariance: da.homogeneity.levene.equalVariance,
          },
        }
      : undefined,
  }

  return result
}

// ===== Internal: 기초통계 추출 =====

/** @internal 테스트용 export */
export function extractBasicStats(vr: ValidationResults): DiagnosticReport['basicStats'] {
  const columns = vr.columns ?? []

  const numericSummaries = columns
    .filter((c): c is ColumnStatistics & { type: 'numeric' } => c.type === 'numeric')
    .map(c => ({
      column: c.name,
      mean: c.mean ?? 0,
      std: c.std ?? 0,
      min: c.min ?? 0,
      max: c.max ?? 0,
    }))

  // 그룹 정보: 범주형 변수 중 고유값이 2~30인 것 (그룹 변수 후보)
  const categoricalCols = columns.filter(c => c.type === 'categorical')
  const groupCandidates = categoricalCols
    .filter(c => c.uniqueValues != null && c.uniqueValues >= 2 && c.uniqueValues <= 30)
  const groups = groupCandidates.length > 0
    ? groupCandidates[0].topCategories?.map(tc => ({ name: String(tc.value), count: tc.count }))
    : undefined

  // 컬럼별 정규성 (enrichment 완료된 경우)
  const columnNormality = columns
    .filter(c => c.normality != null)
    .map(c => ({
      column: c.name,
      pValue: c.normality!.pValue,
      passed: c.normality!.isNormal,
    }))

  return {
    totalRows: vr.totalRows ?? 0,
    groups,
    numericSummaries,
    ...(columnNormality.length > 0 && { columnNormality }),
  }
}

// ===== Internal: LLM 변수 탐지 =====

interface VariableDetectionResult {
  variableAssignments: AIRecommendation['variableAssignments'] | null
  clarificationNeeded: string | null
}

async function detectVariables(
  userMessage: string,
  validationResults: ValidationResults,
): Promise<VariableDetectionResult> {
  const systemPrompt = getSystemPromptVariableDetector()
  const dataContext = buildDataContextMarkdown(validationResults)
  const userPrompt = `${dataContext}\n\n## 사용자 요청\n${userMessage}`

  try {
    const rawResponse = await openRouterRecommender.generateRawText(
      systemPrompt,
      userPrompt,
      { temperature: 0.1, maxTokens: 500 },
    )

    if (!rawResponse) {
      return { variableAssignments: null, clarificationNeeded: '변수 역할을 자동으로 탐지하지 못했습니다.' }
    }

    return parseVariableDetectionResponse(rawResponse, validationResults)
  } catch (error) {
    logger.error('[DiagnosticPipeline] Variable detection failed', { error })
    return { variableAssignments: null, clarificationNeeded: 'AI 변수 탐지 중 오류가 발생했습니다. 아래에서 직접 선택해 주세요.' }
  }
}

/** @internal 테스트용 export */
export function parseVariableDetectionResponse(
  raw: string,
  validationResults: ValidationResults,
): VariableDetectionResult {
  // JSON 블록 추출
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) ?? raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { variableAssignments: null, clarificationNeeded: null }
  }

  try {
    const jsonStr = jsonMatch[1] ?? jsonMatch[0]
    const parsed = JSON.parse(jsonStr) as {
      variableAssignments?: AIRecommendation['variableAssignments']
      clarificationNeeded?: string | null
    }

    if (parsed.clarificationNeeded) {
      return { variableAssignments: null, clarificationNeeded: parsed.clarificationNeeded }
    }

    if (!parsed.variableAssignments) {
      return { variableAssignments: null, clarificationNeeded: null }
    }

    // 컬럼명 존재 여부 검증 (hallucination 방지)
    const columnNames = new Set((validationResults.columns ?? []).map(c => c.name))
    const va = parsed.variableAssignments
    const validated: AIRecommendation['variableAssignments'] = {}

    for (const [role, cols] of Object.entries(va)) {
      if (!Array.isArray(cols)) continue
      const validCols = cols.filter(c => columnNames.has(c))
      if (validCols.length > 0) {
        (validated as Record<string, string[]>)[role] = validCols
      }
    }

    const hasAnyRole = Object.values(validated).some(v => Array.isArray(v) && v.length > 0)
    if (!hasAnyRole) {
      return { variableAssignments: null, clarificationNeeded: '데이터에서 해당 변수를 찾지 못했습니다.' }
    }

    // 필수 역할 검증: dependent가 없으면 부분 탐지 → 추가 질문 필요
    const hasDep = (validated.dependent?.length ?? 0) > 0
    const hasGroup = (validated.factor?.length ?? 0) > 0
      || (validated.independent?.length ?? 0) > 0
      || (validated.between?.length ?? 0) > 0

    if (!hasDep) {
      // factor만 잡힌 경우 → dependent를 추가로 질문
      return {
        variableAssignments: validated,
        clarificationNeeded: hasGroup
          ? '그룹 변수는 감지했지만, 비교할 측정값(종속변수)을 알려주세요.'
          : '어떤 변수를 분석할지 알려주세요.',
      }
    }

    return { variableAssignments: validated, clarificationNeeded: null }
  } catch {
    return { variableAssignments: null, clarificationNeeded: null }
  }
}

// ===== Internal: pendingClarification 구성 =====

/** 기본 필수 역할: LLM이 아무것도 감지하지 못했을 때 사용 */
const DEFAULT_REQUIRED_ROLES = ['dependent', 'factor'] as const
type VariableRole = DiagnosticReport['pendingClarification'] extends { missingRoles: Array<infer R> } | null ? R : string

/** @internal 테스트용 export */
export function buildPendingClarification(
  question: string,
  partialAssignments: AIRecommendation['variableAssignments'] | null,
  validationResults: ValidationResults,
): DiagnosticReport['pendingClarification'] {
  const columns = validationResults.columns ?? []

  // 이미 감지된 역할을 제외하고 누락된 역할만 계산
  const detectedRoles = new Set(
    Object.entries(partialAssignments ?? {})
      .filter(([, cols]) => Array.isArray(cols) && cols.length > 0)
      .map(([role]) => role)
  )
  const missingRoles = (DEFAULT_REQUIRED_ROLES.filter(r => !detectedRoles.has(r)) as VariableRole[])

  const candidateColumns = columns
    .filter(c => !c.idDetection?.isId)
    .slice(0, 15)
    .map(c => ({
      column: c.name,
      type: (c.type === 'numeric' ? 'numeric' : 'categorical') as 'numeric' | 'categorical',
      uniqueValues: c.uniqueValues,
      ...(c.type === 'categorical' && c.topCategories && {
        sampleGroups: c.topCategories.slice(0, 5).map(tc => String(tc.value)),
      }),
    }))

  return {
    question,
    missingRoles: missingRoles.length > 0 ? missingRoles : [...DEFAULT_REQUIRED_ROLES] as VariableRole[],
    candidateColumns,
  }
}

// ===== Internal: 변수 배정 병합 =====

/** @internal 기존 부분 탐지 + 새 답변 결과를 병합. 새 답변이 기존 역할을 덮어쓰지 않음. */
export function mergeVariableAssignments(
  existing: AIRecommendation['variableAssignments'] | null,
  incoming: NonNullable<AIRecommendation['variableAssignments']>,
): NonNullable<AIRecommendation['variableAssignments']> {
  const merged: Record<string, string[]> = {}

  // 기존 역할 복사
  if (existing) {
    for (const [role, cols] of Object.entries(existing)) {
      if (Array.isArray(cols) && cols.length > 0) {
        merged[role] = [...cols]
      }
    }
  }

  // 새 역할 추가 (기존에 없는 역할만)
  for (const [role, cols] of Object.entries(incoming)) {
    if (Array.isArray(cols) && cols.length > 0 && !merged[role]) {
      merged[role] = [...cols]
    }
  }

  return merged as NonNullable<AIRecommendation['variableAssignments']>
}

// ===== Internal: resume 시 변수명 매칭 =====

/**
 * @internal resume 시 사용자 답변에서 변수명 매칭.
 *
 * candidateColumns(최대 15개)뿐 아니라 validationResults의 전체 컬럼에서도
 * 매칭을 시도하여, 넓은 스키마에서 15번째 이후 컬럼도 찾을 수 있다.
 */
export function resolveVariableFromAnswer(
  userAnswer: string,
  pending: DiagnosticReport['pendingClarification'],
  validationResults?: ValidationResults,
): AIRecommendation['variableAssignments'] | null {
  if (!pending) return null

  const answer = userAnswer.trim()

  // 후보 = pendingClarification.candidateColumns + 전체 컬럼 (중복 제거)
  const candidateSet = new Map<string, 'numeric' | 'categorical'>()
  for (const c of pending.candidateColumns) {
    candidateSet.set(c.column, c.type)
  }
  // 전체 컬럼에서 candidateColumns에 없는 것 추가 (15개 제한 우회)
  if (validationResults?.columns) {
    for (const c of validationResults.columns) {
      if (!candidateSet.has(c.name) && !c.idDetection?.isId) {
        candidateSet.set(c.name, c.type === 'numeric' ? 'numeric' : 'categorical')
      }
    }
  }

  // 정확 매칭: 컬럼명 전체가 답변에 포함
  // 한국어 조사(을/를/로/별/이/가/은/는/의/에서 등)도 허용
  const KO_PARTICLE = '(?:[을를로별이가은는의에서와과도만까지부터]|으로)?'
  const matched: Array<{ column: string; type: 'numeric' | 'categorical' }> = []
  for (const [colName, colType] of candidateSet) {
    const escaped = colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(?:^|[\\s,."'()\\[\\]])${escaped}${KO_PARTICLE}(?:$|[\\s,."'()\\[\\]])`, 'i')
    if (pattern.test(` ${answer} `) || answer === colName) {
      matched.push({ column: colName, type: colType })
    }
  }

  if (matched.length === 0) return null

  const result: AIRecommendation['variableAssignments'] = {}
  for (const col of matched) {
    if (col.type === 'categorical') {
      if (!result.factor) result.factor = []
      result.factor.push(col.column)
    } else {
      if (!result.dependent) result.dependent = []
      result.dependent.push(col.column)
    }
  }
  return result
}

// ===== Internal: 가정 검정 (Worker 직접 매핑) =====

async function runDiagnosticAssumptions(
  variableAssignments: AIRecommendation['variableAssignments'],
  data: readonly DataRow[],
  validationResults: ValidationResults,
): Promise<DiagnosticAssumptions | null> {
  if (!variableAssignments || data.length < MIN_GROUP_SIZE) return null

  try {
    const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
    const pyodide = PyodideCoreService.getInstance()

    if (!pyodide.isInitialized()) {
      try {
        await pyodide.initialize()
      } catch {
        logger.warn('[DiagnosticPipeline] Pyodide initialization failed, skipping assumptions')
        return null
      }
    }

    // 그룹 변수 결정: factor > independent > between
    const groupVarName = resolveGroupVariable(variableAssignments)

    const dependentVarName = variableAssignments.dependent?.[0]
    if (!dependentVarName) return null

    const depColumn = validationResults.columns?.find(c => c.name === dependentVarName)
    if (!depColumn || depColumn.type !== 'numeric') return null

    if (groupVarName) {
      return await runGroupedDiagnostic(pyodide, data, dependentVarName, groupVarName)
    }
    return await runSingleDiagnostic(pyodide, data, dependentVarName)
  } catch (error) {
    logger.error('[DiagnosticPipeline] Assumption testing failed', { error })
    return null
  }
}

async function runGroupedDiagnostic(
  pyodide: { callWorkerMethod: <T>(worker: WorkerNumber, method: string, params: Record<string, WorkerMethodParam>) => Promise<T> },
  data: readonly DataRow[],
  dependentVar: string,
  groupVar: string,
): Promise<DiagnosticAssumptions | null> {
  const groupMap = extractGroupedNumericData(data, dependentVar, groupVar)
  const entries = [...groupMap.entries()]
  const validEntries = entries.filter(([, values]) => values.length >= MIN_GROUP_SIZE)

  if (validEntries.length < 2) return null

  const validGroups = validEntries.map(([, values]) => values)
  const validKeys = validEntries.map(([key]) => key)

  const result = await raceWithTimeout(
    pyodide.callWorkerMethod<TestAssumptionsWorkerResult>(3, 'test_assumptions', { groups: validGroups }),
    WORKER_TIMEOUT_MS,
    'Diagnostic assumption test timeout',
  )

  // Worker 결과를 DiagnosticAssumptions로 직접 매핑 — 모든 그룹 보존
  const groups = result.normality.shapiroWilk.map((sw, i) => ({
    groupName: validKeys[i] ?? `Group ${i + 1}`,
    statistic: sw.statistic ?? 0,
    pValue: sw.pValue ?? 1,
    passed: sw.passed ?? false,
  }))

  return {
    normality: {
      groups,
      overallPassed: result.normality.passed,
      testMethod: 'shapiro-wilk',
    },
    homogeneity: {
      levene: {
        statistic: result.homogeneity.levene.statistic,
        pValue: result.homogeneity.levene.pValue,
        equalVariance: result.homogeneity.passed,
      },
    },
  }
}

async function runSingleDiagnostic(
  pyodide: { callWorkerMethod: <T>(worker: WorkerNumber, method: string, params: Record<string, WorkerMethodParam>) => Promise<T> },
  data: readonly DataRow[],
  dependentVar: string,
): Promise<DiagnosticAssumptions | null> {
  const values: number[] = []
  for (const row of data) {
    const val = row[dependentVar]
    if (val === null || val === undefined || val === '') continue
    const num = typeof val === 'number' ? val : Number(val)
    if (!Number.isNaN(num) && Number.isFinite(num)) values.push(num)
  }

  if (values.length < MIN_GROUP_SIZE) return null

  const result = await raceWithTimeout(
    pyodide.callWorkerMethod<NormalityWorkerResult>(1, 'normality_test', { data: values, alpha: 0.05 }),
    WORKER_TIMEOUT_MS,
    'Diagnostic normality test timeout',
  )

  return {
    normality: {
      groups: [{
        groupName: '전체',
        statistic: result.statistic,
        pValue: result.pValue,
        passed: result.isNormal,
      }],
      overallPassed: result.isNormal,
      testMethod: 'shapiro-wilk',
    },
    homogeneity: null,
  }
}
