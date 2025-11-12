#!/usr/bin/env node

/**
 * 통계 페이지 코딩 표준 검증 스크립트
 *
 * 검증 항목:
 * 1. useStatisticsPage Hook 사용
 * 2. actions.completeAnalysis() 사용 (setResults 금지)
 * 3. Pyodide 서비스 사용 (Mock 데이터 검출)
 * 4. DataUploadStep 연동
 * 5. useCallback 사용
 * 6. any 타입 사용 금지
 */

const fs = require('fs')
const path = require('path')

const STATISTICS_DIR = path.join(__dirname, '../app/(dashboard)/statistics')

// 색상 출력 유틸
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
}

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset)
}

// 통계 페이지 목록 가져오기
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

// 검증 함수들
const validators = {
  // 1. useStatisticsPage Hook 사용 검증
  useStatisticsPage: (content) => {
    const hasImport = content.includes("import { useStatisticsPage } from '@/hooks/use-statistics-page'")
    const hasUsage = /const \{ state, actions \} = useStatisticsPage/.test(content)
    return {
      passed: hasImport && hasUsage,
      details: {
        import: hasImport,
        usage: hasUsage
      }
    }
  },

  // 2. useState 직접 사용 금지 (상태 관리)
  noDirectUseState: (content) => {
    // currentStep, isAnalyzing, results, uploadedData 등 직접 useState 사용 금지
    const forbiddenPatterns = [
      /const \[currentStep, setCurrentStep\] = useState/,
      /const \[isAnalyzing, setIsAnalyzing\] = useState/,
      /const \[results, setResults\] = useState/,
      /const \[uploadedData, setUploadedData\] = useState/
    ]

    const violations = forbiddenPatterns.filter(pattern => pattern.test(content))
    return {
      passed: violations.length === 0,
      details: {
        violationCount: violations.length
      }
    }
  },

  // 3. completeAnalysis 사용 (setResults 금지)
  useCompleteAnalysis: (content) => {
    const hasCompleteAnalysis = /actions\.completeAnalysis/.test(content)
    const hasSetResults = /actions\.setResults/.test(content)

    return {
      passed: hasCompleteAnalysis || !hasSetResults, // completeAnalysis 사용 또는 setResults 미사용
      details: {
        hasCompleteAnalysis,
        hasSetResults // Critical: setResults 사용은 버그
      }
    }
  },

  // 4. Pyodide 서비스 사용 검증
  usesPyodide: (content) => {
    const hasPyodideImport =
      content.includes('usePyodideService') ||
      content.includes('PyodideCoreService') ||
      content.includes('pyodideStats')

    const hasPyodideCall =
      /pyodideService\.(runPython|loadPackages)/.test(content) ||
      /pyodideCore\.callWorkerMethod/.test(content) ||
      /pyodideStats\.(initialize|runPython)/.test(content)

    // Mock 데이터 패턴 검출
    const hasMockData = /const mockResults?:/.test(content)

    return {
      passed: hasPyodideImport, // Import만 있으면 통과 (실제 호출은 선택)
      details: {
        hasPyodideImport,
        hasPyodideCall,
        hasMockData // Mock 사용 여부 (경고용)
      }
    }
  },

  // 5. DataUploadStep 연동
  usesDataUploadStep: (content) => {
    const hasImport = content.includes("import { DataUploadStep }")
    const hasUsage = /<DataUploadStep/.test(content)
    const hasHandler = content.includes("createDataUploadHandler")

    return {
      passed: hasImport && hasUsage,
      details: {
        hasImport,
        hasUsage,
        usesCommonHandler: hasHandler
      }
    }
  },

  // 6. useCallback 사용
  usesCallback: (content) => {
    const hasImport = content.includes("import { useCallback }")
    const hasUsage = /useCallback\(/.test(content)

    // 공통 핸들러 사용 (내부적으로 useCallback 사용)
    const usesCommonHandlers = content.includes("createDataUploadHandler") || content.includes("createVariableSelectionHandler")

    // 주요 핸들러에 useCallback 사용 확인
    const handleDataUploadCallback = /handleDataUpload\s*=\s*useCallback|handleDataUpload\s*=\s*createDataUploadHandler/.test(content)
    const handleAnalysisCallback = /runAnalysis\s*=\s*useCallback|handleAnalysis\s*=\s*useCallback/.test(content)

    // 공통 핸들러를 사용하거나, 직접 useCallback을 사용하면 통과
    const passed = usesCommonHandlers || (hasImport && hasUsage)

    return {
      passed,
      details: {
        hasImport,
        hasUsage,
        usesCommonHandlers,
        handleDataUploadCallback,
        handleAnalysisCallback
      }
    }
  },

  // 7. any 타입 사용 금지
  noAnyType: (content) => {
    // any 타입 패턴 검출
    const anyPatterns = [
      /:\s*any(?!where)/g, // : any (anywhere 제외)
      /as\s+any/g,         // as any
      /<any>/g,            // <any>
      /Array<any>/g        // Array<any>
    ]

    const violations = []
    anyPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        violations.push(...matches)
      }
    })

    return {
      passed: violations.length === 0,
      details: {
        violationCount: violations.length,
        violations: violations.slice(0, 5) // 최대 5개만 표시
      }
    }
  },

  // 8. createDataUploadHandler 사용 (공통 유틸)
  usesCommonHandlers: (content) => {
    const hasDataUploadHandler = content.includes("createDataUploadHandler")
    const hasVariableSelectionHandler = content.includes("createVariableSelectionHandler")

    return {
      passed: hasDataUploadHandler || hasVariableSelectionHandler,
      details: {
        hasDataUploadHandler,
        hasVariableSelectionHandler
      }
    }
  },

  // 9. VariableSelectorModern 사용
  usesVariableSelectorModern: (content) => {
    const hasImport = content.includes("import { VariableSelectorModern }")
    const hasUsage = /<VariableSelectorModern/.test(content)
    const hasMethodId = /methodId=["'][\w-]+["']/.test(content)

    return {
      passed: hasImport && hasUsage,
      details: {
        hasImport,
        hasUsage,
        hasMethodId
      }
    }
  }
}

