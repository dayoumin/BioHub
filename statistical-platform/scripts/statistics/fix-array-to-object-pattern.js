/**
 * 배열 패턴을 객체 패턴으로 변경하는 스크립트
 *
 * 대상: factor-analysis (cluster와 동일한 패턴)
 * 변경: selectedVariables.xxx → selectedVariables.all.xxx
 */

const fs = require('fs')
const path = require('path')

const TARGET_FILE = path.join(__dirname, '../../app/(dashboard)/statistics/factor-analysis/page.tsx')

console.log('📝 factor-analysis 페이지 수정 시작...')

let content = fs.readFileSync(TARGET_FILE, 'utf-8')
let changeCount = 0

// 1. selectedVariables.length → selectedVariables.all.length (조건부 체인 고려)
const patterns = [
  // 단순 접근
  { from: /selectedVariables\.length/g, to: 'selectedVariables.all.length' },
  { from: /selectedVariables\.filter/g, to: 'selectedVariables.all.filter' },
  { from: /selectedVariables\.map/g, to: 'selectedVariables.all.map' },
  { from: /selectedVariables\.includes/g, to: 'selectedVariables.all.includes' },
  { from: /selectedVariables\.join/g, to: 'selectedVariables.all.join' },
  { from: /selectedVariables\.slice/g, to: 'selectedVariables.all.slice' },

  // spread 연산자: [...selectedVariables] → [...selectedVariables.all]
  { from: /\[\.\.\.(selectedVariables)\]/g, to: '[...$1.all]' },

  // null 병합: (selectedVariables ?? []) → (selectedVariables?.all ?? [])
  { from: /\(selectedVariables \?\? \[\]\)/g, to: '(selectedVariables?.all ?? [])' },
]

for (const pattern of patterns) {
  const before = content
  content = content.replace(pattern.from, pattern.to)
  if (content !== before) {
    changeCount++
  }
}

// 2. setSelectedVariables([...]) → setSelectedVariables({ all: [...] })
// 더 정확한 패턴 매칭 필요
const lines = content.split('\n')
const modifiedLines = []

for (let i = 0; i < lines.length; i++) {
  let line = lines[i]

  // setSelectedVariables([...]) 패턴
  if (line.includes('setSelectedVariables') && !line.includes('setSelectedVariables({')) {
    // 이미 { all: } 형태가 아닌 경우만 수정
    if (/setSelectedVariables\(\[/.test(line)) {
      line = line.replace(/setSelectedVariables\(\[([^\]]+)\]\)/, 'setSelectedVariables({ all: [$1] })')
      changeCount++
    }
  }

  modifiedLines.push(line)
}

content = modifiedLines.join('\n')

// 3. 파일 저장
fs.writeFileSync(TARGET_FILE, content, 'utf-8')

console.log(`✅ 완료! ${changeCount}개 패턴 수정`)
console.log()
console.log('수정 내용:')
console.log('  - selectedVariables.length → selectedVariables.all.length')
console.log('  - selectedVariables.filter() → selectedVariables.all.filter()')
console.log('  - selectedVariables.includes() → selectedVariables.all.includes()')
console.log('  - [...selectedVariables] → [...selectedVariables.all]')
console.log('  - setSelectedVariables([...]) → setSelectedVariables({ all: [...] })')
