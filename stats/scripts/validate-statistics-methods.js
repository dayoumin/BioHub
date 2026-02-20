/**
 * 통계 메서드 검증 스크립트
 * 43개 통계 페이지의 핵심 요소 점검
 */

const fs = require('fs')
const path = require('path')

// 43개 통계 페이지 목록
const STATISTICS_PAGES = [
  'ancova', 'anova', 'binomial-test', 'chi-square', 'chi-square-goodness',
  'chi-square-independence', 'cluster', 'cochran-q', 'correlation', 'descriptive',
  'discriminant', 'dose-response', 'explore-data', 'factor-analysis', 'friedman',
  'kruskal-wallis', 'ks-test', 'mann-kendall', 'mann-whitney', 'manova',
  'mcnemar', 'means-plot', 'mixed-model', 'mood-median', 'non-parametric',
  'normality-test', 'one-sample-t', 'ordinal-regression', 'partial-correlation',
  'pca', 'poisson', 'power-analysis', 'proportion-test', 'regression',
  'reliability', 'repeated-measures-anova', 'response-surface', 'runs-test',
  'sign-test', 'stepwise', 't-test', 'welch-t', 'wilcoxon'
]

const ANALYSIS_FUNCTION_PATTERNS = [
  /runAnalysis/,
  /handleAnalysis/,
  /executeAnalysis/,
  /handleCalculate/,
  /handleRunAnalysis/,
  /handleAnalyze/,
  /run\w+Analysis/,
  /run\w+Test/,
  /run\w+Regression/
]

// 검증 결과 저장
const results = {
  passed: [],
  failed: [],
  warnings: []
}

// 1. 페이지 파일 존재 여부 확인
function checkPageFiles() {
  console.log('\n📁 [1/4] 페이지 파일 존재 여부 확인...\n')

  const missing = []
  const exists = []

  STATISTICS_PAGES.forEach(page => {
    const pagePath = path.join(__dirname, '..', 'app', '(dashboard)', 'statistics', page, 'page.tsx')
    if (fs.existsSync(pagePath)) {
      exists.push(page)
    } else {
      missing.push(page)
    }
  })

  console.log(`✅ 존재: ${exists.length}/${STATISTICS_PAGES.length}`)
  if (missing.length > 0) {
    console.log(`❌ 누락: ${missing.join(', ')}`)
    results.failed.push(...missing.map(p => `페이지 누락: ${p}`))
  }

  return { exists, missing }
}

// 2. PyodideWorker 사용 여부 확인
function checkPyodideWorker() {
  console.log('\n🐍 [2/4] PyodideWorker 사용 여부 확인...\n')

  const usingPyodide = []
  const notUsingPyodide = []
  const workerMethods = {}

  STATISTICS_PAGES.forEach(page => {
    const pagePath = path.join(__dirname, '..', 'app', '(dashboard)', 'statistics', page, 'page.tsx')
    if (!fs.existsSync(pagePath)) return

    const content = fs.readFileSync(pagePath, 'utf-8')

    // PyodideWorker enum 사용 확인
    if (content.includes('PyodideWorker.')) {
      usingPyodide.push(page)

      // 사용된 Worker 메서드 추출
      const workerMatches = content.match(/PyodideWorker\.\w+/g)
      if (workerMatches) {
        workerMethods[page] = [...new Set(workerMatches)]
      }
    } else if (content.includes('PyodideCoreService')) {
      // PyodideCoreService는 사용하지만 enum 미사용 (구형 패턴)
      results.warnings.push(`${page}: PyodideCoreService 사용하지만 PyodideWorker enum 미사용`)
      usingPyodide.push(page)
    } else {
      notUsingPyodide.push(page)
    }
  })

  console.log(`✅ PyodideWorker 사용: ${usingPyodide.length}/${STATISTICS_PAGES.length}`)
  console.log(`⚠️ 미사용 (데이터 도구 등): ${notUsingPyodide.length}`)

  if (notUsingPyodide.length > 0) {
    console.log(`   → ${notUsingPyodide.join(', ')}`)
  }

  return { usingPyodide, notUsingPyodide, workerMethods }
}

