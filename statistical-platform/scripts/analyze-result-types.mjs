/**
 * Result 타입 분석 스크립트
 *
 * 48개 통계 페이지의 Result 인터페이스를 파싱하여
 * 필드별 사용 빈도를 정확히 계산
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const STATS_DIR = './app/(dashboard)/statistics'

// 결과 저장
const results = {
  pages: [],
  fieldFrequency: {},
  errors: []
}

// 통계 페이지 디렉토리 목록
const statsDirs = readdirSync(STATS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(name => name !== 'index' && !name.startsWith('_'))

console.log(`총 ${statsDirs.length}개 통계 페이지 발견\n`)

for (const dir of statsDirs) {
  const pagePath = join(STATS_DIR, dir, 'page.tsx')

  try {
    const content = readFileSync(pagePath, 'utf-8')

    // Result 인터페이스 추출 (interface XXXResult { ... })
    const interfaceRegex = /interface\s+(\w*Result\w*)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g
    const matches = [...content.matchAll(interfaceRegex)]

    if (matches.length === 0) {
      // type alias 확인
      const typeRegex = /type\s+(\w*Result\w*)\s*=/
      const typeMatch = content.match(typeRegex)
      if (typeMatch) {
        results.pages.push({
          page: dir,
          typeName: typeMatch[1],
          fields: ['[type alias - 별도 분석 필요]'],
          source: 'type-alias'
        })
      } else {
        // 외부 import 확인
        const importRegex = /import\s+.*?(\w*Result\w*).*?from\s+['"]([^'"]+)['"]/
        const importMatch = content.match(importRegex)
        if (importMatch) {
          results.pages.push({
            page: dir,
            typeName: importMatch[1],
            fields: ['[외부 import]'],
            source: importMatch[2]
          })
        } else {
          results.errors.push({ page: dir, error: 'Result 타입 없음' })
        }
      }
      continue
    }

    // 가장 큰 (메인) Result 인터페이스 선택
    const mainInterface = matches.reduce((a, b) =>
      b[2].length > a[2].length ? b : a
    )

    const typeName = mainInterface[1]
    const body = mainInterface[2]

    // 필드 추출 (최상위 레벨만)
    const fieldRegex = /^\s*(\w+)[\?]?\s*:/gm
    const fieldMatches = [...body.matchAll(fieldRegex)]
    const fields = fieldMatches.map(m => m[1])

    results.pages.push({
      page: dir,
      typeName,
      fields,
      fieldCount: fields.length
    })

    // 필드 빈도 카운트
    for (const field of fields) {
      const normalizedField = normalizeFieldName(field)
      results.fieldFrequency[normalizedField] = (results.fieldFrequency[normalizedField] || 0) + 1
    }

    console.log(`✓ ${dir}: ${typeName} (${fields.length}개 필드)`)

  } catch (err) {
    results.errors.push({ page: dir, error: err.message })
    console.log(`✗ ${dir}: ${err.message}`)
  }
}

// 필드명 정규화 (동의어 통합)
function normalizeFieldName(field) {
  const synonyms = {
    'pvalue': 'pValue',
    'p_value': 'pValue',
    'degreesOfFreedom': 'df',
    'degrees_of_freedom': 'df',
    'sampleSize': 'n',
    'sample_size': 'n',
    'totalN': 'n',
    'nobs': 'n',
    'ciLower': 'confidenceInterval',
    'ciUpper': 'confidenceInterval',
    'ci95Lower': 'confidenceInterval',
    'ci95Upper': 'confidenceInterval',
    'confidenceIntervals': 'confidenceInterval'
  }
  return synonyms[field] || field
}

// 결과 정렬 및 출력
console.log('\n' + '='.repeat(60))
console.log('필드 사용 빈도 (내림차순)')
console.log('='.repeat(60))

const sortedFields = Object.entries(results.fieldFrequency)
  .sort((a, b) => b[1] - a[1])

const totalPages = results.pages.length

for (const [field, count] of sortedFields) {
  const percentage = ((count / totalPages) * 100).toFixed(1)
  const bar = '█'.repeat(Math.round(count / 2))
  console.log(`${field.padEnd(25)} ${String(count).padStart(2)}개 (${percentage.padStart(5)}%) ${bar}`)
}

// 카테고리별 분류
console.log('\n' + '='.repeat(60))
console.log('필드 카테고리 분류')
console.log('='.repeat(60))

const categories = {
  '핵심 공통 (80%+)': [],
  '빈번 공통 (50-80%)': [],
  '선택 공통 (20-50%)': [],
  '고유 (<20%)': []
}

for (const [field, count] of sortedFields) {
  const percentage = (count / totalPages) * 100
  if (percentage >= 80) categories['핵심 공통 (80%+)'].push({ field, count, percentage })
  else if (percentage >= 50) categories['빈번 공통 (50-80%)'].push({ field, count, percentage })
  else if (percentage >= 20) categories['선택 공통 (20-50%)'].push({ field, count, percentage })
  else categories['고유 (<20%)'].push({ field, count, percentage })
}

for (const [category, fields] of Object.entries(categories)) {
  console.log(`\n### ${category}`)
  for (const { field, count, percentage } of fields) {
    console.log(`  - ${field}: ${count}개 (${percentage.toFixed(1)}%)`)
  }
}

// 에러 목록
if (results.errors.length > 0) {
  console.log('\n' + '='.repeat(60))
  console.log('분석 실패 페이지')
  console.log('='.repeat(60))
  for (const { page, error } of results.errors) {
    console.log(`  - ${page}: ${error}`)
  }
}

// JSON 파일로 저장
const outputPath = './scripts/result-type-analysis.json'
writeFileSync(outputPath, JSON.stringify({
  summary: {
    totalPages: totalPages,
    analyzedPages: results.pages.length,
    errors: results.errors.length,
    uniqueFields: Object.keys(results.fieldFrequency).length
  },
  fieldFrequency: sortedFields.map(([field, count]) => ({
    field,
    count,
    percentage: ((count / totalPages) * 100).toFixed(1)
  })),
  categories,
  pages: results.pages,
  errors: results.errors
}, null, 2))

console.log(`\n결과 저장: ${outputPath}`)
