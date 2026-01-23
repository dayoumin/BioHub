/**
 * UI 패턴 분석 스크립트
 *
 * 48개 통계 페이지에서 반복되는 UI 패턴을 분석하여
 * 공통 컴포넌트로 추출할 수 있는 후보를 식별
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const STATS_DIR = './app/(dashboard)/statistics'

const patterns = {
  // 결과 표시 패턴
  pValueDisplay: {
    regex: /pValue.*<\s*0\.001.*0\.001.*toFixed/g,
    description: 'p-value 표시 (< 0.001 처리)',
    pages: []
  },
  significanceCheck: {
    regex: /pValue\s*<\s*0\.05\s*\?/g,
    description: '유의성 판단 (p < 0.05)',
    pages: []
  },
  effectSizeInterpret: {
    regex: /effect.*interpretation|interpret.*effect/gi,
    description: '효과크기 해석',
    pages: []
  },
  confidenceInterval: {
    regex: /\[.*lower.*upper.*\]|ci.*Lower.*Upper|95%\s*CI/gi,
    description: '신뢰구간 표시',
    pages: []
  },

  // Card 기반 결과 표시
  resultCard: {
    regex: /<Card[^>]*>[\s\S]*?<CardTitle[^>]*>.*결과|Result/gi,
    description: '결과 카드 섹션',
    pages: []
  },
  summaryCard: {
    regex: /<Card[^>]*>[\s\S]*?요약|Summary/gi,
    description: '요약 카드 섹션',
    pages: []
  },
  interpretationSection: {
    regex: /해석|interpretation|결론|conclusion/gi,
    description: '해석/결론 섹션',
    pages: []
  },

  // 통계량 표시
  statisticDisplay: {
    regex: /statistic.*toFixed|F\s*=|t\s*=|chi.*=|z\s*=/gi,
    description: '검정통계량 표시',
    pages: []
  },
  dfDisplay: {
    regex: /df\s*=|자유도|degrees.*freedom/gi,
    description: '자유도 표시',
    pages: []
  },

  // 가정 검정
  assumptionSection: {
    regex: /assumption|가정.*검정|정규성|등분산|Shapiro|Levene/gi,
    description: '가정 검정 섹션',
    pages: []
  },

  // 사후검정
  postHocSection: {
    regex: /post.*hoc|사후.*검정|Tukey|Bonferroni|다중비교/gi,
    description: '사후검정 섹션',
    pages: []
  },

  // 시각화
  chartSection: {
    regex: /ResponsiveContainer|BarChart|LineChart|ScatterChart|recharts/g,
    description: '차트/시각화 섹션',
    pages: []
  }
}

// 공통 컴포넌트 사용 현황
const commonComponents = {
  StatisticsTable: { count: 0, pages: [] },
  PValueBadge: { count: 0, pages: [] },
  EffectSizeCard: { count: 0, pages: [] },
  ConfidenceIntervalDisplay: { count: 0, pages: [] },
  AssumptionTestCard: { count: 0, pages: [] },
  StatisticalResultCard: { count: 0, pages: [] },
  ResultInterpretation: { count: 0, pages: [] },
  ResultContextHeader: { count: 0, pages: [] },
  EasyExplanation: { count: 0, pages: [] },
  NextStepsCard: { count: 0, pages: [] }
}

// 통계 페이지 목록
const statsDirs = readdirSync(STATS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(name => name !== 'index' && !name.startsWith('_'))

console.log(`총 ${statsDirs.length}개 통계 페이지 분석\n`)

for (const dir of statsDirs) {
  const pagePath = join(STATS_DIR, dir, 'page.tsx')

  try {
    const content = readFileSync(pagePath, 'utf-8')

    // 패턴 매칭
    for (const [name, pattern] of Object.entries(patterns)) {
      const matches = content.match(pattern.regex)
      if (matches && matches.length > 0) {
        pattern.pages.push({ page: dir, count: matches.length })
      }
    }

    // 공통 컴포넌트 사용 확인
    for (const [compName, data] of Object.entries(commonComponents)) {
      if (content.includes(compName)) {
        data.count++
        data.pages.push(dir)
      }
    }

  } catch (err) {
    // 무시
  }
}

// 결과 출력
console.log('=' .repeat(70))
console.log('1. 반복 UI 패턴 분석')
console.log('=' .repeat(70))

const sortedPatterns = Object.entries(patterns)
  .map(([name, data]) => ({
    name,
    description: data.description,
    pageCount: data.pages.length,
    percentage: ((data.pages.length / statsDirs.length) * 100).toFixed(1)
  }))
  .sort((a, b) => b.pageCount - a.pageCount)

for (const p of sortedPatterns) {
  const bar = '█'.repeat(Math.round(p.pageCount / 2))
  console.log(`${p.description.padEnd(30)} ${String(p.pageCount).padStart(2)}개 (${p.percentage.padStart(5)}%) ${bar}`)
}

console.log('\n' + '=' .repeat(70))
console.log('2. 공통 컴포넌트 활용 현황')
console.log('=' .repeat(70))

const sortedComponents = Object.entries(commonComponents)
  .map(([name, data]) => ({
    name,
    count: data.count,
    percentage: ((data.count / statsDirs.length) * 100).toFixed(1)
  }))
  .sort((a, b) => b.count - a.count)

for (const c of sortedComponents) {
  const bar = '█'.repeat(Math.round(c.count / 2))
  console.log(`${c.name.padEnd(30)} ${String(c.count).padStart(2)}개 (${c.percentage.padStart(5)}%) ${bar}`)
}

// 공통화 기회 분석
console.log('\n' + '=' .repeat(70))
console.log('3. 공통 컴포넌트화 기회 (패턴 O, 컴포넌트 사용 X)')
console.log('=' .repeat(70))

const opportunities = []

// p-value: 패턴은 많은데 PValueBadge 사용은 적음
const pValuePatternPages = patterns.pValueDisplay.pages.length + patterns.significanceCheck.pages.length
const pValueCompPages = commonComponents.PValueBadge.count
if (pValuePatternPages > pValueCompPages * 2) {
  opportunities.push({
    pattern: 'p-value 표시',
    patternPages: pValuePatternPages,
    compPages: pValueCompPages,
    gap: pValuePatternPages - pValueCompPages,
    recommendation: 'PValueBadge 컴포넌트 활용 확대'
  })
}

// 효과크기
const effectPatternPages = patterns.effectSizeInterpret.pages.length
const effectCompPages = commonComponents.EffectSizeCard.count
if (effectPatternPages > effectCompPages * 2) {
  opportunities.push({
    pattern: '효과크기 표시',
    patternPages: effectPatternPages,
    compPages: effectCompPages,
    gap: effectPatternPages - effectCompPages,
    recommendation: 'EffectSizeCard 컴포넌트 활용 확대'
  })
}

// 신뢰구간
const ciPatternPages = patterns.confidenceInterval.pages.length
const ciCompPages = commonComponents.ConfidenceIntervalDisplay.count
if (ciPatternPages > ciCompPages) {
  opportunities.push({
    pattern: '신뢰구간 표시',
    patternPages: ciPatternPages,
    compPages: ciCompPages,
    gap: ciPatternPages - ciCompPages,
    recommendation: 'ConfidenceIntervalDisplay 컴포넌트 활용 시작'
  })
}

// 가정 검정
const assumptionPatternPages = patterns.assumptionSection.pages.length
const assumptionCompPages = commonComponents.AssumptionTestCard.count
if (assumptionPatternPages > assumptionCompPages * 2) {
  opportunities.push({
    pattern: '가정 검정 섹션',
    patternPages: assumptionPatternPages,
    compPages: assumptionCompPages,
    gap: assumptionPatternPages - assumptionCompPages,
    recommendation: 'AssumptionTestCard 컴포넌트 활용 확대'
  })
}

// 해석 섹션
const interpretPatternPages = patterns.interpretationSection.pages.length
const interpretCompPages = commonComponents.ResultInterpretation.count
if (interpretPatternPages > interpretCompPages) {
  opportunities.push({
    pattern: '해석/결론 섹션',
    patternPages: interpretPatternPages,
    compPages: interpretCompPages,
    gap: interpretPatternPages - interpretCompPages,
    recommendation: 'ResultInterpretation 컴포넌트 활용 시작'
  })
}

for (const opp of opportunities) {
  console.log(`\n[${opp.pattern}]`)
  console.log(`  - 패턴 발견: ${opp.patternPages}개 페이지`)
  console.log(`  - 컴포넌트 사용: ${opp.compPages}개 페이지`)
  console.log(`  - 갭: ${opp.gap}개 페이지`)
  console.log(`  → 권장: ${opp.recommendation}`)
}

// JSON 저장
const output = {
  summary: {
    totalPages: statsDirs.length,
    analyzedPatterns: Object.keys(patterns).length,
    commonComponents: Object.keys(commonComponents).length
  },
  patterns: sortedPatterns,
  componentUsage: sortedComponents,
  opportunities: opportunities
}

writeFileSync('./scripts/ui-pattern-analysis.json', JSON.stringify(output, null, 2))
console.log('\n결과 저장: ./scripts/ui-pattern-analysis.json')
