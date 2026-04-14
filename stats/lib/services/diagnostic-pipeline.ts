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

import { extractJsonFromLlmResponse } from '@/lib/utils/json-extraction'
import type {
  AIRecommendation,
  DataRow,
  ValidationResults,
  ColumnStatistics,
  DiagnosticAssumptions,
  DiagnosticReport,
  MethodRecommendation,
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
import { ensurePyodideReady } from '@/lib/services/pyodide/ensure-pyodide-ready'
import type { TestAssumptionsWorkerResult, NormalityWorkerResult } from '@/lib/services/pyodide/worker-result-types'
import { STATISTICAL_METHODS, getKoreanName } from '@/lib/constants/statistical-methods'

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
  onStatus?.('데이터 살펴보는 중...')
  const basicStats = extractBasicStats(validationResults)

  // ── 2. LLM 변수 탐지 + Pyodide pre-warm 병렬 ──
  // Pyodide 초기화(~2s cold)는 LLM 호출(~1-3s)과 독립이므로 동시 시작
  onStatus?.('변수 역할 파악 중...')
  // fire-and-forget: Pyodide 초기화를 LLM 호출과 병렬로 시작 (cold start ~2s 절감)
  void ensurePyodideReady('DiagnosticPipeline pre-warm')

  const detectionResult = await detectVariables(userMessage, validationResults)

  // 완전 미탐지 또는 부분 탐지 (필수 역할 부족) → 추가 질문
  if (detectionResult.clarificationNeeded) {
    return {
      originUserMessage: userMessage,
      uploadNonce,
      basicStats,
      assumptions: null,
      variableAssignments: detectionResult.variableAssignments, // 부분 탐지 결과 보존
      pendingClarification: buildPendingClarification(
        detectionResult.clarificationNeeded,
        detectionResult.variableAssignments,
        validationResults,
        userMessage,
      ),
    }
  }

  // ── 3. 가정 검정 (pre-warm된 Pyodide 사용) ──
  onStatus?.('데이터 특성 확인 중...')
  const assumptions = await runDiagnosticAssumptions(
    detectionResult.variableAssignments!,
    data,
    validationResults,
  )

  // ── 4. DiagnosticReport 조합 ──
  return {
    originUserMessage: userMessage,
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
  directAssignments?: NonNullable<AIRecommendation['variableAssignments']>,
): Promise<DiagnosticReport> {
  onStatus?.('선택하신 변수 확인 중...')

  // 직접 할당이 있으면 사용, 아니면 타이핑 응답 기반 매칭 (fallback)
  const newAssignments = directAssignments ?? resolveVariableFromAnswer(
    userAnswer,
    previousReport.pendingClarification,
    validationResults,
  )

  if (!newAssignments) {
    return {
      ...previousReport,
      originUserMessage: previousReport.originUserMessage ?? userAnswer,
      pendingClarification: buildPendingClarification(
        '어떤 값을 비교하고 싶으신가요?',
        previousReport.variableAssignments,
        validationResults,
        previousReport.originUserMessage ?? userAnswer,
      ),
    }
  }

  // 기존 부분 탐지 결과와 병합 (기존 + 새 답변)
  const merged = mergeVariableAssignments(previousReport.variableAssignments, newAssignments)

  // 병합 후 필수 역할 검증: dependent + group 변수 모두 필요
  const hasDep = (merged.dependent?.length ?? 0) > 0
  const hasGroup = (merged.factor?.length ?? 0) > 0
    || (merged.independent?.length ?? 0) > 0
    || (merged.between?.length ?? 0) > 0

  if (!hasDep || !hasGroup) {
    const question = !hasDep
      ? '비교할 값을 선택해 주세요.'
      : '어떤 기준으로 비교할까요?'
    return {
      ...previousReport,
      originUserMessage: previousReport.originUserMessage ?? userAnswer,
      variableAssignments: merged,
      pendingClarification: buildPendingClarification(
        question,
        merged,
        validationResults,
        previousReport.originUserMessage ?? userAnswer,
      ),
    }
  }

  onStatus?.('데이터 특성 확인 중...')
  const assumptions = await runDiagnosticAssumptions(
    merged,
    data,
    validationResults,
  )

  return {
    ...previousReport,
    originUserMessage: previousReport.originUserMessage ?? userAnswer,
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
  // JSON 블록 추출 (balanced-brace)
  const jsonStr = extractJsonFromLlmResponse(raw)
  if (!jsonStr) {
    return { variableAssignments: null, clarificationNeeded: 'AI 응답을 해석하지 못했습니다. 아래에서 직접 선택해 주세요.' }
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      variableAssignments?: AIRecommendation['variableAssignments']
      clarificationNeeded?: string | null
    }

    if (parsed.clarificationNeeded) {
      return { variableAssignments: null, clarificationNeeded: parsed.clarificationNeeded }
    }

    if (!parsed.variableAssignments) {
      return { variableAssignments: null, clarificationNeeded: 'AI가 변수 역할을 판단하지 못했습니다. 아래에서 직접 선택해 주세요.' }
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

    // 필수 역할 검증: dependent + group 변수 모두 있어야 완료
    const hasDep = (validated.dependent?.length ?? 0) > 0
    const hasGroup = (validated.factor?.length ?? 0) > 0
      || (validated.independent?.length ?? 0) > 0
      || (validated.between?.length ?? 0) > 0

    if (!hasDep && !hasGroup) {
      return {
        variableAssignments: validated,
        clarificationNeeded: '어떤 값을 비교하고 싶으신가요?',
      }
    }
    if (!hasDep) {
      return {
        variableAssignments: validated,
        clarificationNeeded: '비교할 값을 선택해 주세요.',
      }
    }
    if (!hasGroup) {
      return {
        variableAssignments: validated,
        clarificationNeeded: '어떤 기준으로 비교할까요?',
      }
    }

    return { variableAssignments: validated, clarificationNeeded: null }
  } catch {
    return { variableAssignments: null, clarificationNeeded: 'AI 응답 파싱에 실패했습니다. 아래에서 직접 선택해 주세요.' }
  }
}

// ===== Internal: pendingClarification 구성 =====

/** 기본 필수 역할: LLM이 아무것도 감지하지 못했을 때 사용 */
type VariableRole = DiagnosticReport['pendingClarification'] extends { missingRoles: Array<infer R> } | null ? R : string

const GROUP_COMPARE_PATTERN = /(집단|그룹|비교|차이|평균|전후|before|after|compare|difference|mean)/i
const RELATIONSHIP_PATTERN = /(관계|상관|연관|예측|영향|correlation|relationship|regression|predict)/i
const CATEGORICAL_PATTERN = /(비율|빈도|교차표|독립성|범주형|카이제곱|fisher|chi-square|proportion|count|categorical|association)/i
const REPEATED_MEASURES_PATTERN = /(반복|시점|전후|before|after|time|longitudinal|repeated|paired)/i

function buildClarificationMethodRecommendation(
  methodId: string,
  reason: string,
  badge: MethodRecommendation['badge'] = 'alternative',
): MethodRecommendation | null {
  const method = STATISTICAL_METHODS[methodId]
  if (!method) return null

  return {
    methodId,
    methodName: method.name,
    koreanName: getKoreanName(methodId),
    reason,
    badge,
  }
}

function dedupeClarificationRecommendations(
  recommendations: Array<MethodRecommendation | null>
): MethodRecommendation[] {
  const unique = new Map<string, MethodRecommendation>()

  for (const recommendation of recommendations) {
    if (!recommendation || unique.has(recommendation.methodId)) continue
    unique.set(recommendation.methodId, recommendation)
  }

  return Array.from(unique.values()).slice(0, 2)
}

function buildClarificationAlternatives(args: {
  userMessage?: string
  partialAssignments: AIRecommendation['variableAssignments'] | null
  validationResults: ValidationResults
  missingRoles: VariableRole[]
}): MethodRecommendation[] {
  const message = args.userMessage ?? ''
  const columns = (args.validationResults.columns ?? []).filter((column) => !column.idDetection?.isId)
  const numericColumns = columns.filter((column) => column.type === 'numeric')
  const categoricalColumns = columns.filter((column) => column.type === 'categorical')
  const groupCandidates = categoricalColumns.filter((column) => {
    const uniqueValues = column.uniqueValues ?? 0
    return uniqueValues >= 2 && uniqueValues <= 30
  })
  const needsGroup = args.missingRoles.includes('factor') || args.missingRoles.includes('independent')
  const needsDependent = args.missingRoles.includes('dependent')
  const asksGroupComparison = GROUP_COMPARE_PATTERN.test(message)
  const asksRelationship = RELATIONSHIP_PATTERN.test(message)
  const asksCategorical = CATEGORICAL_PATTERN.test(message)
  const asksRepeatedMeasures = REPEATED_MEASURES_PATTERN.test(message)
  const selectedGroupCount = resolveDetectedGroupCount(args.partialAssignments, args.validationResults)
  const primaryGroupCount = selectedGroupCount ?? groupCandidates[0]?.uniqueValues ?? 0

  if (asksRelationship && numericColumns.length >= 2) {
    return dedupeClarificationRecommendations([
      buildClarificationMethodRecommendation(
        'pearson-correlation',
        '현재 데이터에는 수치형 열이 여러 개 있어 변수 간 관계를 보는 상관 분석이 더 자연스럽습니다.',
        'recommended',
      ),
      buildClarificationMethodRecommendation(
        'simple-regression',
        '한 변수가 다른 변수를 설명하거나 예측하는지 보려면 회귀 분석으로 바로 이어갈 수 있습니다.',
      ),
    ])
  }

  if (asksCategorical && categoricalColumns.length >= 2) {
    return dedupeClarificationRecommendations([
      buildClarificationMethodRecommendation(
        'chi-square-independence',
        '현재 데이터는 범주형 열 중심이라 집단 평균 비교보다 범주형 연관성 검정이 더 적합합니다.',
        'recommended',
      ),
    ])
  }

  if (
    (needsGroup || asksGroupComparison)
    && numericColumns.length >= 2
    && (groupCandidates.length === 0 || (selectedGroupCount === null && asksRepeatedMeasures))
  ) {
    if (numericColumns.length === 2) {
      return dedupeClarificationRecommendations([
        buildClarificationMethodRecommendation(
          'paired-t',
          '그룹 열 없이 수치형 열이 두 개라면 같은 대상의 전후 비교처럼 paired t-test가 더 가깝습니다.',
          'recommended',
        ),
        buildClarificationMethodRecommendation(
          'wilcoxon-signed-rank',
          '정규성 가정이 불안하면 Wilcoxon signed-rank 검정으로 바로 바꿀 수 있습니다.',
        ),
      ])
    }

    return dedupeClarificationRecommendations([
      buildClarificationMethodRecommendation(
        'repeated-measures-anova',
        '그룹 열 없이 시점별 수치형 열이 여러 개라면 반복측정 ANOVA가 더 자연스럽습니다.',
        'recommended',
      ),
      buildClarificationMethodRecommendation(
        'friedman',
        '반복측정 구조이지만 비모수 접근이 필요하면 Friedman 검정을 대안으로 사용할 수 있습니다.',
      ),
    ])
  }

  if ((needsDependent || asksGroupComparison) && numericColumns.length > 0 && primaryGroupCount >= 2) {
    if (primaryGroupCount === 2) {
      return dedupeClarificationRecommendations([
        buildClarificationMethodRecommendation(
          'two-sample-t',
          '현재 데이터에는 두 집단 비교에 쓸 수 있는 그룹 열이 보여서 독립표본 t-test가 가장 가깝습니다.',
          'recommended',
        ),
        buildClarificationMethodRecommendation(
          'mann-whitney',
          '분포 가정이 애매하면 Mann-Whitney U 검정으로 바로 전환할 수 있습니다.',
        ),
      ])
    }

    return dedupeClarificationRecommendations([
      buildClarificationMethodRecommendation(
        'one-way-anova',
        '현재 데이터에는 세 집단 이상 비교가 가능한 그룹 열이 보여서 일원분산분석이 더 적합합니다.',
        'recommended',
      ),
      buildClarificationMethodRecommendation(
        'kruskal-wallis',
        '정규성이나 등분산 가정이 맞지 않을 수 있으면 Kruskal-Wallis 검정을 대안으로 볼 수 있습니다.',
      ),
    ])
  }

  return []
}

function resolveDetectedGroupCount(
  partialAssignments: AIRecommendation['variableAssignments'] | null,
  validationResults: ValidationResults,
): number | null {
  const assignedGroupColumns = [
    ...(partialAssignments?.factor ?? []),
    ...(partialAssignments?.independent ?? []),
    ...(partialAssignments?.between ?? []),
  ]

  if (assignedGroupColumns.length === 0) return null

  const columnsByName = new Map(
    (validationResults.columns ?? []).map((column) => [column.name, column] as const),
  )

  for (const columnName of assignedGroupColumns) {
    const column = columnsByName.get(columnName)
    if (!column || column.type !== 'categorical') continue

    const uniqueValues = column.uniqueValues ?? 0
    if (uniqueValues >= 2 && uniqueValues <= 30) {
      return uniqueValues
    }
  }

  return null
}

function resolvePreferredGroupRole(
  question: string,
  partialAssignments: AIRecommendation['variableAssignments'] | null,
  userMessage?: string,
): Extract<VariableRole, 'factor' | 'independent' | 'between'> {
  if ((partialAssignments?.between?.length ?? 0) > 0) return 'between'
  if ((partialAssignments?.independent?.length ?? 0) > 0) return 'independent'
  if ((partialAssignments?.factor?.length ?? 0) > 0) return 'factor'

  const source = `${question} ${userMessage ?? ''}`
  if (/(독립|설명|예측|회귀|independent|predict|regression|explanatory)/i.test(source)) {
    return 'independent'
  }

  return 'factor'
}

/** @internal 테스트용 export */
export function buildPendingClarification(
  question: string,
  partialAssignments: AIRecommendation['variableAssignments'] | null,
  validationResults: ValidationResults,
  userMessage?: string,
): DiagnosticReport['pendingClarification'] {
  const columns = validationResults.columns ?? []

  // 이미 감지된 역할을 제외하고 누락된 역할만 계산
  const hasDependent = (partialAssignments?.dependent?.length ?? 0) > 0
    || (partialAssignments?.time?.length ?? 0) > 0
  const hasGroupingRole = (partialAssignments?.factor?.length ?? 0) > 0
    || (partialAssignments?.independent?.length ?? 0) > 0
    || (partialAssignments?.between?.length ?? 0) > 0
  const preferredGroupRole = resolvePreferredGroupRole(question, partialAssignments, userMessage)
  const missingRoles: VariableRole[] = []

  if (!hasDependent) {
    missingRoles.push('dependent')
  }

  if (!hasGroupingRole) {
    missingRoles.push(preferredGroupRole)
  }

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

  const resolvedMissingRoles = missingRoles.length > 0
    ? missingRoles
    : (hasGroupingRole ? ['dependent'] : ['dependent', preferredGroupRole]) as VariableRole[]

  return {
    question,
    missingRoles: resolvedMissingRoles,
    candidateColumns,
    suggestedAnalyses: buildClarificationAlternatives({
      userMessage,
      partialAssignments,
      validationResults,
      missingRoles: resolvedMissingRoles,
    }),
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

  const missingRoles = pending.missingRoles
  const requestedGroupRole: 'factor' | 'independent' | 'between' = missingRoles.includes('independent')
    ? 'independent'
    : missingRoles.includes('between')
      ? 'between'
      : 'factor'
  const shouldFillDependent = missingRoles.includes('dependent') || missingRoles.length === 0
  const shouldFillGroup = missingRoles.includes('factor')
    || missingRoles.includes('independent')
    || missingRoles.includes('between')
    || missingRoles.length === 0

  const result: AIRecommendation['variableAssignments'] = {}
  for (const col of matched) {
    if (col.type === 'numeric') {
      if (shouldFillDependent) {
        if (!result.dependent) result.dependent = []
        result.dependent.push(col.column)
        continue
      }

      if (shouldFillGroup && requestedGroupRole === 'independent') {
        if (!result.independent) result.independent = []
        result.independent.push(col.column)
      }
      continue
    }

    if (!shouldFillGroup) {
      continue
    }

    if (requestedGroupRole === 'independent') {
      if (!result.independent) result.independent = []
      result.independent.push(col.column)
    } else if (requestedGroupRole === 'between') {
      if (!result.between) result.between = []
      result.between.push(col.column)
    } else {
      if (!result.factor) result.factor = []
      result.factor.push(col.column)
    }
  }

  // shouldFillDependent=true면 main 루프에서 모든 numeric이 이미 result.dependent로 push됨 →
  // 여기 도달했을 땐 matched에 numeric이 없다는 뜻. categorical만 있는데 shouldFillGroup=false면
  // 배정할 자리가 없으므로 null로 떨어져야 함.
  if (Object.keys(result).length === 0 && shouldFillDependent) {
    return null
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
    const pyodide = await ensurePyodideReady('DiagnosticPipeline assumptions')
    if (!pyodide) return null

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
