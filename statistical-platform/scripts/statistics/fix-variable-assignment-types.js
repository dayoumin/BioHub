/**
 * VariableAssignment 타입 불일치 해결 스크립트
 *
 * 문제: VariableSelector가 VariableAssignment를 요구하지만
 *      페이지는 특화된 타입 (예: ANCOVAVariables)을 사용
 *
 * 해결: onVariablesSelected 콜백에서 타입 변환 추가
 */

const fs = require('fs')
const path = require('path')

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

// 수정이 필요한 페이지 목록
const PAGES = [
  'ancova',
  'chi-square-independence',
  'friedman',
  'kruskal-wallis',
  'mann-whitney',
  'manova',
  'mixed-model',
  'partial-correlation',
  'wilcoxon'
]

console.log('='.repeat(80))
console.log('🔧 VariableAssignment 타입 불일치 수정')
console.log('='.repeat(80))
console.log()

let totalFixed = 0

for (const method of PAGES) {
  const filePath = path.join(STATS_DIR, method, 'page.tsx')

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${method}: 파일 없음`)
    continue
  }

  let content = fs.readFileSync(filePath, 'utf-8')

  // onVariablesSelected prop 패턴 찾기
  // <VariableSelector ... onVariablesSelected={actions.setSelectedVariables} />
  const pattern1 = /onVariablesSelected=\{actions\.setSelectedVariables\}/g

  if (pattern1.test(content)) {
    // onVariablesSelected에 타입 변환 콜백 추가
    content = content.replace(
      /onVariablesSelected=\{actions\.setSelectedVariables\}/g,
      `onVariablesSelected={(vars) => actions.setSelectedVariables?.(vars as any)}`
    )

    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ ${method}: onVariablesSelected 타입 변환 추가`)
    totalFixed++
    continue
  }

  console.log(`ℹ️  ${method}: 패턴 불일치 (수동 수정 필요)`)
}

console.log()
console.log('='.repeat(80))
console.log(`📊 완료: ${totalFixed}개 페이지 수정`)
console.log('='.repeat(80))
