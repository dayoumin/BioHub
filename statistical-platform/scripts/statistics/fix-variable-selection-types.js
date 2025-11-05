/**
 * VariableSelection 로컬 인터페이스를 표준 타입으로 교체
 */

const fs = require('fs')
const path = require('path')

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

const PAGES = [
  { method: 'discriminant', type: 'DiscriminantVariables', converter: 'toDiscriminantVariables' },
  { method: 'ks-test', type: 'KSTestVariables', converter: 'toKSTestVariables' },
  { method: 'pca', type: 'PCAVariables', converter: 'toPCAVariables' }
]

console.log('🔧 VariableSelection → 표준 타입 교체')
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

  // 2. VariableSelection 인터페이스 주석 처리
  const varSelectionPattern = /^interface VariableSelection \{[^}]+\}/gm
  if (varSelectionPattern.test(content)) {
    content = content.replace(varSelectionPattern, (match) => {
      return `// 로컬 인터페이스 제거: types/statistics.ts의 ${type} 사용\n// ${match.replace(/\n/g, '\n// ')}`
    })
    modified = true
  }

  // 3. VariableSelection → 표준 타입으로 교체
  content = content.replace(/: VariableSelection\b/g, `: ${type}`)
  content = content.replace(/<VariableSelection>/g, `<${type}>`)
  content = content.replace(/\(VariableSelection\)/g, `(${type})`)

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
