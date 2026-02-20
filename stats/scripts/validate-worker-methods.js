/**
 * Python Worker 메서드 존재 여부 검증 스크립트
 * 각 통계 페이지가 호출하는 Worker 메서드가 실제로 구현되어 있는지 확인
 */

const fs = require('fs')
const path = require('path')

// Worker 파일 경로
const WORKERS = {
  Descriptive: 'public/workers/python/worker1-descriptive.py',
  Hypothesis: 'public/workers/python/worker2-hypothesis.py',
  NonparametricAnova: 'public/workers/python/worker3-nonparametric-anova.py',
  RegressionAdvanced: 'public/workers/python/worker4-regression-advanced.py'
}

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

// Worker 파일에서 정의된 메서드 추출
function extractWorkerMethods(workerPath) {
  const fullPath = path.join(__dirname, '..', workerPath)
  if (!fs.existsSync(fullPath)) {
    console.error(`Worker 파일 없음: ${workerPath}`)
    return []
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const methodMatches = content.match(/^def (\w+)\(/gm)

  if (!methodMatches) return []

  return methodMatches.map(m => m.replace(/^def (\w+)\(.*/, '$1'))
    .filter(m => !m.startsWith('_')) // private 메서드 제외
}

// 페이지에서 호출하는 Worker 메서드 추출
function extractPageWorkerCalls(pagePath) {
  if (!fs.existsSync(pagePath)) {
    return []
  }

  const content = fs.readFileSync(pagePath, 'utf-8')
  const calls = []

  // 패턴: PyodideWorker.WorkerName, 'method_name'
  // 또는: PyodideWorker.WorkerName,\n      'method_name'
  const patterns = [
    // 한 줄에 있는 경우
    /PyodideWorker\.(\w+)[^']*'(\w+)'/g,
    // 여러 줄에 걸친 경우
    /PyodideWorker\.(\w+)[\s\S]*?'(\w+)'/g
  ]

  // 모든 callWorkerMethod 호출 찾기
  const callMatches = content.matchAll(/callWorkerMethod[^(]*\([^)]*PyodideWorker\.(\w+)[^']*'(\w+)'/g)
  for (const match of callMatches) {
    calls.push({
      worker: match[1],
      method: match[2]
    })
  }

  // 간단한 패턴도 찾기 (한 줄에 worker와 method가 있는 경우)
  const simpleMatches = content.matchAll(/PyodideWorker\.(\w+)[^'"\n]{0,50}['"](\w+)['"]/g)
  for (const match of simpleMatches) {
    const existing = calls.find(c => c.worker === match[1] && c.method === match[2])
    if (!existing) {
      calls.push({
        worker: match[1],
        method: match[2]
      })
    }
  }

  return calls
}

// 메인 검증
function main() {
  console.log('=' .repeat(60))
  console.log('🐍 Python Worker 메서드 검증')
  console.log('=' .repeat(60))

  // 1. 각 Worker의 메서드 목록 추출
  console.log('\n📋 [1/3] Worker 메서드 목록 추출...\n')
  const workerMethods = {}

  Object.entries(WORKERS).forEach(([name, filePath]) => {
    workerMethods[name] = extractWorkerMethods(filePath)
    console.log(`${name}: ${workerMethods[name].length}개 메서드`)
  })

  // 2. 페이지별 Worker 호출 분석
  console.log('\n🔍 [2/3] 페이지별 Worker 호출 분석...\n')

  const pageCallsMap = {}
  let totalCalls = 0

  STATISTICS_PAGES.forEach(page => {
    const pagePath = path.join(__dirname, '..', 'app', '(dashboard)', 'statistics', page, 'page.tsx')
    const calls = extractPageWorkerCalls(pagePath)
    pageCallsMap[page] = calls
    totalCalls += calls.length
  })

  console.log(`총 ${STATISTICS_PAGES.length}개 페이지에서 ${totalCalls}개 Worker 호출 발견`)

  // 3. 메서드 존재 여부 검증
  console.log('\n✅ [3/3] 메서드 존재 여부 검증...\n')

  const missing = []
  const found = []
  const noWorkerPages = []

  STATISTICS_PAGES.forEach(page => {
    const calls = pageCallsMap[page]

    if (calls.length === 0) {
      noWorkerPages.push(page)
      return
    }

    calls.forEach(({ worker, method }) => {
      const methods = workerMethods[worker]
      if (!methods) {
        missing.push({ page, worker, method, reason: 'Worker 없음' })
        return
      }

      if (methods.includes(method)) {
        found.push({ page, worker, method })
      } else {
        missing.push({ page, worker, method, reason: '메서드 미정의' })
      }
    })
  })

  // 결과 출력
  console.log('=' .repeat(60))
  console.log('📊 검증 결과')
  console.log('=' .repeat(60))

  console.log(`\n✅ 정상: ${found.length}개 호출`)
  console.log(`❌ 누락: ${missing.length}개 호출`)
  console.log(`⚠️ Worker 미사용: ${noWorkerPages.length}개 페이지`)

  if (missing.length > 0) {
    console.log('\n❌ 누락된 메서드:')
    missing.forEach(({ page, worker, method, reason }) => {
      console.log(`   • ${page}: ${worker}.${method} (${reason})`)
    })
  }

  if (noWorkerPages.length > 0) {
    console.log('\n⚠️ Worker 호출 미확인 페이지:')
    console.log(`   → ${noWorkerPages.join(', ')}`)
  }

  // Worker별 사용 통계
  console.log('\n📈 Worker별 사용 통계:')
  const workerUsage = {}
  found.forEach(({ worker }) => {
    workerUsage[worker] = (workerUsage[worker] || 0) + 1
  })

  Object.entries(workerUsage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([worker, count]) => {
      console.log(`   • ${worker}: ${count}회 호출`)
    })

  // 종합 점수
  const score = found.length > 0
    ? ((found.length / (found.length + missing.length)) * 100).toFixed(1)
    : '0.0'

  console.log(`\n🎯 메서드 존재율: ${score}%`)

  if (parseFloat(score) === 100) {
    console.log('✅ 모든 Worker 메서드가 정상 구현됨')
  } else if (parseFloat(score) >= 90) {
    console.log('⚠️ 일부 메서드 누락 - 확인 필요')
  } else {
    console.log('❌ 다수 메서드 누락 - 긴급 점검 필요')
  }

  console.log('\n' + '=' .repeat(60))

  return { found, missing, noWorkerPages, workerMethods }
}

main()
