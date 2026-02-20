/**
 * 실제 변수 사용 패턴 분석 스크립트
 *
 * 목적: 코드가 selectedVariables를 어떻게 사용하는지 분석
 * - 직접 배열 접근 (selectedVariables.length)
 * - 객체 필드 접근 (selectedVariables.dependent)
 * - useStatisticsPage 타입 파라미터
 */

const fs = require('fs')
const path = require('path')

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

// 분석할 통계 페이지 목록
const METHODS = [
  'descriptive', 'frequency-table',
  'one-sample-t', 'welch-t',
  'anova', 'ancova', 'manova',
  'correlation', 'partial-correlation',
  'regression', 'stepwise', 'ordinal-regression', 'mixed-model',
  'chi-square', 'chi-square-goodness', 'chi-square-independence', 'mcnemar',
  'non-parametric', 'mann-whitney', 'kruskal-wallis', 'wilcoxon', 'friedman', 'sign-test', 'runs-test',
  'normality-test', 'ks-test',
  'proportion-test',
  'mann-kendall',
  'reliability',
  'pca', 'factor-analysis', 'cluster', 'discriminant',
  'response-surface', 'dose-response', 'cross-tabulation',
  'poisson',
  'means-plot'
]

/**
 * 파일에서 패턴 추출
 */
function analyzeUsagePatterns(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const result = {
    // 1. useStatisticsPage 타입 파라미터
    hookTypeParam: null,

    // 2. 로컬 인터페이스 정의
    localInterface: null,

    // 3. selectedVariables 사용 패턴
    usagePatterns: {
      arrayLike: [],      // selectedVariables.length, .filter(), .map() 등
      objectField: [],    // selectedVariables.dependent, .independent 등
      direct: []          // selectedVariables를 직접 함수에 전달
    },

    // 4. VariableSelector에 전달하는 값
    variableSelectorValue: null,

    // 5. 변수 할당 코드
    variableAssignment: []
  }

  // 1. useStatisticsPage 타입 파라미터
  const hookPattern = /useStatisticsPage<([^>]+)>/
  const hookMatch = content.match(hookPattern)
  if (hookMatch) {
    const typeParams = hookMatch[1].split(',').map(s => s.trim())
    result.hookTypeParam = typeParams[1] || 'none'
  }

  // 2. 로컬 인터페이스 정의 (변수 관련만)
  const interfacePattern = /interface\s+(VariableSelection|SelectedVariables?|.*Variables)\s*\{([^}]+)\}/g
  let interfaceMatch
  while ((interfaceMatch = interfacePattern.exec(content)) !== null) {
    const name = interfaceMatch[1]
    const body = interfaceMatch[2]

    // 변수 관련 필드 확인
    const hasVarFields = /\b(dependent|independent|groups|all|items|conditions|covariates)\s*[:?]/.test(body)
    if (hasVarFields && !name.includes('Results') && !name.includes('Options')) {
      result.localInterface = {
        name,
        body: body.trim()
      }
    }
  }

  // 3. selectedVariables 사용 패턴
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    const lineNum = idx + 1

    // 배열처럼 사용
    if (/selectedVariables\s*\.\s*(length|filter|map|find|some|every|forEach|includes|join|slice)/.test(line)) {
      result.usagePatterns.arrayLike.push({
        line: lineNum,
        code: line.trim()
      })
    }

    // 객체 필드 접근
    if (/selectedVariables\s*\.\s*(dependent|independent|groups|all|items|conditions|covariates|location|row|column|rows|columns|data|dose|response|observed)/.test(line)) {
      result.usagePatterns.objectField.push({
        line: lineNum,
        code: line.trim()
      })
    }

    // 직접 전달
    if (/[\(\[,]\s*selectedVariables\s*[\)\],]/.test(line) && !line.includes('setSelectedVariables')) {
      result.usagePatterns.direct.push({
        line: lineNum,
        code: line.trim()
      })
    }
  })

  // 4. VariableSelector value prop
  const selectorPattern = /<VariableSelector[^>]*value=\{([^}]+)\}/
  const selectorMatch = content.match(selectorPattern)
  if (selectorMatch) {
    result.variableSelectorValue = selectorMatch[1].trim()
  }

  // 5. 변수 할당 (setSelectedVariables 호출)
  const setVarPattern = /setSelectedVariables\(([^)]+)\)/g
  let setVarMatch
  while ((setVarMatch = setVarPattern.exec(content)) !== null) {
    result.variableAssignment.push(setVarMatch[1].trim())
  }

  return result
}

/**
 * 사용 패턴 분류
 */