// 3. variable-requirements 정의 확인
function checkVariableRequirements() {
  console.log('\n📋 [3/4] variable-requirements 정의 확인...\n')

  const reqPath = path.join(__dirname, '..', 'lib', 'statistics', 'variable-requirements.ts')
  if (!fs.existsSync(reqPath)) {
    console.log('❌ variable-requirements.ts 파일 없음')
    results.failed.push('variable-requirements.ts 파일 누락')
    return { defined: [], missing: STATISTICS_PAGES }
  }

  const content = fs.readFileSync(reqPath, 'utf-8')

  const defined = []
  const missing = []

  STATISTICS_PAGES.forEach(page => {
    // methodId로 검색 (하이픈 포함)
    const patterns = [
      `'${page}'`,
      `"${page}"`,
      `methodId === '${page}'`,
      `methodId === "${page}"`
    ]

    const found = patterns.some(pattern => content.includes(pattern))

    if (found) {
      defined.push(page)
    } else {
      missing.push(page)
    }
  })

  console.log(`✅ 정의됨: ${defined.length}/${STATISTICS_PAGES.length}`)

  if (missing.length > 0) {
    console.log(`❌ 미정의: ${missing.join(', ')}`)
    results.warnings.push(...missing.map(p => `variable-requirements 미정의: ${p}`))
  }

  return { defined, missing }
}

// 4. TypeScript 타입 정의 확인
function checkTypeDefinitions() {
  console.log('\n📝 [4/4] TypeScript 타입 정의 확인...\n')

  const typesPath = path.join(__dirname, '..', 'types', 'statistics.ts')
  if (!fs.existsSync(typesPath)) {
    console.log('❌ types/statistics.ts 파일 없음')
    results.failed.push('types/statistics.ts 파일 누락')
    return { defined: [], missing: STATISTICS_PAGES }
  }

  const content = fs.readFileSync(typesPath, 'utf-8')

  // 페이지명 → 예상 타입명 매핑
  const pageToType = {
    'ancova': 'Ancova',
    'anova': 'Anova',
    'binomial-test': 'BinomialTest',
    'chi-square': 'ChiSquare',
    'chi-square-goodness': 'ChiSquareGoodness',
    'chi-square-independence': 'ChiSquareIndependence',
    'cluster': 'Cluster',
    'cochran-q': 'CochranQ',
    'correlation': 'Correlation',
    'descriptive': 'Descriptive',
    'discriminant': 'Discriminant',
    'dose-response': 'DoseResponse',
    'explore-data': 'ExploreData',
    'factor-analysis': 'FactorAnalysis',
    'friedman': 'Friedman',
    'kruskal-wallis': 'KruskalWallis',
    'ks-test': 'KsTest',
    'mann-kendall': 'MannKendall',
    'mann-whitney': 'MannWhitney',
    'manova': 'Manova',
    'mcnemar': 'McNemar',
    'means-plot': 'MeansPlot',
    'mixed-model': 'MixedModel',
    'mood-median': 'MoodMedian',
    'non-parametric': 'NonParametric',
    'normality-test': 'NormalityTest',
    'one-sample-t': 'OneSampleT',
    'ordinal-regression': 'OrdinalRegression',
    'partial-correlation': 'PartialCorrelation',
    'pca': 'Pca',
    'poisson': 'Poisson',
    'power-analysis': 'PowerAnalysis',
    'proportion-test': 'ProportionTest',
    'regression': 'Regression',
    'reliability': 'Reliability',
    'repeated-measures-anova': 'RepeatedMeasuresAnova',
    'response-surface': 'ResponseSurface',
    'runs-test': 'RunsTest',
    'sign-test': 'SignTest',
    'stepwise': 'Stepwise',
    't-test': 'TTest',
    'welch-t': 'WelchT',
    'wilcoxon': 'Wilcoxon'
  }

  const defined = []
  const missing = []

  STATISTICS_PAGES.forEach(page => {
    const typeName = pageToType[page]
    if (!typeName) {
      missing.push(page)
      return
    }

    // Variables 타입 또는 Result 타입 검색
    const patterns = [
      `interface ${typeName}Variables`,
      `type ${typeName}Variables`,
      `interface ${typeName}Result`,
      `type ${typeName}Result`,
      `export interface ${typeName}`,
      `export type ${typeName}`
    ]

    const found = patterns.some(pattern => content.includes(pattern))

    if (found) {
      defined.push(page)
    } else {
      missing.push(page)
    }
  })

  console.log(`✅ 타입 정의됨: ${defined.length}/${STATISTICS_PAGES.length}`)

  if (missing.length > 0) {
    console.log(`⚠️ 타입 미확인: ${missing.join(', ')}`)
    // 타입은 경고로 처리 (공통 타입 사용 가능)
  }

  return { defined, missing }
}

