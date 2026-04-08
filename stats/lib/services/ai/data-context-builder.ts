/**
 * 데이터 컨텍스트 빌더 — 순수 함수
 *
 * ValidationResults → LLM 프롬프트용 마크다운 변환.
 * openrouter-recommender에서 추출. hub-chat-service에서도 재사용.
 *
 * - 원시 데이터 행은 포함하지 않음 (프라이버시)
 * - 컬럼 최대 20개 제한
 * - PII 필터: ID 컬럼의 topCategories 제외
 */

import type {
  ValidationResults,
  ColumnStatistics,
  StatisticalAssumptions,
  DiagnosticReport,
  AnalysisTrack,
} from '@/types/analysis'

/**
 * ValidationResults → 마크다운 데이터 요약
 *
 * 통계 분석용 전체 요약: 변수 타입, 기술통계, 정규성 등 포함.
 */
export function buildDataContextMarkdown(validationResults: ValidationResults | null): string {
  if (!validationResults) return '## 데이터 정보\n(데이터가 업로드되지 않았습니다)'

  const columns = validationResults.columns ?? []
  const { numeric: numericCols, categorical: categoricalCols } = splitColumnsByType(columns)

  let context = `## 데이터 요약
- 전체: ${validationResults.totalRows ?? 0}행 × ${columns.length}열
- 수치형 변수 (${numericCols.length}개): ${numericCols.slice(0, 10).map((c: ColumnStatistics) => c.name).join(', ')}${numericCols.length > 10 ? ` 외 ${numericCols.length - 10}개` : ''}
- 범주형 변수 (${categoricalCols.length}개): ${categoricalCols.slice(0, 10).map((c: ColumnStatistics) => c.name).join(', ')}${categoricalCols.length > 10 ? ` 외 ${categoricalCols.length - 10}개` : ''}`

  // 변수 상세 통계 (최대 20개, Markdown-KV 형식 — LLM 이해도 최적)
  const displayColumns = columns.slice(0, 20)
  if (displayColumns.length > 0) {
    context += '\n\n## 변수 상세 통계\n'

    for (const col of displayColumns) {
      if (col.type === 'numeric') {
        context += `\n### ${col.name} (수치형)\n`
        if (col.mean !== undefined) context += `- 평균: ${col.mean.toFixed(2)}\n`
        if (col.std !== undefined) context += `- 표준편차: ${col.std.toFixed(2)}\n`
        if (col.min !== undefined && col.max !== undefined) context += `- 범위: ${col.min.toFixed(2)} ~ ${col.max.toFixed(2)}\n`
        if (col.median !== undefined) context += `- 중앙값: ${col.median.toFixed(2)}\n`
        if (col.skewness !== undefined) context += `- 왜도: ${col.skewness.toFixed(2)}\n`
        if (col.kurtosis !== undefined) context += `- 첨도: ${col.kurtosis.toFixed(2)}\n`
        context += `- 고유값: ${col.uniqueValues ?? '-'}\n`
        if (col.missingCount) context += `- 결측: ${col.missingCount}\n`
        if (col.outliers?.length) context += `- 이상치: ${col.outliers.length}개\n`
        if (col.normality) context += `- 정규성(${col.normality.testName}): p=${col.normality.pValue.toFixed(4)} → ${col.normality.isNormal ? '정규분포' : '비정규분포'}\n`
      } else if (col.type === 'categorical') {
        context += `\n### ${col.name} (범주형)\n`
        context += `- 카테고리 수: ${col.uniqueValues ?? '-'}\n`
        // PII 필터: ID 컬럼의 topCategories는 제외 (개인정보 보호)
        const isIdColumn = col.idDetection?.isId === true
        if (col.topCategories?.length && !isIdColumn) {
          const cats = col.topCategories.slice(0, 6)
            .map(c => `${c.value}(${c.count})`).join(', ')
          context += `- 분포: ${cats}\n`
        }
        if (col.missingCount) context += `- 결측: ${col.missingCount}\n`
      } else {
        context += `\n### ${col.name} (혼합형)\n`
        context += `- 수치값: ${col.numericCount}개, 텍스트: ${col.textCount}개\n`
        context += `- 고유값: ${col.uniqueValues ?? '-'}\n`
        if (col.missingCount) context += `- 결측: ${col.missingCount}\n`
      }
    }

    if (columns.length > 20) {
      context += `\n(외 ${columns.length - 20}개 변수 생략)`
    }
  }

  return context
}