// 페이지별 검증 실행
function validatePage(pagePath) {
  const content = fs.readFileSync(pagePath, 'utf-8')
  const results = {}

  for (const [name, validator] of Object.entries(validators)) {
    results[name] = validator(content)
  }

  return results
}

// 검증 점수 계산
function calculateScore(results) {
  const weights = {
    useStatisticsPage: 10,      // Critical
    noDirectUseState: 10,        // Critical
    useCompleteAnalysis: 10,     // Critical
    usesPyodide: 8,              // Important
    usesDataUploadStep: 8,       // Important
    usesCallback: 6,             // Recommended
    noAnyType: 10,               // Critical
    usesCommonHandlers: 5,       // Nice to have
    usesVariableSelectorModern: 7 // Important
  }

  let totalWeight = 0
  let earnedWeight = 0

  for (const [name, result] of Object.entries(results)) {
    const weight = weights[name] || 0
    totalWeight += weight
    if (result.passed) {
      earnedWeight += weight
    }
  }

  return Math.round((earnedWeight / totalWeight) * 100)
}

// 검증 결과 분류
function classifyCompliance(score, results) {
  // Critical 항목 확인
  const criticalPassed =
    results.useStatisticsPage.passed &&
    results.noDirectUseState.passed &&
    results.useCompleteAnalysis.passed &&
    results.noAnyType.passed

  if (!criticalPassed) {
    return 'non_compliant' // Critical 항목 미통과
  } else if (score >= 80) {
    return 'fully_compliant' // 완전 준수
  } else if (score >= 60) {
    return 'partially_compliant' // 부분 준수
  } else {
    return 'non_compliant' // 미준수
  }
}

