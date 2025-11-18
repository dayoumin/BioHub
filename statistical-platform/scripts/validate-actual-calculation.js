#!/usr/bin/env node

/**
 * 통계 43개 페이지 실제 계산 검증 스크립트
 *
 * 검증 항목:
 * 1. PyodideCore 실제 계산 코드 존재
 * 2. Worker 메서드 호출 확인
 * 3. Mock 패턴 검출 (setTimeout, 하드코딩)
 * 4. 계산 방법 분류 (PyodideCore, JavaScript, None)
 */

const fs = require('fs')
const path = require('path')

const STATISTICS_DIR = path.join(__dirname, '../app/(dashboard)/statistics')

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
    .filter(dirent => !dirent.name.startsWith('_')) // __tests__ 제외
    .map(dirent => ({
      name: dirent.name,
      path: path.join(STATISTICS_DIR, dirent.name, 'page.tsx')
    }))
    .filter(page => fs.existsSync(page.path))
}

// PyodideCore 패턴 검증
function detectPyodideCore(content) {
  const patterns = [
    /PyodideCoreService\.getInstance/,
    /pyodideCore\.callWorkerMethod/,
    /from ['"]@\/lib\/services\/pyodide-core['"]/
  ]

  const matches = patterns.filter(p => p.test(content)).length

  // Worker 번호 및 메서드 추출
  const workerCalls = content.matchAll(/callWorkerMethod<[^>]*>\(\s*PyodideWorker\.(\w+),\s*['"]([^'"]+)['"]/g)
  const workers = new Set()
  const methods = new Set()

  for (const match of workerCalls) {
    workers.add(match[1]) // Worker1, Worker2, etc.
    methods.add(match[2]) // 메서드명
  }

  return {
    detected: matches >= 2,
    workers: Array.from(workers),
    methods: Array.from(methods),
    confidence: matches
  }
}

// JavaScript 직접 계산 검증
function detectJavaScriptCalc(content) {
  const patterns = [
    /frequencyMap\s*=\s*new Map/,
    /const\s+mean\s*=.*\.reduce/,
    /const\s+median\s*=/,
    /Math\.(sqrt|pow|abs)/
  ]

  const matches = patterns.filter(p => p.test(content)).length

  return {
    detected: matches >= 2,
    confidence: matches
  }
}

// Mock 패턴 검출
function detectMockPattern(content) {
  const patterns = [
    /setTimeout\([^)]*setResults/,
    /setTimeout\([^)]*setIsAnalyzing/,
    /const\s+mockResult\s*=/,
    /\/\/ (Mock|TODO|임시)/i,
    /return\s*{\s*statistic:\s*\d/
  ]

  const mockMatches = patterns.filter(p => p.test(content))

  return {
    detected: mockMatches.length > 0,
    count: mockMatches.length,
    patterns: mockMatches.map(p => p.toString())
  }
}

// 페이지 검증
function validatePage(page) {
  const content = fs.readFileSync(page.path, 'utf-8')

  const pyodide = detectPyodideCore(content)
  const javascript = detectJavaScriptCalc(content)
  const mock = detectMockPattern(content)

  let calculationMethod = 'None'
  let status = 'fail'
  let details = {}

  if (pyodide.detected) {
    calculationMethod = 'PyodideCore'
    status = mock.detected ? 'warning' : 'pass'
    details = {
      workers: pyodide.workers,
      methods: pyodide.methods,
      confidence: pyodide.confidence
    }
  } else if (javascript.detected) {
    calculationMethod = 'JavaScript'
    status = mock.detected ? 'warning' : 'pass'
    details = {
      confidence: javascript.confidence
    }
  }

  return {
    name: page.name,
    status,
    calculationMethod,
    details,
    mock: mock.detected ? mock : null
  }
}

// 메인 실행
function main() {
  log('\n📊 통계 43개 페이지 실제 계산 검증\n', 'cyan')
  log('='.repeat(80), 'gray')

  const pages = getStatisticsPages()
  const results = pages.map(validatePage)

  // 통계
  const total = results.length
  const passCount = results.filter(r => r.status === 'pass').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const failCount = results.filter(r => r.status === 'fail').length

  const pyodideCoreCount = results.filter(r => r.calculationMethod === 'PyodideCore').length
  const javascriptCount = results.filter(r => r.calculationMethod === 'JavaScript').length
  const noneCount = results.filter(r => r.calculationMethod === 'None').length

  // 결과 출력
  log('\n📋 검증 결과:\n', 'blue')

  // Pass (Green)
  results.filter(r => r.status === 'pass').forEach((result, index) => {
    log(`✅ ${result.name}`, 'green')
    log(`   계산: ${result.calculationMethod}`, 'gray')
    if (result.details.workers && result.details.workers.length > 0) {
      log(`   Workers: [${result.details.workers.join(', ')}]`, 'gray')
    }
    if (result.details.methods && result.details.methods.length > 0) {
      log(`   메서드: ${result.details.methods.join(', ')}`, 'gray')
    }
  })

  // Warning (Yellow)
  if (warningCount > 0) {
    log('\n⚠️  경고 (Mock 패턴 검출):\n', 'yellow')
    results.filter(r => r.status === 'warning').forEach((result) => {
      log(`⚠️  ${result.name}`, 'yellow')
      log(`   계산: ${result.calculationMethod}`, 'gray')
      log(`   Mock 패턴: ${result.mock.count}개`, 'red')
    })
  }

  // Fail (Red)
  if (failCount > 0) {
    log('\n❌ 실패 (계산 코드 없음):\n', 'red')
    results.filter(r => r.status === 'fail').forEach((result) => {
      log(`❌ ${result.name}`, 'red')
      log(`   계산: ${result.calculationMethod}`, 'gray')
    })
  }

  // 요약
  log('\n' + '='.repeat(80), 'gray')
  log('\n📊 검증 요약:\n', 'cyan')
  log(`전체 페이지: ${total}개`, 'blue')
  log(`✅ 통과: ${passCount}개 (${Math.round(passCount/total*100)}%)`, passCount === total ? 'green' : 'yellow')
  log(`⚠️  경고: ${warningCount}개 (${Math.round(warningCount/total*100)}%)`, warningCount === 0 ? 'green' : 'yellow')
  log(`❌ 실패: ${failCount}개 (${Math.round(failCount/total*100)}%)`, failCount === 0 ? 'green' : 'red')

  log('\n계산 방법 분포:', 'blue')
  log(`  - PyodideCore: ${pyodideCoreCount}개 (${Math.round(pyodideCoreCount/total*100)}%)`, 'green')
  log(`  - JavaScript: ${javascriptCount}개 (${Math.round(javascriptCount/total*100)}%)`, javascriptCount === 0 ? 'green' : 'yellow')
  log(`  - None: ${noneCount}개 (${Math.round(noneCount/total*100)}%)`, noneCount === 0 ? 'green' : 'red')

  log('\n' + '='.repeat(80), 'gray')

  // JSON 리포트 저장
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      pass: passCount,
      warning: warningCount,
      fail: failCount,
      pyodideCore: pyodideCoreCount,
      javascript: javascriptCount,
      none: noneCount
    },
    results: results.map(r => ({
      name: r.name,
      status: r.status,
      method: r.calculationMethod,
      details: r.details,
      hasMock: r.mock !== null
    }))
  }

  const reportPath = path.join(__dirname, '../test-results/calculation-validation.json')
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  log(`\n📄 리포트 저장: ${reportPath}`, 'cyan')
  log('\n', 'reset')

  // 종료 코드
  process.exit(failCount > 0 ? 1 : 0)
}

main()