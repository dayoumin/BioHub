/**
 * 주석 처리된 SelectedVariables 인터페이스 사용을 표준 타입으로 교체
 */

const fs = require('fs')
const path = require('path')

// 에러가 발생하는 페이지들과 해당 표준 타입 매핑
const FIXES = {
  'anova': 'ANOVAVariables',
  'chi-square-goodness': 'ChiSquareGoodnessVariables',
  'cross-tabulation': 'CrossTabulationVariables',
  'means-plot': 'MeansPlotVariables',
  'response-surface': 'ResponseSurfaceVariables',
  'stepwise': 'StepwiseVariables',
}

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

console.log('='.repeat(80))
console.log('📝 주석 처리된 인터페이스 참조 수정')
console.log('='.repeat(80))
console.log()

let totalChanges = 0

for (const [method, standardType] of Object.entries(FIXES)) {
  const filePath = path.join(STATS_DIR, method, 'page.tsx')

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${method}: 파일 없음`)
    continue
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  let changed = false

  // 1. 타입 참조 교체: _variables: SelectedVariables → _variables: StandardType
  const typeRefPattern = new RegExp(`(\\w+):\\s*SelectedVariables(?!\\w)`, 'g')
  if (typeRefPattern.test(content)) {
    content = content.replace(typeRefPattern, `$1: ${standardType}`)
    changed = true
  }

  // 2. 타입 캐스팅 교체: variables as SelectedVariables → variables as StandardType
  const castPattern = /as\s+SelectedVariables(?!\w)/g
  if (castPattern.test(content)) {
    content = content.replace(castPattern, `as ${standardType}`)
    changed = true
  }

  // 3. Generic 타입 파라미터: <..., SelectedVariables> → <..., StandardType>
  const genericPattern = /<([^>]+),\s*SelectedVariables>/g
  if (genericPattern.test(content)) {
    content = content.replace(genericPattern, `<$1, ${standardType}>`)
    changed = true
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ ${method}: SelectedVariables → ${standardType}`)
    totalChanges++
  } else {
    console.log(`ℹ️  ${method}: 변경 사항 없음`)
  }
}

console.log()
console.log('='.repeat(80))
console.log(`📊 완료: ${totalChanges}개 페이지 수정`)
console.log('='.repeat(80))
