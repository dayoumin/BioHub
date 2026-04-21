#!/usr/bin/env node

/**
 * 통계 페이지 실제 계산 검증 스크립트
 *
 * 검증 항목:
 * 1. PyodideCore/JavaScript 실제 계산 코드 존재
 * 2. Mock 데이터 패턴 검출 (setTimeout, 하드코딩)
 * 3. 통계 메서드 호출 확인
 * 4. Groups 또는 Worker 연결 확인
 */

const fs = require('fs')
const path = require('path')

const STATISTICS_DIR = path.join(__dirname, '../app/(dashboard)/statistics')
const DATA_TOOLS_DIR = path.join(__dirname, '../app/(dashboard)/data-tools')

// 색상 출력
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset)
}

// 통계 페이지 목록
function getStatisticsPages() {
  const dirs = fs.readdirSync(STATISTICS_DIR, { withFileTypes: true })
  return dirs
    .filter(dirent => dirent.isDirectory())
    .map(dirent => ({
      name: dirent.name,
      path: path.join(STATISTICS_DIR, dirent.name, 'page.tsx')
    }))
    .filter(page => fs.existsSync(page.path))
}

// 실제 계산 패턴 검증
const calculationValidators = {
  // Pyodide 사용 (PyodideCore + pyodideStats + 구형)
  usesPyodide: (content) => {
    // 최신 PyodideCore 패턴
    const pyodideCorePatterns = [
      /PyodideCoreService\.getInstance/,
      /pyodideService\.callWorkerMethod/,
      /pyodideCore\.callWorkerMethod/
    ]

    // pyodideStats 패턴 (Groups 레벨 간접 호출)
    const pyodideStatsPatterns = [
      /from '@\/lib\/services\/pyodide-statistics'/,
      /pyodideStats\./,
      /await pyodideStats\.(tTest|anova|correlation|mannWhitney|wilcoxon|kruskalWallis)/
    ]

    // 구형 Pyodide 패턴
    const compatPyodidePatterns = [
      /loadPyodideWithPackages/,
      /pyodide\.runPythonAsync/,
      /pyodide\.globals\.set/
    ]

    const coreMatches = pyodideCorePatterns.filter(p => p.test(content)).length
    const statsMatches = pyodideStatsPatterns.filter(p => p.test(content)).length
    const compatMatches = compatPyodidePatterns.filter(p => p.test(content)).length

    const hasPyodideCore = coreMatches >= 2
    const hasPyodideStats = statsMatches >= 2
    const hasCompatPyodide = compatMatches >= 2

    // Worker 번호 추출
    let workerIds = []
    const workerMatch = content.match(/callWorkerMethod<[^>]*>\((\d+)/g)
    if (workerMatch) {
      workerIds = workerMatch.map(m => m.match(/\((\d+)/)[1])
    }

    let method = null
    let type = null

    if (hasPyodideCore) {
      method = 'PyodideCore'
      type = 'Core'
    } else if (hasPyodideStats) {
      method = 'pyodideStats'
      type = 'Stats'
    } else if (hasCompatPyodide) {
      method = 'Pyodide (Compat)'
      type = 'Compat'
    }

    return {
      passed: hasPyodideCore || hasPyodideStats || hasCompatPyodide,
      method: method || 'PyodideCore',
      details: {
        patterns: coreMatches + statsMatches + compatMatches,
        workers: [...new Set(workerIds)],
        type: type || 'Unknown'
      }
    }
  },

  // JavaScript 직접 계산 (빈도표, 교차표 등)
  usesJavaScriptCalc: (content) => {
    const patterns = [
      /frequencyMap\s*=\s*new Map/,
      /\.reduce\(/,
      /Math\.(mean|median|std|sum)/,
      /for\s*\([^)]*\)\s*{[^}]*calculate/i
    ]

    const matches = patterns.filter(p => p.test(content))

    return {
      passed: matches.length >= 1,
      method: 'JavaScript',
      details: {
        patterns: matches.length
      }
    }
  },

  // Groups 레벨 통계 (간접 호출)
  usesGroups: (content) => {
    const patterns = [
      /from '@\/lib\/statistics\/groups/,
      /\.group\.ts'/,
      /descriptive\.group/,
      /hypothesis\.group/,
      /nonparametric\.group/
    ]

    const matches = patterns.filter(p => p.test(content))

    return {
      passed: matches.length >= 1,
      method: 'Groups',
      details: {
        patterns: matches.length
      }
    }
  },

  // Mock 데이터 패턴 검출 (나쁜 패턴)
  detectsMock: (content) => {
    const mockPatterns = [
      /setTimeout\([^)]*setResults/,
      /setTimeout\([^)]*completeAnalysis/,
      /const\s+mockResult\s*=/,
      /\/\/ Mock data/i,
      /testStatistic:\s*\d+\.\d+[,\s]*pValue:\s*0\.\d+[,\s]*$/m,
      /return\s*{\s*statistic:\s*\d/
    ]

    const mockMatches = mockPatterns.filter(p => p.test(content))

    return {
      hasMock: mockMatches.length > 0,
      details: {
        patterns: mockMatches.length
      }
    }
  }
}

// 통계 메서드 추출
function extractStatisticalMethods(content) {
  const methods = new Set()

  // PyodideCore 메서드
  const pyodideMethods = content.match(/callWorkerMethod<[^>]*>\(\d+,\s*'([^']+)'/g)
  if (pyodideMethods) {
    pyodideMethods.forEach(m => {
      const match = m.match(/'([^']+)'/)
      if (match) methods.add(match[1])
    })
  }

  // Groups 메서드
  const groupsMethods = content.match(/\.(descriptive|tTest|anova|correlation|mannWhitney|wilcoxon)\(/g)
  if (groupsMethods) {
    groupsMethods.forEach(m => {
      methods.add(m.replace('.', '').replace('(', ''))
    })
  }

  return Array.from(methods)
}

// 페이지 검증
function validatePage(page) {
  const content = fs.readFileSync(page.path, 'utf-8')

  const pyodide = calculationValidators.usesPyodide(content)
  const javascript = calculationValidators.usesJavaScriptCalc(content)
  const groups = calculationValidators.usesGroups(content)
  const mock = calculationValidators.detectsMock(content)

  const hasRealCalculation = pyodide.passed || javascript.passed || groups.passed
  const methods = extractStatisticalMethods(content)

  // 계산 방법 결정
  let calculationMethod = 'None'
  let calculationDetails = {}

  if (pyodide.passed) {
    calculationMethod = pyodide.method
    calculationDetails = pyodide.details
  } else if (javascript.passed) {
    calculationMethod = 'JavaScript'
    calculationDetails = javascript.details
  } else if (groups.passed) {
    calculationMethod = 'Groups'
    calculationDetails = groups.details
  }

  return {
    name: page.name,
    hasRealCalculation,
    calculationMethod,
    calculationDetails,
    hasMock: mock.hasMock,
    mockDetails: mock.details,
    methods,
    passed: hasRealCalculation && !mock.hasMock
  }
}

// 메인 실행
function main() {
  log('\n📊 통계 페이지 실제 계산 검증\n', 'cyan')
  log('=' .repeat(80), 'gray')

  const pages = getStatisticsPages()
  const results = pages.map(validatePage)

  // 통계
  const totalPages = results.length
  const passedPages = results.filter(r => r.passed).length
  const realCalcPages = results.filter(r => r.hasRealCalculation).length
  const mockPages = results.filter(r => r.hasMock).length

  // 계산 방법별 통계
  const pyodideCoreCount = results.filter(r => r.calculationMethod === 'PyodideCore').length
  const javascriptCount = results.filter(r => r.calculationMethod === 'JavaScript').length
  const groupsCount = results.filter(r => r.calculationMethod === 'Groups').length
  const noneCount = results.filter(r => r.calculationMethod === 'None').length

  // 결과 출력
  log('\n📋 검증 결과:\n', 'blue')

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : result.hasRealCalculation ? '🟡' : '❌'
    const color = result.passed ? 'green' : result.hasRealCalculation ? 'yellow' : 'red'

    log(`${icon} ${index + 1}. ${result.name}`, color)
    log(`   계산 방법: ${result.calculationMethod}`, 'gray')

    if (result.calculationMethod === 'PyodideCore' && result.calculationDetails.workers.length > 0) {
      log(`   Workers: [${result.calculationDetails.workers.join(', ')}]`, 'gray')
    }

    if (result.methods.length > 0) {
      log(`   메서드: ${result.methods.join(', ')}`, 'gray')
    }

    if (result.hasMock) {
      log(`   ⚠️  Mock 패턴 검출됨 (${result.mockDetails.patterns}개)`, 'red')
    }

    console.log()
  })

  // 요약
  log('=' .repeat(80), 'gray')
  log('\n📊 검증 요약 (통계 페이지만):\n', 'cyan')
  log(`통계 페이지: ${totalPages}개 (전체 44개 중 데이터 도구 2개 제외)`, 'blue')
  log(`실제 계산: ${realCalcPages}개 (${Math.round(realCalcPages/totalPages*100)}%)`, realCalcPages === totalPages ? 'green' : 'yellow')
  log(`Mock 패턴: ${mockPages}개 (${Math.round(mockPages/totalPages*100)}%)`, mockPages === 0 ? 'green' : 'red')
  log(`완전 통과: ${passedPages}개 (${Math.round(passedPages/totalPages*100)}%)`, passedPages === totalPages ? 'green' : 'yellow')

  log('\n계산 방법 분포:', 'blue')
  log(`  - PyodideCore: ${pyodideCoreCount}개 (${Math.round(pyodideCoreCount/totalPages*100)}%)`, 'green')
  log(`  - JavaScript: ${javascriptCount}개 (${Math.round(javascriptCount/totalPages*100)}%)`, javascriptCount === 0 ? 'green' : 'yellow')
  log(`  - Groups: ${groupsCount}개 (${Math.round(groupsCount/totalPages*100)}%)`, groupsCount === 0 ? 'green' : 'yellow')
  log(`  - None: ${noneCount}개 (${Math.round(noneCount/totalPages*100)}%)`, noneCount === 0 ? 'green' : 'red')

  log('\n💡 참고: 전체 44개 = 통계 42개 + 데이터 도구 2개 (frequency-table, cross-tabulation)', 'gray')

  // 실패한 페이지 목록
  const failedPages = results.filter(r => !r.passed)
  if (failedPages.length > 0) {
    log('\n❌ 개선 필요 페이지:', 'red')
    failedPages.forEach(page => {
      const reason = page.hasMock ? 'Mock 패턴 사용' : '실제 계산 코드 없음'
      log(`  - ${page.name}: ${reason}`, 'red')
    })
  }

  log('\n' + '='.repeat(80), 'gray')

  // 종료 코드
  process.exit(failedPages.length > 0 ? 1 : 0)
}

main()
