/**
 * 41개 통계 메서드의 변수 필드명 일관성 분석
 */

const fs = require('fs')
const path = require('path')

const TYPES_FILE = path.join(__dirname, '../../types/statistics.ts')

console.log('📊 변수 필드명 일관성 분석')
console.log('='.repeat(80))

const content = fs.readFileSync(TYPES_FILE, 'utf-8')

// 모든 인터페이스 추출
const interfaceRegex = /export interface (\w+Variables) \{([^}]+)\}/g
const interfaces = []
let match

while ((match = interfaceRegex.exec(content)) !== null) {
  const name = match[1]
  const body = match[2]

  // 필드 추출 (주석 제거)
  const fields = body
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map(line => {
      const fieldMatch = line.match(/^(\w+)(\?)?:\s*(.+)/)
      if (fieldMatch) {
        return {
          name: fieldMatch[1],
          optional: !!fieldMatch[2],
          type: fieldMatch[3].replace(/\/\/.*$/, '').trim()
        }
      }
      return null
    })
    .filter(Boolean)

  interfaces.push({ name, fields })
}

console.log(`\n총 ${interfaces.length}개 인터페이스 발견\n`)

// 필드명 통계
const fieldCounts = {}
interfaces.forEach(iface => {
  iface.fields.forEach(field => {
    fieldCounts[field.name] = (fieldCounts[field.name] || 0) + 1
  })
})

console.log('📋 필드명 사용 빈도 (5회 이상):')
Object.entries(fieldCounts)
  .filter(([_, count]) => count >= 5)
  .sort((a, b) => b[1] - a[1])
  .forEach(([name, count]) => {
    console.log(`  ${name.padEnd(20)} : ${count}회`)
  })

// dependent/independent vs row/column 분석
console.log('\n🔍 주요 필드명 패턴 분석:')
console.log('\n1️⃣ dependent 사용:')
interfaces
  .filter(iface => iface.fields.some(f => f.name === 'dependent'))
  .forEach(iface => {
    const depField = iface.fields.find(f => f.name === 'dependent')
    const indepField = iface.fields.find(f => f.name === 'independent')
    console.log(`  - ${iface.name.padEnd(40)} : dependent: ${depField.type}${indepField ? `, independent: ${indepField.type}` : ''}`)
  })

console.log('\n2️⃣ row/column 사용:')
interfaces
  .filter(iface => iface.fields.some(f => f.name === 'row' || f.name === 'column'))
  .forEach(iface => {
    const rowField = iface.fields.find(f => f.name === 'row')
    const colField = iface.fields.find(f => f.name === 'column')
    console.log(`  - ${iface.name.padEnd(40)} : ${rowField ? `row: ${rowField.type}` : ''}${colField ? `, column: ${colField.type}` : ''}`)
  })

console.log('\n3️⃣ groups 사용:')
interfaces
  .filter(iface => iface.fields.some(f => f.name === 'groups'))
  .forEach(iface => {
    const field = iface.fields.find(f => f.name === 'groups')
    console.log(`  - ${iface.name.padEnd(40)} : groups: ${field.type}`)
  })

console.log('\n4️⃣ all/variables 사용:')
interfaces
  .filter(iface => iface.fields.some(f => f.name === 'all' || f.name === 'variables'))
  .forEach(iface => {
    const allField = iface.fields.find(f => f.name === 'all')
    const varsField = iface.fields.find(f => f.name === 'variables')
    console.log(`  - ${iface.name.padEnd(40)} : ${allField ? `all: ${allField.type}` : ''}${varsField ? `variables: ${varsField.type}` : ''}`)
  })

// 이상한 패턴 찾기
console.log('\n⚠️  일관성 검토 필요:')
console.log('\n  Chi-Square Independence:')
const chiSq = interfaces.find(i => i.name === 'ChiSquareIndependenceVariables')
if (chiSq) {
  console.log(`    현재: ${chiSq.fields.map(f => `${f.name}: ${f.type}`).join(', ')}`)
  console.log(`    ℹ️  row/column은 교차표(contingency table)에 적합`)
  console.log(`    ℹ️  dependent/independent는 회귀/ANOVA에 적합`)
}

console.log('\n='.repeat(80))