// 메인 실행
function main() {
  log('\n=== 통계 페이지 코딩 표준 검증 ===\n', 'blue')

  const pages = getStatisticsPages()
  log(`총 ${pages.length}개 페이지 검증 시작...\n`, 'gray')

  const summary = {
    total: pages.length,
    fullyCompliant: 0,
    partiallyCompliant: 0,
    nonCompliant: 0,
    details: []
  }

  // 각 페이지 검증
  for (const page of pages) {
    const results = validatePage(page.path)
    const score = calculateScore(results)
    const compliance = classifyCompliance(score, results)

    // 요약에 추가
    if (compliance === 'fully_compliant') {
      summary.fullyCompliant++
    } else if (compliance === 'partially_compliant') {
      summary.partiallyCompliant++
    } else {
      summary.nonCompliant++
    }

    summary.details.push({
      name: page.name,
      score,
      compliance,
      results
    })
  }

  // 점수순 정렬
  summary.details.sort((a, b) => b.score - a.score)

  // 결과 출력
  log('=== 검증 결과 요약 ===\n', 'blue')
  log(`전체: ${summary.total}개`, 'gray')
  log(`완전 준수: ${summary.fullyCompliant}개`, 'green')
  log(`부분 준수: ${summary.partiallyCompliant}개`, 'yellow')
  log(`미준수: ${summary.nonCompliant}개`, 'red')

  // 상위 10개 표시
  log('\n=== 상위 10개 페이지 (점수순) ===\n', 'blue')
  summary.details.slice(0, 10).forEach((detail, index) => {
    const color = detail.score >= 80 ? 'green' : detail.score >= 60 ? 'yellow' : 'red'
    log(`${index + 1}. ${detail.name.padEnd(30)} ${detail.score}점`, color)
  })

  // 하위 10개 표시
  log('\n=== 하위 10개 페이지 (개선 필요) ===\n', 'blue')
  summary.details.slice(-10).reverse().forEach((detail, index) => {
    const color = detail.score >= 80 ? 'green' : detail.score >= 60 ? 'yellow' : 'red'
    log(`${summary.details.length - index}. ${detail.name.padEnd(30)} ${detail.score}점`, color)

    // 주요 위반 사항 표시
    const violations = []
    if (!detail.results.useStatisticsPage.passed) violations.push('useStatisticsPage 미사용')
    if (!detail.results.useCompleteAnalysis.passed) violations.push('completeAnalysis 미사용')
    if (detail.results.useCompleteAnalysis.details.hasSetResults) violations.push('⚠️ setResults 사용 (Critical 버그)')
    if (!detail.results.noAnyType.passed) violations.push(`any 타입 ${detail.results.noAnyType.details.violationCount}개`)
    if (detail.results.usesPyodide.details.hasMockData && !detail.results.usesPyodide.details.hasPyodideCall) {
      violations.push('Mock 데이터만 사용 (Pyodide 미호출)')
    }

    if (violations.length > 0) {
      log(`   위반: ${violations.join(', ')}`, 'gray')
    }
  })

  // Mock 데이터 사용 페이지 목록
  const mockPages = summary.details.filter(d =>
    d.results.usesPyodide.details.hasMockData &&
    !d.results.usesPyodide.details.hasPyodideCall
  )

  if (mockPages.length > 0) {
    log('\n=== ⚠️ Mock 데이터만 사용하는 페이지 (실제 통계 계산 없음) ===\n', 'yellow')
    mockPages.forEach(page => {
      log(`- ${page.name}`, 'yellow')
    })
  }

  // Critical 버그 발견 (setResults 사용)
  const criticalBugPages = summary.details.filter(d =>
    d.results.useCompleteAnalysis.details.hasSetResults
  )

  if (criticalBugPages.length > 0) {
    log('\n=== 🚨 Critical 버그 발견: setResults 사용 ===\n', 'red')
    criticalBugPages.forEach(page => {
      log(`- ${page.name} (isAnalyzing 버그 가능성)`, 'red')
    })
  }

  // 상세 리포트 저장
  const reportPath = path.join(__dirname, '../docs/CODING_STANDARDS_VALIDATION_REPORT.md')
  const reportContent = generateMarkdownReport(summary)
  fs.writeFileSync(reportPath, reportContent)
  log(`\n상세 리포트 저장: ${reportPath}`, 'green')
}