function classifyPattern(analysis) {
  const { usagePatterns, localInterface } = analysis

  // Pattern A: 배열로 사용 (selectedVariables.length, .map() 등)
  if (usagePatterns.arrayLike.length > 0 && usagePatterns.objectField.length === 0) {
    return {
      pattern: 'A-Array',
      description: 'selectedVariables를 string[] 배열처럼 사용',
      recommendation: 'string[] 타입 사용'
    }
  }

  // Pattern B: 객체 필드 접근만 (selectedVariables.dependent, .independent 등)
  if (usagePatterns.objectField.length > 0 && usagePatterns.arrayLike.length === 0) {
    return {
      pattern: 'B-Object',
      description: 'selectedVariables를 객체로 사용 (필드 접근)',
      recommendation: '{ dependent?: string[], independent?: string[], ... } 타입 사용'
    }
  }

  // Pattern C: 혼합 사용
  if (usagePatterns.arrayLike.length > 0 && usagePatterns.objectField.length > 0) {
    return {
      pattern: 'C-Mixed',
      description: '배열과 객체 둘 다 사용 (불일치 가능성)',
      recommendation: '코드 리팩토링 필요 (하나의 패턴으로 통일)'
    }
  }

  // Pattern D: 직접 전달만
  if (usagePatterns.direct.length > 0 && usagePatterns.arrayLike.length === 0 && usagePatterns.objectField.length === 0) {
    return {
      pattern: 'D-Direct',
      description: 'selectedVariables를 함수에 직접 전달',
      recommendation: '함수 시그니처 확인 필요'
    }
  }

  // Pattern E: 사용 안함 (초기화만)
  return {
    pattern: 'E-NoUsage',
    description: 'selectedVariables 사용 코드 없음',
    recommendation: 'any 타입 가능'
  }
}

/**
 * 모든 페이지 분석
 */
function analyzeAll() {
  console.log('='.repeat(80))
  console.log('📊 실제 변수 사용 패턴 분석')
  console.log('='.repeat(80))
  console.log()

  const results = []
  const patternStats = {
    'A-Array': 0,
    'B-Object': 0,
    'C-Mixed': 0,
    'D-Direct': 0,
    'E-NoUsage': 0
  }

  for (const method of METHODS) {
    const pagePath = path.join(STATS_DIR, method, 'page.tsx')

    if (!fs.existsSync(pagePath)) {
      continue
    }

    const analysis = analyzeUsagePatterns(pagePath)
    const classification = classifyPattern(analysis)

    patternStats[classification.pattern]++

    results.push({
      method,
      analysis,
      classification
    })
  }

  // 패턴별로 그룹화
  const grouped = {}
  for (const pattern in patternStats) {
    grouped[pattern] = results.filter(r => r.classification.pattern === pattern)
  }

  // 결과 출력
  console.log('📈 패턴 통계:')
  console.log('-'.repeat(80))
  for (const [pattern, count] of Object.entries(patternStats)) {
    const percentage = ((count / results.length) * 100).toFixed(1)
    console.log(`${pattern}: ${count}개 (${percentage}%)`)
  }
  console.log()

  // 각 패턴별 상세 출력
  for (const [pattern, items] of Object.entries(grouped)) {
    if (items.length === 0) continue

    console.log('='.repeat(80))
    console.log(`📋 ${pattern} 패턴 (${items.length}개)`)
    console.log('='.repeat(80))
    console.log()

    if (items.length > 0) {
      console.log(`설명: ${items[0].classification.description}`)
      console.log(`권장: ${items[0].classification.recommendation}`)
      console.log()
    }

    for (const item of items) {
      console.log(`### ${item.method}`)

      // useStatisticsPage 타입
      if (item.analysis.hookTypeParam) {
        console.log(`  Hook 타입: ${item.analysis.hookTypeParam}`)
      }

      // 로컬 인터페이스
      if (item.analysis.localInterface) {
        console.log(`  로컬 인터페이스: ${item.analysis.localInterface.name}`)
        console.log(`    ${item.analysis.localInterface.body.replace(/\n/g, '\n    ')}`)
      }

      // VariableSelector value
      if (item.analysis.variableSelectorValue) {
        console.log(`  VariableSelector value: ${item.analysis.variableSelectorValue}`)
      }

      // 사용 패턴 예시
      if (item.analysis.usagePatterns.arrayLike.length > 0) {
        console.log(`  배열 사용 (${item.analysis.usagePatterns.arrayLike.length}개):`)
        item.analysis.usagePatterns.arrayLike.slice(0, 3).forEach(u => {
          console.log(`    Line ${u.line}: ${u.code}`)
        })
      }

      if (item.analysis.usagePatterns.objectField.length > 0) {
        console.log(`  객체 필드 (${item.analysis.usagePatterns.objectField.length}개):`)
        item.analysis.usagePatterns.objectField.slice(0, 3).forEach(u => {
          console.log(`    Line ${u.line}: ${u.code}`)
        })
      }

      console.log()
    }
  }

  // 마크다운 리포트 생성
  generateMarkdownReport(results, patternStats, grouped)
}

/**
 * 마크다운 리포트 생성
 */
