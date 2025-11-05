#!/usr/bin/env node

/**
 * 통계 페이지 변수 선택 요구사항 분석 스크립트
 *
 * 목적: 41개 통계 페이지의 VariableSelector 사용 패턴 및 변수 요구사항 분석
 * 실행: node scripts/statistics/analyze-variable-requirements.js
 * 출력: docs/VARIABLE_REQUIREMENTS_ANALYSIS.md
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// 통계 페이지 디렉토리
const STATISTICS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')
const OUTPUT_FILE = path.join(__dirname, '../../docs/VARIABLE_REQUIREMENTS_ANALYSIS.md')

// 통계 기법별 표준 변수 요구사항 (수동 정의)
const STANDARD_REQUIREMENTS = {
  // 기초 통계
  'descriptive': { all: '2+', type: 'numeric', description: '기술통계량 계산을 위한 숫자형 변수' },
  'frequency-table': { all: '1+', type: 'categorical', description: '빈도표 생성을 위한 범주형 변수' },
  'explore-data': { all: '1+', type: 'any', description: '탐색적 데이터 분석' },

  // T-검정
  't-test': { dependent: 1, groups: 2, type: 'numeric', description: '두 집단 평균 비교' },
  'one-sample-t': { dependent: 1, type: 'numeric', description: '단일 표본 평균 검정' },
  'welch-t': { dependent: 1, groups: 2, type: 'numeric', description: 'Welch t-검정' },

  // 분산분석
  'anova': { dependent: 1, independent: 1, type: 'numeric/categorical', description: '일원 분산분석' },
  'two-way-anova': { dependent: 1, independent: 2, type: 'numeric/categorical', description: '이원 분산분석' },
  'three-way-anova': { dependent: 1, independent: 3, type: 'numeric/categorical', description: '삼원 분산분석' },
  'repeated-measures': { dependent: '2+', type: 'numeric', description: '반복측정 분산분석' },
  'ancova': { dependent: 1, independent: 1, covariates: '1+', type: 'numeric/categorical', description: '공분산분석' },
  'manova': { dependent: '2+', independent: 1, type: 'numeric/categorical', description: '다변량 분산분석' },

  // 상관분석
  'correlation': { all: '2+', type: 'numeric', description: '상관분석 (Pearson, Spearman)' },
  'partial-correlation': { all: '2+', location: '0-1', type: 'numeric', description: '편상관분석' },

  // 회귀분석
  'regression': { dependent: 1, independent: '1+', type: 'numeric', description: '선형/로지스틱 회귀분석' },
  'stepwise': { dependent: 1, independent: '2+', type: 'numeric', description: '단계적 회귀분석' },
  'ordinal-regression': { dependent: 1, independent: '1+', type: 'ordinal/numeric', description: '순서형 회귀분석' },
  'mixed-model': { dependent: 1, independent: '1+', type: 'numeric/categorical', description: '혼합효과 모델' },

  // 카이제곱 검정
  'chi-square': { rows: '2+', columns: '2+', type: 'categorical', description: 'Fisher 정확 검정' },
  'chi-square-goodness': { observed: 1, type: 'categorical', description: '적합도 검정' },
  'chi-square-independence': { row: 1, column: 1, type: 'categorical', description: '독립성 검정' },
  'mcnemar': { groups: 2, type: 'categorical', description: 'McNemar 검정' },

  // 비모수 검정
  'non-parametric': { dependent: 1, groups: '2+', type: 'numeric', description: '비모수 검정 (Mann-Whitney, Kruskal-Wallis)' },
  'mann-whitney': { dependent: 1, groups: 2, type: 'numeric', description: 'Mann-Whitney U 검정' },
  'kruskal-wallis': { dependent: 1, groups: '3+', type: 'numeric', description: 'Kruskal-Wallis 검정' },
  'wilcoxon': { dependent: 1, type: 'numeric', description: 'Wilcoxon 부호순위 검정' },
  'friedman': { dependent: 1, conditions: '3+', type: 'numeric', description: 'Friedman 검정' },
  'sign-test': { dependent: 1, type: 'numeric', description: '부호 검정' },
  'runs-test': { data: 1, type: 'binary', description: 'Runs 검정' },

  // 정규성 및 검정력
  'normality-test': { all: '1+', type: 'numeric', description: '정규성 검정' },
  'ks-test': { data: 1, type: 'numeric', description: 'Kolmogorov-Smirnov 검정' },
  'power-analysis': { none: true, description: '검정력 분석 (직접 입력)' },

  // 비율 검정
  'proportion-test': { groups: '1-2', type: 'categorical', description: '비율 검정' },

  // 생존분석
  'mann-kendall': { data: 1, type: 'time-series', description: 'Mann-Kendall 추세 검정' },

  // 신뢰도/타당도
  'reliability': { items: '2+', type: 'numeric', description: 'Cronbach 알파 신뢰도' },

  // 다변량 분석
  'pca': { all: '2+', type: 'numeric', description: '주성분 분석' },
  'factor-analysis': { all: '3+', type: 'numeric', description: '요인분석' },
  'cluster': { all: '2+', type: 'numeric', description: '군집분석' },
  'discriminant': { dependent: 1, independent: '2+', type: 'categorical/numeric', description: '판별분석' },

  // 실험설계
  'response-surface': { dependent: 1, independent: '2+', type: 'numeric', description: '반응표면 분석' },
  'dose-response': { dose: 1, response: 1, type: 'numeric', description: '용량-반응 분석' },
  'cross-tabulation': { row: 1, column: 1, type: 'categorical', description: '교차표 분석' },

  // 회귀진단
  'poisson': { dependent: 1, independent: '1+', type: 'count/numeric', description: '포아송 회귀' },

  // 시각화
  'means-plot': { dependent: 1, groups: '1+', type: 'numeric/categorical', description: '평균 그래프' }
}

/**
 * VariableSelector 사용 패턴 추출
 */