/**
 * 가정 검정 결과 → 마크다운
 */
export function buildAssumptionContextMarkdown(assumptionResults: StatisticalAssumptions | null): string {
  if (!assumptionResults) return '## 통계적 가정 검정\n(가정 검정 미실시)'

  const parts: string[] = []

  if (assumptionResults.normality?.shapiroWilk) {
    const { pValue, isNormal } = assumptionResults.normality.shapiroWilk
    parts.push(`- 정규성: ${isNormal ? '충족' : '미충족'} (Shapiro-Wilk p=${pValue?.toFixed(3) ?? 'N/A'})`)
  }

  if (assumptionResults.homogeneity?.levene) {
    const { pValue, equalVariance } = assumptionResults.homogeneity.levene
    parts.push(`- 등분산성: ${equalVariance ? '충족' : '미충족'} (Levene p=${pValue?.toFixed(3) ?? 'N/A'})`)
  }

  if (parts.length === 0) return '## 통계적 가정 검정\n(가정 검정 결과 없음)'

  return `## 통계적 가정 검정 결과\n${parts.join('\n')}`
}

/**
 * DiagnosticReport → LLM 2차 호출용 마크다운.
 *
 * LLM이 진단 결과를 인용하여 추천 근거를 설명할 수 있도록
 * 기초통계 + 가정 검정 결과를 구조화된 마크다운으로 변환.
 */
export function buildDiagnosticReportMarkdown(report: DiagnosticReport): string {
  const parts: string[] = ['## 데이터 진단 리포트']

  // 기초통계
  const bs = report.basicStats
  parts.push(`\n### 기초통계\n- 표본 크기: ${bs.totalRows}행`)

  if (bs.groups?.length) {
    parts.push(`- 그룹: ${bs.groups.map(g => `${g.name}(n=${g.count})`).join(', ')}`)
  }

  if (bs.numericSummaries.length > 0) {
    parts.push('\n### 수치형 변수 요약')
    for (const s of bs.numericSummaries.slice(0, 10)) {
      parts.push(`- ${s.column}: M=${s.mean.toFixed(2)}, SD=${s.std.toFixed(2)}, 범위 ${s.min.toFixed(2)}~${s.max.toFixed(2)}`)
    }
  }

  // 가정 검정
  if (report.assumptions) {
    const a = report.assumptions
    parts.push('\n### 가정 검정 결과')

    // 정규성 — 모든 그룹 표시
    parts.push(`\n**정규성 (${a.normality.testMethod})**: ${a.normality.overallPassed ? '충족' : '미충족'}`)
    for (const g of a.normality.groups) {
      parts.push(`  - ${g.groupName}: p=${g.pValue.toFixed(4)} → ${g.passed ? '정규' : '비정규'}`)
    }

    // 등분산
    if (a.homogeneity) {
      const lev = a.homogeneity.levene
      parts.push(`\n**등분산성 (Levene)**: ${lev.equalVariance ? '충족' : '미충족'} (p=${lev.pValue.toFixed(4)})`)
    }
  }

  // 변수 배정
  if (report.variableAssignments) {
    parts.push('\n### 탐지된 변수 역할')
    const va = report.variableAssignments
    if (va.dependent?.length) parts.push(`- 종속변수: ${va.dependent.join(', ')}`)
    if (va.factor?.length) parts.push(`- 그룹변수: ${va.factor.join(', ')}`)
    if (va.independent?.length) parts.push(`- 독립변수: ${va.independent.join(', ')}`)
    if (va.covariate?.length) parts.push(`- 공변량: ${va.covariate.join(', ')}`)
    if (va.within?.length) parts.push(`- 피험자내 변수: ${va.within.join(', ')}`)
    if (va.between?.length) parts.push(`- 피험자간 변수: ${va.between.join(', ')}`)
    if (va.event?.length) parts.push(`- 사건 변수: ${va.event.join(', ')}`)
    if (va.time?.length) parts.push(`- 시간 변수: ${va.time.join(', ')}`)
  }

  return parts.join('\n')
}

