/**
 * 나머지 createVariableSelectionHandler 페이지 수정
 */

const fs = require('fs')
const path = require('path')

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

const PAGES = [
  { method: 'chi-square-independence', type: 'ChiSquareIndependenceVariables', converter: 'toChiSquareIndependenceVariables' },
  { method: 'kruskal-wallis', type: 'KruskalWallisVariables', converter: 'toKruskalWallisVariables' },
  { method: 'mann-whitney', type: 'MannWhitneyVariables', converter: 'toMannWhitneyVariables' },
  { method: 'manova', type: 'MANOVAVariables', converter: 'toMANOVAVariables' },
  { method: 'mixed-model', type: 'MixedModelVariables', converter: 'toMixedModelVariables' },
  { method: 'partial-correlation', type: 'PartialCorrelationVariables', converter: 'toPartialCorrelationVariables' },
  { method: 'wilcoxon', type: 'WilcoxonVariables', converter: 'toWilcoxonVariables' }
]

console.log('🔧 createVariableSelectionHandler 타입 변환 적용')
console.log('='.repeat(80))

let fixed = 0

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
    const typeImport = `import type { ${type} }`
    if (content.includes(typeImport)) {
      content = content.replace(typeImport, `${typeImport}\n${importLine}`)
      modified = true
    }
  }

  // 2. createVariableSelectionHandler 수정
  const oldPattern = new RegExp(
    `createVariableSelectionHandler<(?:VariableAssignment|${type})>\\(\\s*actions\\.setSelectedVariables,`,
    'g'
  )

  if (oldPattern.test(content)) {
    content = content.replace(
      oldPattern,
      `createVariableSelectionHandler<${type}>(\n    (vars) => actions.setSelectedVariables?.(vars ? ${converter}(vars as VariableAssignment) : null),`
    )
    modified = true
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ ${method}`)
    fixed++
  } else {
    console.log(`ℹ️  ${method}: 변경 없음`)
  }
}

console.log('='.repeat(80))
console.log(`완료: ${fixed}/${PAGES.length}개`)
