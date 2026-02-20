/**
 * 모든 통계 페이지에 최근 사용 추적 기능 추가
 */

const fs = require('fs')
const path = require('path')

// 통계 ID와 파일 경로 매핑
const statisticsMapping = [
  { id: 'explore-data', file: 'explore-data/page.tsx' },
  { id: 'descriptive', file: 'descriptive/page.tsx' }, // 이미 적용됨
  { id: 'frequency-table', file: 'frequency-table/page.tsx' },
  { id: 'cross-tabulation', file: 'cross-tabulation/page.tsx' },
  { id: 'reliability', file: 'reliability/page.tsx' },
  { id: 't-test', file: 't-test/page.tsx' },
  { id: 'one-sample-t', file: 'one-sample-t/page.tsx' },
  { id: 'welch-t', file: 'welch-t/page.tsx' },
  { id: 'one-sample-proportion', file: 'proportion-test/page.tsx' },
  { id: 'means-plot', file: 'means-plot/page.tsx' },
  { id: 'anova', file: 'anova/page.tsx' },
  { id: 'ancova', file: 'ancova/page.tsx' },
  { id: 'manova', file: 'manova/page.tsx' },
  { id: 'mixed-model', file: 'mixed-model/page.tsx' },
  { id: 'correlation', file: 'correlation/page.tsx' },
  { id: 'partial-correlation', file: 'partial-correlation/page.tsx' },
  { id: 'regression', file: 'regression/page.tsx' },
  { id: 'stepwise-regression', file: 'stepwise/page.tsx' },
  { id: 'ordinal-regression', file: 'ordinal-regression/page.tsx' },
  { id: 'poisson-regression', file: 'poisson/page.tsx' },
  { id: 'dose-response', file: 'dose-response/page.tsx' },
  { id: 'response-surface', file: 'response-surface/page.tsx' },
  { id: 'non-parametric', file: 'non-parametric/page.tsx' },
  { id: 'mann-whitney', file: 'mann-whitney/page.tsx' },
  { id: 'wilcoxon', file: 'wilcoxon/page.tsx' },
  { id: 'kruskal-wallis', file: 'kruskal-wallis/page.tsx' },
  { id: 'friedman', file: 'friedman/page.tsx' },
  { id: 'sign-test', file: 'sign-test/page.tsx' },
  { id: 'runs-test', file: 'runs-test/page.tsx' },
  { id: 'kolmogorov-smirnov', file: 'ks-test/page.tsx' },
  { id: 'mcnemar', file: 'mcnemar/page.tsx' },
  { id: 'cochran-q', file: 'cochran-q/page.tsx' },
  { id: 'mood-median', file: 'mood-median/page.tsx' },
  { id: 'binomial-test', file: 'binomial-test/page.tsx' },
  { id: 'chi-square-independence', file: 'chi-square-independence/page.tsx' },
  { id: 'chi-square-goodness', file: 'chi-square-goodness/page.tsx' },
  { id: 'chi-square', file: 'chi-square/page.tsx' },
  { id: 'factor-analysis', file: 'factor-analysis/page.tsx' },
  { id: 'pca', file: 'pca/page.tsx' },
  { id: 'cluster-analysis', file: 'cluster/page.tsx' },
  { id: 'discriminant', file: 'discriminant/page.tsx' },
  { id: 'normality-test', file: 'normality-test/page.tsx' },
  { id: 'mann-kendall', file: 'mann-kendall/page.tsx' },
  { id: 'power-analysis', file: 'power-analysis/page.tsx' }
]

const basePath = path.join(__dirname, '../app/(dashboard)/statistics')

let processedCount = 0
let skippedCount = 0
let errorCount = 0

statisticsMapping.forEach(({ id, file }) => {
  const filePath = path.join(basePath, file)

  try {
    // 파일 읽기
    let content = fs.readFileSync(filePath, 'utf8')

    // 이미 추가되었는지 확인
    if (content.includes('addToRecentStatistics')) {
      console.log(`✓ Skipped (already added): ${file}`)
      skippedCount++
      return
    }

    // 1. import 추가
    const importLine = "import { addToRecentStatistics } from '@/lib/utils/recent-statistics'"

    // React import 다음에 추가
    const reactImportRegex = /^import React[^\n]+\n/m
    const match = content.match(reactImportRegex)

    if (match) {
      const insertPos = match.index + match[0].length
      content = content.slice(0, insertPos) + importLine + '\n' + content.slice(insertPos)
    } else {
      // React import가 없으면 'use client' 다음에 추가
      content = content.replace(/'use client'\n/, `'use client'\n\n${importLine}\n`)
    }

    // 2. useEffect 추가
    const useEffectCode = `
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('${id}')
  }, [])
`

    // export default function 바로 다음에 추가
    const functionRegex = /export default function [A-Za-z]+\(\) \{/
    const funcMatch = content.match(functionRegex)

    if (funcMatch) {
      const insertPos = funcMatch.index + funcMatch[0].length
      content = content.slice(0, insertPos) + useEffectCode + content.slice(insertPos)
    } else {
      throw new Error('Could not find function declaration')
    }

    // 파일 쓰기
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✓ Processed: ${file}`)
    processedCount++

  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message)
    errorCount++
  }
})

console.log('\n=== Summary ===')
console.log(`Processed: ${processedCount}`)
console.log(`Skipped: ${skippedCount}`)
console.log(`Errors: ${errorCount}`)
console.log(`Total: ${statisticsMapping.length}`)
