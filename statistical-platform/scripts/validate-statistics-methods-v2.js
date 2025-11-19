/**
 * 통계 메서드 검증 스크립트 v2
 * 43개 통계 페이지의 핵심 요소 점검 (개선된 버전)
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

// 검증 결과 저장
const results = {
  passed: [],
  failed: [],
  warnings: [],
  details: {}
}

// 1. 페이지 상세 분석
function analyzePages() {
  console.log('\n🔍 [1/3] 페이지별 상세 분석...\n')

  const analysis = {}

  STATISTICS_PAGES.forEach(page => {
    const pagePath = path.join(__dirname, '..', 'app', '(dashboard)', 'statistics', page, 'page.tsx')
    if (!fs.existsSync(pagePath)) {
      analysis[page] = { exists: false }
      return
    }

    const content = fs.readFileSync(pagePath, 'utf-8')

    analysis[page] = {
      exists: true,
      // 변수 선택 방식
      variableSelection: {
        usesVariableSelectorModern: /<VariableSelectorModern\b/.test(content),
        usesCustomUI: content.includes('handleVariableSelect') || content.includes('onVariableSelect'),
        methodId: extractMethodId(content)
      },
      // PyodideWorker 사용
      pyodide: {
        usesPyodideWorker: content.includes('PyodideWorker.'),
        usesPyodideCoreService: content.includes('PyodideCoreService'),
        workerTypes: extractWorkerTypes(content)
      },
      // 핵심 패턴
      patterns: {
        useStatisticsPage: content.includes('useStatisticsPage'),
        standardLayout: content.includes('TwoPanelLayout') || content.includes('StatisticsPageLayout'),
        hasAnalysisFunction: hasAnalysisFunction(content),
        hasErrorHandling: content.includes('try') && content.includes('catch'),
        anyTypeCount: (content.match(/:\s*any\b/g) || []).length
      },
      // 추가 정보
      lineCount: content.split('\n').length
    }
  })

  return analysis
}

// methodId 추출
function extractMethodId(content) {
  const literalMatch = content.match(/methodId\s*=\s*['"]([^'"]+)['"]/)
  if (literalMatch) {
    return literalMatch[1]
  }

  const dynamicMatch = content.match(/methodId\s*=\s*{([^}]+)}/)
  if (!dynamicMatch) {
    return null
  }

  const expression = dynamicMatch[1].trim()
  const literalValues = Array.from(expression.matchAll(/['"]([^'"]+)['"]/g)).map(m => m[1])

  if (literalValues.length > 0) {
    return [...new Set(literalValues)].join(' | ')
  }

  return expression || 'dynamic'
}

// Worker 타입 추출
function extractWorkerTypes(content) {
  const matches = content.match(/PyodideWorker\.(\w+)/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.replace('PyodideWorker.', '')))]
}

// 분석 함수 존재 여부 확인 (개선된 패턴)
function hasAnalysisFunction(content) {
  const patterns = [
    /runAnalysis/,
    /handleAnalysis/,
    /executeAnalysis/,
    /handleCalculate/,
    /handleRunAnalysis/,
    /handleAnalyze/,
    /run\w+Analysis/,  // runMeansPlotAnalysis, runStepwiseAnalysis 등
    /run\w+Test/,      // runSignTest 등
    /run\w+Regression/ // runOrdinalRegression 등
  ]
  return patterns.some(pattern => pattern.test(content))
}

// 2. variable-requirements 분석
function analyzeVariableRequirements() {
  console.log('📋 [2/3] variable-requirements 분석...\n')

  const reqPath = path.join(__dirname, '..', 'lib', 'statistics', 'variable-requirements.ts')
  if (!fs.existsSync(reqPath)) {
    return { defined: [], total: 0 }
  }

  const content = fs.readFileSync(reqPath, 'utf-8')

  // 모든 정의된 메서드 ID 추출
  const idMatches = content.match(/id:\s*['"]([^'"]+)['"]/g) || []
  const definedIds = idMatches.map(m => m.match(/['"]([^'"]+)['"]/)[1])

  return {
    defined: definedIds,
    total: definedIds.length
  }
}

// 3. 종합 보고서 생성
function generateReport(analysis, varReq) {
  console.log('📊 [3/3] 종합 보고서 생성...\n')

  // 통계 계산
  let totalPages = 0
  let pagesWithPyodide = 0
  let pagesWithVariableSelector = 0
  let pagesWithCustomUI = 0
  let pagesWithAnalysisFunction = 0
  let pagesWithErrorHandling = 0
  let issuePages = []

  Object.entries(analysis).forEach(([page, data]) => {
    if (!data.exists) return
    totalPages++

    if (data.pyodide.usesPyodideWorker || data.pyodide.usesPyodideCoreService) {
      pagesWithPyodide++
    }

    if (data.variableSelection.usesVariableSelectorModern) {
      pagesWithVariableSelector++
    }

    if (data.variableSelection.usesCustomUI) {
      pagesWithCustomUI++
    }

    if (data.patterns.hasAnalysisFunction) {
      pagesWithAnalysisFunction++
    } else {
      issuePages.push({ page, issue: '분석 실행 함수 미확인' })
    }

    if (data.patterns.hasErrorHandling) {
      pagesWithErrorHandling++
    }
  })

  // 보고서 출력
  console.log('=' .repeat(60))
  console.log('📋 통계 메서드 검증 결과')
  console.log('=' .repeat(60))

  console.log(`
총 페이지: ${totalPages}

📁 기본 구성:
   • Pyodide 사용:          ${pagesWithPyodide}/${totalPages} (${(pagesWithPyodide/totalPages*100).toFixed(0)}%)
   • 분석 함수 구현:        ${pagesWithAnalysisFunction}/${totalPages} (${(pagesWithAnalysisFunction/totalPages*100).toFixed(0)}%)
   • 에러 처리 구현:        ${pagesWithErrorHandling}/${totalPages} (${(pagesWithErrorHandling/totalPages*100).toFixed(0)}%)

📋 변수 선택 방식:
   • VariableSelectorModern: ${pagesWithVariableSelector}개
   • 커스텀 UI:              ${pagesWithCustomUI}개
   • variable-requirements:  ${varReq.total}개 정의됨
`)

  // 문제 페이지 출력
  if (issuePages.length > 0) {
    console.log('⚠️ 점검 필요 페이지:')
    issuePages.forEach(({ page, issue }) => {
      console.log(`   • ${page}: ${issue}`)
    })
    console.log('')
  }

  // VariableSelectorModern 사용하지만 methodId가 누락된 경우 확인
  const missingMethodId = []
  Object.entries(analysis).forEach(([page, data]) => {
    if (data.variableSelection?.usesVariableSelectorModern && !data.variableSelection?.methodId) {
      missingMethodId.push(page)
    }
  })

  if (missingMethodId.length > 0) {
    console.log('⚠️ VariableSelectorModern 사용하지만 methodId 누락:')
    missingMethodId.forEach(page => console.log(`   • ${page}`))
    console.log('')
  }

  // Worker 사용 통계
  const workerUsage = {}
  Object.values(analysis).forEach(data => {
    if (data.pyodide?.workerTypes) {
      data.pyodide.workerTypes.forEach(worker => {
        workerUsage[worker] = (workerUsage[worker] || 0) + 1
      })
    }
  })

  if (Object.keys(workerUsage).length > 0) {
    console.log('🐍 PyodideWorker 사용 현황:')
    Object.entries(workerUsage)
      .sort((a, b) => b[1] - a[1])
      .forEach(([worker, count]) => {
        console.log(`   • ${worker}: ${count}개 페이지`)
      })
    console.log('')
  }

  // 종합 점수
  const score = ((pagesWithPyodide + pagesWithAnalysisFunction + pagesWithErrorHandling) / (totalPages * 3) * 100).toFixed(1)
  console.log(`🎯 종합 점수: ${score}%`)

  if (parseFloat(score) >= 95) {
    console.log('✅ 우수 - 거의 모든 메서드가 정상 구현됨')
  } else if (parseFloat(score) >= 80) {
    console.log('✅ 양호 - 대부분의 메서드가 정상 구현됨')
  } else {
    console.log('⚠️ 개선 필요')
  }

  console.log('\n' + '=' .repeat(60))

  return { analysis, score, issuePages }
}

// 메인 실행
function main() {
  console.log('=' .repeat(60))
  console.log('📊 통계 메서드 검증 스크립트 v2')
  console.log('=' .repeat(60))

  const analysis = analyzePages()
  const varReq = analyzeVariableRequirements()
  const report = generateReport(analysis, varReq)

  // 상세 결과를 JSON으로 저장 (옵션)
  // fs.writeFileSync('validation-result.json', JSON.stringify(report, null, 2))
}

main()
