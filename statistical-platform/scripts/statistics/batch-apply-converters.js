/**
 * 타입 변환 함수 일괄 적용 (ancova 패턴 기반)
 */

const fs = require('fs')
const path = require('path')

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

// 수정할 페이지와 변환 정보
const PAGES = [
  { method: 'chi-square-independence', type: 'ChiSquareIndependenceVariables', converter: 'toChiSquareIndependenceVariables' },
  { method: 'friedman', type: 'FriedmanVariables', converter: 'toFriedmanVariables' },
  { method: 'kruskal-wallis', type: 'KruskalWallisVariables', converter: 'toKruskalWallisVariables' },
  { method: 'mann-whitney', type: 'MannWhitneyVariables', converter: 'toMannWhitneyVariables' },
  { method: 'manova', type: 'MANOVAVariables', converter: 'toMANOVAVariables' },
  { method: 'mixed-model', type: 'MixedModelVariables', converter: 'toMixedModelVariables' },
  { method: 'partial-correlation', type: 'PartialCorrelationVariables', converter: 'toPartialCorrelationVariables' },
  { method: 'wilcoxon', type: 'WilcoxonVariables', converter: 'toWilcoxonVariables' },
  { method: 'frequency-table', type: 'FrequencyTableVariables', converter: 'toFrequencyTableVariables' },
  { method: 'normality-test', type: 'NormalityTestVariables', converter: 'toNormalityTestVariables' },
  { method: 'one-sample-t', type: 'OneSampleTVariables', converter: 'toOneSampleTVariables' },
  { method: 'proportion-test', type: 'ProportionTestVariables', converter: 'toProportionTestVariables' },
  { method: 'regression', type: 'RegressionVariables', converter: 'toRegressionVariables' },
  { method: 'reliability', type: 'ReliabilityVariables', converter: 'toReliabilityVariables' },
  { method: 'welch-t', type: 'WelchTVariables', converter: 'toWelchTVariables' },
  { method: 'non-parametric', type: 'NonParametricVariables', converter: 'toNonParametricVariables' }
]

console.log('='.repeat(80))
console.log('🔧 타입 변환 함수 일괄 적용')
console.log('='.repeat(80))
console.log()

let totalFixed = 0

for (const { method, type, converter } of PAGES) {
  const filePath = path.join(STATS_DIR, method, 'page.tsx')

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${method}: 파일 없음`)
    continue
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  // 1. Import 추가
  const importLine = `import { ${converter}, type VariableAssignment } from '@/types/statistics-converters'`

  if (!content.includes(converter)) {
    // import type { XXXVariables } 다음에 추가
    const importRegex = new RegExp(`(import type \\{ ${type} \\} from '@/types/statistics')`, 'g')
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `$1\n${importLine}`)
      modified = true
    }
  }

  // 2. createVariableSelectionHandler 패턴 교체
  const handlerPattern = new RegExp(
    `createVariableSelectionHandler<(?:VariableAssignment|${type})>\\(\\s*actions\\.setSelectedVariables`,
    'gs'
  )

  if (handlerPattern.test(content)) {
    // Reset regex
    content = fs.readFileSync(filePath, 'utf-8')

    // VariableAssignment import 추가 (아직 없으면)
    if (!content.includes('VariableAssignment')) {
      content = content.replace(
        new RegExp(`(import type \\{ ${type} \\} from '@/types/statistics')`),
        `$1\n${importLine}`
      )
    }

    // handler를 useCallback으로 교체
    const oldHandlerPattern = new RegExp(
      `(const handle\\w*Selection = )createVariableSelectionHandler<[^>]+>\\([^)]*actions\\.setSelectedVariables[\\s\\S]*?\\)`,
      'g'
    )

    content = content.replace(oldHandlerPattern, (match) => {
      return `const handleVariableSelection = useCallback((vars: VariableAssignment) => {
    const typedVars = ${converter}(vars)
    if (!actions.setSelectedVariables) {
      console.error('[${method}] setSelectedVariables not available')
      return
    }
    actions.setSelectedVariables(typedVars)
  }, [actions])`
    })

    modified = true
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ ${method}: 변환 함수 적용`)
    totalFixed++
  } else {
    console.log(`ℹ️  ${method}: 변경 없음 또는 다른 패턴`)
  }
}

console.log()
console.log('='.repeat(80))
console.log(`📊 완료: ${totalFixed}/${PAGES.length}개 페이지 수정`)
console.log('='.repeat(80))
