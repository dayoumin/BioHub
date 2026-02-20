/**
 * 타입 변환 수정: XxxVariables as VariableAssignment → as unknown
 */

const fs = require('fs')
const path = require('path')

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

const PAGES = [
  'chi-square-independence',
  'friedman',
  'kruskal-wallis',
  'mann-whitney',
  'manova',
  'wilcoxon'
]

console.log('🔧 타입 캐스팅 수정: as VariableAssignment → as unknown')
console.log('='.repeat(80))

let fixed = 0

for (const method of PAGES) {
  const filePath = path.join(STATS_DIR, method, 'page.tsx')

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${method}: 파일 없음`)
    continue
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Pattern: toXxxVariables(vars as VariableAssignment)
  // Fix: toXxxVariables(vars as unknown as VariableAssignment)
  content = content.replace(
    /(to\w+Variables\(vars as )VariableAssignment(\))/g,
    '$1unknown as VariableAssignment$2'
  )

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ ${method}`)
    fixed++
  } else {
    console.log(`ℹ️  ${method}: 변경 없음`)
  }
}

console.log('='.repeat(80))
console.log(`완료: ${fixed}/${PAGES.length}개`)