function generateMarkdownReport(results, patternStats, grouped) {
  const reportPath = path.join(__dirname, '../../docs/ACTUAL_VARIABLE_USAGE_ANALYSIS.md')

  let md = `# 실제 변수 사용 패턴 분석 리포트

**생성일**: ${new Date().toISOString().split('T')[0]}
**목적**: types/statistics.ts 타입 정의를 실제 코드 사용 패턴에 맞게 수정

---

## 📊 요약

| 패턴 | 개수 | 비율 | 설명 |
|------|------|------|------|
`

  for (const [pattern, count] of Object.entries(patternStats)) {
    const percentage = ((count / results.length) * 100).toFixed(1)
    const item = grouped[pattern][0]
    const desc = item ? item.classification.description : '-'
    md += `| ${pattern} | ${count}개 | ${percentage}% | ${desc} |\n`
  }

  md += `
**총 분석 페이지**: ${results.length}개

---

## 🔍 패턴별 상세

`

  for (const [pattern, items] of Object.entries(grouped)) {
    if (items.length === 0) continue

    md += `
### ${pattern} 패턴 (${items.length}개)

**설명**: ${items[0].classification.description}

**권장 사항**: ${items[0].classification.recommendation}

**해당 페이지**:

`

    for (const item of items) {
      md += `#### ${item.method}\n\n`

      if (item.analysis.hookTypeParam) {
        md += `- **Hook 타입 파라미터**: \`${item.analysis.hookTypeParam}\`\n`
      }

      if (item.analysis.localInterface) {
        md += `- **로컬 인터페이스**: \`${item.analysis.localInterface.name}\`\n`
        md += `\`\`\`typescript\n${item.analysis.localInterface.body}\n\`\`\`\n`
      }

      if (item.analysis.variableSelectorValue) {
        md += `- **VariableSelector value**: \`${item.analysis.variableSelectorValue}\`\n`
      }

      if (item.analysis.usagePatterns.arrayLike.length > 0) {
        md += `- **배열 사용** (${item.analysis.usagePatterns.arrayLike.length}건):\n`
        item.analysis.usagePatterns.arrayLike.slice(0, 2).forEach(u => {
          md += `  - Line ${u.line}: \`${u.code}\`\n`
        })
      }

      if (item.analysis.usagePatterns.objectField.length > 0) {
        md += `- **객체 필드 접근** (${item.analysis.usagePatterns.objectField.length}건):\n`
        item.analysis.usagePatterns.objectField.slice(0, 2).forEach(u => {
          md += `  - Line ${u.line}: \`${u.code}\`\n`
        })
      }

      md += '\n'
    }
  }

  md += `
---

## 💡 수정 권장사항

### 1. types/statistics.ts 수정

`

  // Pattern A (배열) 페이지 목록
  const arrayPages = grouped['A-Array'] || []
  if (arrayPages.length > 0) {
    md += `
#### Pattern A (배열 사용) - ${arrayPages.length}개

이 페이지들은 \`selectedVariables\`를 \`string[]\` 배열로 사용합니다.

**해당 메서드**:
${arrayPages.map(p => `- ${p.method}`).join('\n')}

**타입 정의 수정**:
\`\`\`typescript
// 현재 (잘못됨):
export interface ClusterVariables {
  all: string[]  // 객체 구조
}

// 수정 후 (올바름):
export type ClusterVariables = string[]  // 직접 배열
\`\`\`
`
  }

  // Pattern B (객체) 페이지 목록
  const objectPages = grouped['B-Object'] || []
  if (objectPages.length > 0) {
    md += `
#### Pattern B (객체 사용) - ${objectPages.length}개

이 페이지들은 \`selectedVariables\`를 객체로 사용합니다. 현재 타입이 올바릅니다.

**해당 메서드**:
${objectPages.map(p => `- ${p.method}`).join('\n')}
`
  }

  // Pattern C (혼합) 페이지 목록
  const mixedPages = grouped['C-Mixed'] || []
  if (mixedPages.length > 0) {
    md += `
#### Pattern C (혼합 사용) - ${mixedPages.length}개

⚠️ 이 페이지들은 배열과 객체를 혼용합니다. 코드 리팩토링이 필요합니다.

**해당 메서드**:
${mixedPages.map(p => `- ${p.method}`).join('\n')}
`
  }

  md += `
### 2. 페이지 코드 수정

- **Pattern A** 페이지: 타입 정의만 수정하면 됨
- **Pattern B** 페이지: 수정 불필요 (이미 올바름)
- **Pattern C** 페이지: 코드 리팩토링 필요 (배열 또는 객체 중 선택)

---

**생성**: AI 자동 분석
`

  fs.writeFileSync(reportPath, md, 'utf-8')
  console.log()
  console.log('='.repeat(80))
  console.log(`✅ 리포트 생성 완료: ${reportPath}`)
  console.log('='.repeat(80))
}

// 실행
try {
  analyzeAll()
} catch (error) {
  console.error('❌ 오류:', error.message)
  process.exit(1)
}