// ===== 내부 헬퍼 =====

function splitColumnsByType(columns: ColumnStatistics[]): {
  numeric: ColumnStatistics[]
  categorical: ColumnStatistics[]
} {
  return {
    numeric: columns.filter((c) => c.type === 'numeric'),
    categorical: columns.filter((c) => c.type === 'categorical'),
  }
}

// ===== 의도별 컨텍스트 빌더 =====

/**
 * 시각화용 경량 컨텍스트: 값 범위, 고유값 수, 데이터 타입 중심
 */
export function buildVisualizationContext(validationResults: ValidationResults | null): string {
  if (!validationResults) return '## 데이터 정보\n(데이터가 업로드되지 않았습니다)'

  const columns = validationResults.columns ?? []
  const { numeric: numericCols, categorical: categoricalCols } = splitColumnsByType(columns)

  // 컬럼명 나열도 토큰 소비 — 10개까지만 표시
  const MAX_VIZ_NAMES = 10
  const numNames = numericCols.slice(0, MAX_VIZ_NAMES).map((c: ColumnStatistics) => c.name).join(', ')
  const numSuffix = numericCols.length > MAX_VIZ_NAMES ? ` 외 ${numericCols.length - MAX_VIZ_NAMES}개` : ''
  const catNames = categoricalCols.slice(0, MAX_VIZ_NAMES).map((c: ColumnStatistics) => c.name).join(', ')
  const catSuffix = categoricalCols.length > MAX_VIZ_NAMES ? ` 외 ${categoricalCols.length - MAX_VIZ_NAMES}개` : ''

  let context = `## 시각화 데이터 요약
- 전체: ${validationResults.totalRows ?? 0}행 × ${columns.length}열
- 수치형 (${numericCols.length}개): ${numNames}${numSuffix}
- 범주형 (${categoricalCols.length}개): ${catNames}${catSuffix}

## 변수별 시각화 정보\n`

  // 상세 정보도 10개까지만 (넓은 스키마에서 토큰 절감)
  for (const col of columns.slice(0, 10)) {
    if (col.type === 'numeric') {
      context += `- ${col.name}: 수치형`
      if (col.min !== undefined && col.max !== undefined) context += `, 범위 ${col.min.toFixed(1)}~${col.max.toFixed(1)}`
      context += `, 고유값 ${col.uniqueValues ?? '-'}`
      if (col.missingCount) context += `, 결측 ${col.missingCount}`
      context += '\n'
    } else {
      context += `- ${col.name}: 범주형, 카테고리 ${col.uniqueValues ?? '-'}개`
      if (col.missingCount) context += `, 결측 ${col.missingCount}`
      context += '\n'
    }
  }

  return context
}

/**
 * 일반 상담용 경량 컨텍스트: 컬럼명 + 행 수만
 *
 * 넓은 스키마(20+열)에서도 토큰 제한을 위해 15개까지만 표시.
 */
export function buildConsultationContext(validationResults: ValidationResults | null): string {
  if (!validationResults) return '## 데이터 정보\n(데이터가 업로드되지 않았습니다)'

  const columns = validationResults.columns ?? []
  const MAX_CONSULT_COLS = 15
  const displayed = columns.slice(0, MAX_CONSULT_COLS)
  const suffix = columns.length > MAX_CONSULT_COLS ? ` 외 ${columns.length - MAX_CONSULT_COLS}개` : ''
  return `## 데이터 개요
- ${validationResults.totalRows ?? 0}행 × ${columns.length}열
- 변수: ${displayed.map((c: ColumnStatistics) => `${c.name}(${c.type})`).join(', ')}${suffix}`
}

/**
 * 의도(track)에 따라 적절한 데이터 컨텍스트 빌더를 선택
 */
export function buildContextForIntent(
  track: AnalysisTrack,
  validationResults: ValidationResults | null
): string {
  switch (track) {
    case 'direct-analysis':
    case 'data-consultation':
      return buildDataContextMarkdown(validationResults)
    case 'visualization':
      return buildVisualizationContext(validationResults)
    case 'experiment-design':
      return buildConsultationContext(validationResults)
    default:
      return buildConsultationContext(validationResults)
  }
}