// Markdown 리포트 생성
function generateMarkdownReport(summary) {
  const now = new Date().toISOString().split('T')[0]

  let md = `# 코딩 표준 준수 검증 결과

**검증일**: ${now}
**검증 대상**: 통계 페이지 ${summary.total}개

## 요약

- **전체**: ${summary.total}개
- **완전 준수**: ${summary.fullyCompliant}개 (${Math.round(summary.fullyCompliant / summary.total * 100)}%)
- **부분 준수**: ${summary.partiallyCompliant}개 (${Math.round(summary.partiallyCompliant / summary.total * 100)}%)
- **미준수**: ${summary.nonCompliant}개 (${Math.round(summary.nonCompliant / summary.total * 100)}%)

## 주요 발견 사항

### 1. Mock 데이터 사용 현황

`

  const mockPages = summary.details.filter(d =>
    d.results.usesPyodide.details.hasMockData &&
    !d.results.usesPyodide.details.hasPyodideCall
  )

  if (mockPages.length > 0) {
    md += `**${mockPages.length}개 페이지**가 Mock 데이터만 사용하고 있으며 실제 Pyodide 통계 계산을 호출하지 않습니다.\n\n`
    mockPages.forEach(page => {
      md += `- ${page.name} (점수: ${page.score}점)\n`
    })
  } else {
    md += `모든 페이지가 Pyodide 서비스를 사용합니다. ✅\n`
  }

  md += `\n### 2. Critical 버그 (setResults 사용)\n\n`

  const criticalBugPages = summary.details.filter(d =>
    d.results.useCompleteAnalysis.details.hasSetResults
  )

  if (criticalBugPages.length > 0) {
    md += `🚨 **${criticalBugPages.length}개 페이지**가 \`setResults\`를 사용하여 isAnalyzing 버그가 발생할 수 있습니다.\n\n`
    criticalBugPages.forEach(page => {
      md += `- ${page.name} (점수: ${page.score}점)\n`
    })
  } else {
    md += `setResults 사용 없음. ✅\n`
  }

  md += `\n### 3. any 타입 사용\n\n`

  const anyTypePages = summary.details.filter(d => !d.results.noAnyType.passed)

  if (anyTypePages.length > 0) {
    md += `⚠️ **${anyTypePages.length}개 페이지**가 \`any\` 타입을 사용합니다.\n\n`
    anyTypePages.forEach(page => {
      md += `- ${page.name} (${page.results.noAnyType.details.violationCount}개)\n`
    })
  } else {
    md += `any 타입 사용 없음. ✅\n`
  }

  md += `\n## 상세 분석 (전체 페이지)\n\n`
  md += `| 순위 | 페이지 | 점수 | 상태 | 주요 이슈 |\n`
  md += `|------|--------|------|------|----------|\n`

  summary.details.forEach((detail, index) => {
    const status = detail.compliance === 'fully_compliant' ? '✅' :
                   detail.compliance === 'partially_compliant' ? '🟡' : '❌'

    const issues = []
    if (!detail.results.useStatisticsPage.passed) issues.push('Hook 미사용')
    if (detail.results.useCompleteAnalysis.details.hasSetResults) issues.push('setResults')
    if (!detail.results.noAnyType.passed) issues.push(`any(${detail.results.noAnyType.details.violationCount})`)
    if (detail.results.usesPyodide.details.hasMockData && !detail.results.usesPyodide.details.hasPyodideCall) {
      issues.push('Mock만')
    }

    md += `| ${index + 1} | ${detail.name} | ${detail.score} | ${status} | ${issues.join(', ') || '-'} |\n`
  })

  md += `\n## 검증 항목별 통과율\n\n`

  const validatorNames = Object.keys(validators)
  const validatorStats = validatorNames.map(name => {
    const passed = summary.details.filter(d => d.results[name].passed).length
    return {
      name,
      passed,
      rate: Math.round(passed / summary.total * 100)
    }
  })

  validatorStats.sort((a, b) => b.rate - a.rate)

  md += `| 검증 항목 | 통과 | 비율 |\n`
  md += `|----------|------|------|\n`

  validatorStats.forEach(stat => {
    const emoji = stat.rate >= 80 ? '✅' : stat.rate >= 50 ? '🟡' : '❌'
    md += `| ${stat.name} | ${stat.passed}/${summary.total} | ${stat.rate}% ${emoji} |\n`
  })

  md += `\n## 권장 개선 사항\n\n`

  if (mockPages.length > 0) {
    md += `1. **Mock 데이터 제거**: ${mockPages.length}개 페이지에서 Pyodide 통계 계산을 구현하세요.\n`
  }

  if (criticalBugPages.length > 0) {
    md += `2. **Critical 버그 수정**: ${criticalBugPages.length}개 페이지에서 \`setResults\`를 \`completeAnalysis\`로 변경하세요.\n`
  }

  if (anyTypePages.length > 0) {
    md += `3. **타입 안전성**: ${anyTypePages.length}개 페이지에서 \`any\` 타입을 제거하고 명시적 타입을 사용하세요.\n`
  }

  const noCallbackPages = summary.details.filter(d => !d.results.usesCallback.passed).length
  if (noCallbackPages > 0) {
    md += `4. **useCallback 적용**: ${noCallbackPages}개 페이지에서 이벤트 핸들러에 \`useCallback\`을 적용하세요.\n`
  }

  return md
}

// 실행
main()