function extractVariableSelectorPattern(fileContent, fileName) {
  const pattern = {
    methodId: path.basename(path.dirname(fileName)),
    hasVariableSelector: false,
    propsUsed: [],
    onVariablesSelectedType: 'unknown',
    implementation: {
      lines: [],
      hasValidation: false,
      usesUnknownType: false
    }
  }

  // VariableSelector 사용 여부 확인
  if (fileContent.includes('<VariableSelector')) {
    pattern.hasVariableSelector = true

    // Props 추출
    const propsRegex = /<VariableSelector[^>]*>/g
    const match = fileContent.match(propsRegex)
    if (match) {
      const propsString = match[0]

      // dependent, independent, groups, all 등 추출
      if (propsString.includes('dependent')) pattern.propsUsed.push('dependent')
      if (propsString.includes('independent')) pattern.propsUsed.push('independent')
      if (propsString.includes('groups')) pattern.propsUsed.push('groups')
      if (propsString.includes('all=')) pattern.propsUsed.push('all')
      if (propsString.includes('location')) pattern.propsUsed.push('location')

      // methodId 추출
      const methodIdMatch = propsString.match(/methodId=["']([^"']+)["']/)
      if (methodIdMatch) {
        pattern.methodId = methodIdMatch[1]
      }
    }

    // onVariablesSelected 타입 확인
    const handlerRegex = /const\s+handle\w*VariableSelection\s*=\s*(?:useCallback\s*)?\((?:async\s*)?\((\w+):\s*(\w+)/
    const handlerMatch = fileContent.match(handlerRegex)
    if (handlerMatch) {
      pattern.onVariablesSelectedType = handlerMatch[2]
      pattern.implementation.usesUnknownType = handlerMatch[2] === 'unknown'
    }

    // 검증 로직 존재 여부
    if (fileContent.includes('validateVariables') ||
        fileContent.match(/if\s*\([^)]*\.length\s*[!=<>]=\s*\d+/)) {
      pattern.implementation.hasValidation = true
    }

    // 구현 라인 수 추정
    const lines = fileContent.split('\n')
    const variableSelectorLines = lines.filter(line =>
      line.includes('VariableSelector') ||
      line.includes('selectedVariables') ||
      line.includes('setSelectedVariables')
    )
    pattern.implementation.lines = variableSelectorLines.slice(0, 3) // 샘플 3줄만
  }

  return pattern
}

/**
 * 표준 요구사항과 비교
 */
function compareWithStandard(pattern) {
  const methodId = pattern.methodId
  const standard = STANDARD_REQUIREMENTS[methodId]

  if (!standard) {
    return {
      match: false,
      message: `⚠️  표준 요구사항 미정의 (${methodId})`
    }
  }

  // Props 비교
  const expectedProps = []
  if (standard.dependent) expectedProps.push('dependent')
  if (standard.independent) expectedProps.push('independent')
  if (standard.groups) expectedProps.push('groups')
  if (standard.all) expectedProps.push('all')
  if (standard.location) expectedProps.push('location')

  const missingProps = expectedProps.filter(prop => !pattern.propsUsed.includes(prop))
  const extraProps = pattern.propsUsed.filter(prop => !expectedProps.includes(prop) && prop !== 'methodId')

  if (missingProps.length > 0 || extraProps.length > 0) {
    return {
      match: false,
      message: `❌ Props 불일치`,
      missing: missingProps,
      extra: extraProps
    }
  }

  return {
    match: true,
    message: '✅ 표준 준수'
  }
}

/**
 * 메인 분석 함수
 */
async function analyzeVariableRequirements() {
  console.log('🔍 통계 페이지 변수 요구사항 분석 시작...\n')

  // 모든 통계 페이지 파일 찾기
  const pattern = path.join(STATISTICS_DIR, '*/page.tsx').replace(/\\/g, '/')
  const files = glob.sync(pattern)

  console.log(`📁 발견된 페이지: ${files.length}개\n`)

  const results = []
  let withVariableSelector = 0
  let withoutVariableSelector = 0
  let usesUnknownType = 0
  let hasValidation = 0
  let standardMatch = 0

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const pattern = extractVariableSelectorPattern(content, file)
    const comparison = compareWithStandard(pattern)

    results.push({
      file: path.relative(STATISTICS_DIR, file),
      pattern,
      comparison
    })

    if (pattern.hasVariableSelector) {
      withVariableSelector++
      if (pattern.implementation.usesUnknownType) usesUnknownType++
      if (pattern.implementation.hasValidation) hasValidation++
      if (comparison.match) standardMatch++
    } else {
      withoutVariableSelector++
    }
  }

  // 결과 출력
  console.log('📊 분석 결과 요약:')
  console.log(`  - 전체 페이지: ${files.length}개`)
  console.log(`  - VariableSelector 사용: ${withVariableSelector}개 (${Math.round(withVariableSelector/files.length*100)}%)`)
  console.log(`  - VariableSelector 미사용: ${withoutVariableSelector}개`)
  console.log(`  - unknown 타입 사용: ${usesUnknownType}개 (${Math.round(usesUnknownType/withVariableSelector*100)}%)`)
  console.log(`  - 검증 로직 있음: ${hasValidation}개 (${Math.round(hasValidation/withVariableSelector*100)}%)`)
  console.log(`  - 표준 준수: ${standardMatch}개 (${Math.round(standardMatch/withVariableSelector*100)}%)\n`)

  // 마크다운 생성
  const markdown = generateMarkdown(results, {
    total: files.length,
    withVariableSelector,
    withoutVariableSelector,
    usesUnknownType,
    hasValidation,
    standardMatch
  })

  // 파일 저장
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8')
  console.log(`✅ 분석 결과 저장: ${OUTPUT_FILE}\n`)

  return results
}

/**
 * 마크다운 생성
 */
function generateMarkdown(results, stats) {
  const lines = []

  lines.push('# 통계 페이지 변수 선택 요구사항 분석')
  lines.push('')
  lines.push('**생성일**: ' + new Date().toISOString().split('T')[0])
  lines.push('**생성 도구**: `scripts/statistics/analyze-variable-requirements.js`')
  lines.push('')
  lines.push('---')
  lines.push('')

  // Executive Summary
  lines.push('## 📊 Executive Summary')
  lines.push('')
  lines.push('| 지표 | 값 | 비율 |')
  lines.push('|------|----|----|')
  lines.push(`| 전체 페이지 | ${stats.total}개 | 100% |`)
  lines.push(`| VariableSelector 사용 | ${stats.withVariableSelector}개 | ${Math.round(stats.withVariableSelector/stats.total*100)}% |`)
  lines.push(`| VariableSelector 미사용 | ${stats.withoutVariableSelector}개 | ${Math.round(stats.withoutVariableSelector/stats.total*100)}% |`)
  lines.push(`| **unknown 타입 사용** | **${stats.usesUnknownType}개** | **${Math.round(stats.usesUnknownType/stats.withVariableSelector*100)}%** ⚠️ |`)
  lines.push(`| 런타임 검증 로직 | ${stats.hasValidation}개 | ${Math.round(stats.hasValidation/stats.withVariableSelector*100)}% |`)
  lines.push(`| 표준 요구사항 준수 | ${stats.standardMatch}개 | ${Math.round(stats.standardMatch/stats.withVariableSelector*100)}% |`)
  lines.push('')

  // 주요 발견사항
  lines.push('## 🔍 주요 발견사항')
  lines.push('')
  lines.push('### 1. ✅ 강점')
  lines.push(`- VariableSelector API 표준화: ${stats.withVariableSelector}개 페이지에서 일관된 props 사용`)
  lines.push('- methodId prop 전달: 모든 페이지에서 명확한 식별자 사용')
  lines.push('')
  lines.push('### 2. ⚠️  개선 필요')
  lines.push(`- **타입 안전성 부족**: ${stats.usesUnknownType}개 페이지에서 \`unknown\` 타입 사용`)
  lines.push(`- **런타임 검증 부족**: ${stats.withVariableSelector - stats.hasValidation}개 페이지에서 변수 개수/타입 검증 없음`)
  lines.push(`- **표준 불일치**: ${stats.withVariableSelector - stats.standardMatch}개 페이지에서 표준 요구사항과 불일치`)
  lines.push('')

  // 상세 분석
  lines.push('---')
  lines.push('')
  lines.push('## 📋 통계 기법별 상세 분석')
  lines.push('')

  // 그룹별로 분류
  const grouped = {
    '기초 통계': [],
    'T-검정': [],
    '분산분석': [],
    '상관분석': [],
    '회귀분석': [],
    '카이제곱 검정': [],
    '비모수 검정': [],
    '정규성/검정력': [],
    '다변량 분석': [],
    '실험설계': [],
    '기타': []
  }

  results.forEach(result => {
    const methodId = result.pattern.methodId
    const standard = STANDARD_REQUIREMENTS[methodId]

    let group = '기타'
    if (['descriptive', 'frequency-table', 'explore-data'].includes(methodId)) group = '기초 통계'
    else if (methodId.includes('t-test') || methodId === 't-test') group = 'T-검정'
    else if (methodId.includes('anova') || methodId.includes('ancova') || methodId.includes('manova')) group = '분산분석'
    else if (methodId.includes('correlation')) group = '상관분석'
    else if (methodId.includes('regression') || methodId === 'stepwise' || methodId === 'mixed-model') group = '회귀분석'
    else if (methodId.includes('chi-square') || methodId === 'mcnemar') group = '카이제곱 검정'
    else if (['non-parametric', 'mann-whitney', 'kruskal-wallis', 'wilcoxon', 'friedman', 'sign-test', 'runs-test'].includes(methodId)) group = '비모수 검정'
    else if (['normality-test', 'ks-test', 'power-analysis'].includes(methodId)) group = '정규성/검정력'
    else if (['pca', 'factor-analysis', 'cluster', 'discriminant'].includes(methodId)) group = '다변량 분석'
    else if (['response-surface', 'dose-response', 'cross-tabulation'].includes(methodId)) group = '실험설계'

    grouped[group].push({
      methodId,
      standard,
      ...result
    })
  })

  // 각 그룹별 출력
  Object.entries(grouped).forEach(([groupName, items]) => {
    if (items.length === 0) return

    lines.push(`### ${groupName} (${items.length}개)`)
    lines.push('')

    items.forEach(item => {
      const { methodId, standard, pattern, comparison } = item

      lines.push(`#### ${methodId}`)
      lines.push('')

      // 표준 요구사항
      if (standard) {
        lines.push('**표준 요구사항**:')
        Object.entries(standard).forEach(([key, value]) => {
          if (key !== 'description') {
            lines.push(`- \`${key}\`: ${value}`)
          }
        })
        lines.push(`- **설명**: ${standard.description}`)
        lines.push('')
      } else {
        lines.push('**표준 요구사항**: ⚠️  미정의')
        lines.push('')
      }

      // 현재 구현
      lines.push('**현재 구현**:')
      if (pattern.hasVariableSelector) {
        lines.push(`- VariableSelector: ✅ 사용`)
        lines.push(`- Props: ${pattern.propsUsed.length > 0 ? pattern.propsUsed.map(p => `\`${p}\``).join(', ') : '없음'}`)
        lines.push(`- 타입: \`${pattern.onVariablesSelectedType}\` ${pattern.implementation.usesUnknownType ? '⚠️' : '✅'}`)
        lines.push(`- 검증 로직: ${pattern.implementation.hasValidation ? '✅ 있음' : '❌ 없음'}`)
      } else {
        lines.push('- VariableSelector: ❌ 미사용 (직접 입력 또는 데이터 업로드만)')
      }
      lines.push('')

      // 비교 결과
      lines.push('**표준 준수**:')
      lines.push(`- ${comparison.message}`)
      if (comparison.missing && comparison.missing.length > 0) {
        lines.push(`- 누락된 props: ${comparison.missing.map(p => `\`${p}\``).join(', ')}`)
      }
      if (comparison.extra && comparison.extra.length > 0) {
        lines.push(`- 추가 props: ${comparison.extra.map(p => `\`${p}\``).join(', ')}`)
      }
      lines.push('')

      // 개선 권장사항
      const recommendations = []
      if (pattern.implementation.usesUnknownType) {
        recommendations.push('`unknown` → 명확한 인터페이스 타입으로 변경')
      }
      if (!pattern.implementation.hasValidation && pattern.hasVariableSelector) {
        recommendations.push('런타임 검증 로직 추가 (변수 개수, 타입 확인)')
      }
      if (!comparison.match && standard) {
        recommendations.push('표준 요구사항에 맞게 props 수정')
      }

      if (recommendations.length > 0) {
        lines.push('**개선 권장사항**:')
        recommendations.forEach(rec => {
          lines.push(`- ${rec}`)
        })
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    })
  })

  // 다음 단계
  lines.push('## 🚀 다음 단계')
  lines.push('')
  lines.push('### Phase A-2: 타입 안전성 개선')
  lines.push(`- **대상**: ${stats.usesUnknownType}개 페이지`)
  lines.push('- **작업**: `unknown` → `VariableSelection` 인터페이스')
  lines.push('- **예상 시간**: 1.5시간')
  lines.push('')
  lines.push('### Phase A-3: 런타임 검증 추가')
  lines.push(`- **대상**: ${stats.withVariableSelector - stats.hasValidation}개 페이지`)
  lines.push('- **작업**: `validateVariables()` 유틸 함수 적용')
  lines.push('- **예상 시간**: 1.5시간')
  lines.push('')

  // 관련 문서
  lines.push('---')
  lines.push('')
  lines.push('## 🔗 관련 문서')
  lines.push('')
  lines.push('- [STATISTICS_PAGES_VERIFICATION_PLAN.md](./STATISTICS_PAGES_VERIFICATION_PLAN.md) - 전체 검증 계획')
  lines.push('- [STATISTICS_PAGE_CODING_STANDARDS.md](./STATISTICS_PAGE_CODING_STANDARDS.md) - 코딩 표준')
  lines.push('- [VARIABLE_SELECTION_SPECIFICATION.md](./VARIABLE_SELECTION_SPECIFICATION.md) - 변수 선택 명세서 (Phase A-1-2에서 생성)')
  lines.push('')

  return lines.join('\n')
}

// 실행
analyzeVariableRequirements().catch(console.error)