// 5. 페이지별 상세 점검
function checkPageDetails() {
  console.log('\n🔍 [상세] 페이지별 핵심 패턴 점검...\n')

  const issues = []

  STATISTICS_PAGES.forEach(page => {
    const pagePath = path.join(__dirname, '..', 'app', '(dashboard)', 'statistics', page, 'page.tsx')
    if (!fs.existsSync(pagePath)) return

    const content = fs.readFileSync(pagePath, 'utf-8')
    const pageIssues = []

    // 1. useStatisticsPage hook 사용 확인
    if (!content.includes('useStatisticsPage')) {
      pageIssues.push('useStatisticsPage 미사용')
    }

    // 2. TwoPanelLayout 또는 StatisticsPageLayout 사용 확인
    if (!content.includes('TwoPanelLayout') && !content.includes('StatisticsPageLayout')) {
      pageIssues.push('표준 레이아웃 미사용')
    }

    // 3. any 타입 사용 확인
    const anyMatches = content.match(/:\s*any\b/g)
    if (anyMatches && anyMatches.length > 3) {
      pageIssues.push(`any 타입 ${anyMatches.length}개 사용`)
    }

    // 4. 분석 실행 함수 확인 (다양한 패턴 허용)
    const hasAnalysisFunction = ANALYSIS_FUNCTION_PATTERNS.some(pattern => pattern.test(content))
    if (!hasAnalysisFunction) {
      pageIssues.push('분석 실행 함수 미확인')
    }

    // 5. 에러 처리 확인
    if (!content.includes('try') || !content.includes('catch')) {
      pageIssues.push('에러 처리 미흡')
    }

    if (pageIssues.length > 0) {
      issues.push({ page, issues: pageIssues })
    }
  })

  if (issues.length > 0) {
    console.log('⚠️ 개선 필요 페이지:')
    issues.forEach(({ page, issues: pageIssues }) => {
      console.log(`   ${page}: ${pageIssues.join(', ')}`)
    })
  } else {
    console.log('✅ 모든 페이지 핵심 패턴 준수')
  }

  return issues
}

// 메인 실행
function main() {
  console.log('=' .repeat(60))
  console.log('📊 통계 메서드 검증 스크립트')
  console.log('=' .repeat(60))

  const pageResult = checkPageFiles()
  const pyodideResult = checkPyodideWorker()
  const varReqResult = checkVariableRequirements()
  const typeResult = checkTypeDefinitions()
  const detailResult = checkPageDetails()

  // 최종 결과 요약
  console.log('\n' + '=' .repeat(60))
  console.log('📋 최종 결과 요약')
  console.log('=' .repeat(60))

  const totalPages = STATISTICS_PAGES.length
  const passedPages = pageResult.exists.length
  const pyodidePages = pyodideResult.usingPyodide.length
  const varReqPages = varReqResult.defined.length
  const typePages = typeResult.defined.length

  console.log(`
📁 페이지 파일:      ${passedPages}/${totalPages} (${(passedPages/totalPages*100).toFixed(0)}%)
🐍 PyodideWorker:   ${pyodidePages}/${totalPages} (${(pyodidePages/totalPages*100).toFixed(0)}%)
📋 변수 요구사항:   ${varReqPages}/${totalPages} (${(varReqPages/totalPages*100).toFixed(0)}%)
📝 타입 정의:       ${typePages}/${totalPages} (${(typePages/totalPages*100).toFixed(0)}%)
`)

  // 누락된 항목 상세
  if (results.failed.length > 0) {
    console.log('\n❌ 실패 항목:')
    results.failed.forEach(f => console.log(`   - ${f}`))
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️ 경고 항목:')
    results.warnings.forEach(w => console.log(`   - ${w}`))
  }

  // variable-requirements 누락 상세
  if (varReqResult.missing.length > 0) {
    console.log('\n📋 variable-requirements 누락 목록:')
    varReqResult.missing.forEach(p => console.log(`   - ${p}`))
  }

  // 종합 점수
  const overallScore = ((passedPages + pyodidePages + varReqPages + typePages) / (totalPages * 4) * 100).toFixed(1)
  console.log(`\n🎯 종합 점수: ${overallScore}%`)

  if (parseFloat(overallScore) >= 90) {
    console.log('✅ 우수 - 대부분의 메서드가 정상 설정됨')
  } else if (parseFloat(overallScore) >= 70) {
    console.log('⚠️ 양호 - 일부 개선 필요')
  } else {
    console.log('❌ 미흡 - 상당한 개선 필요')
  }

  console.log('\n' + '=' .repeat(60))
}

main()
