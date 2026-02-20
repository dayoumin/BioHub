#!/usr/bin/env node
/**
 * Mutation Test Runner — 테스트가 진짜인지 검증
 *
 * 원리: 소스 코드를 일부러 망가뜨린(mutate) 후 테스트를 돌린다.
 *       테스트가 실패하면 = 테스트가 진짜 (KILLED)
 *       테스트가 통과하면 = 테스트가 가짜 (SURVIVED)
 *
 * 사용법:
 *   node scripts/test-quality/mutation-test.mjs <test-file> <source-file>
 *
 * 예시:
 *   node scripts/test-quality/mutation-test.mjs \
 *     __tests__/components/smart-flow/steps/MethodBrowser.test.tsx \
 *     components/smart-flow/steps/purpose/MethodBrowser.tsx
 *
 * 결과 해석:
 *   KILLED  = 테스트가 돌연변이를 잡아냄 (좋음)
 *   SURVIVED = 테스트가 못 잡음 (테스트 부실)
 *   ERROR   = 돌연변이 적용 실패 (무시)
 *
 *   Mutation Score = KILLED / (KILLED + SURVIVED) × 100%
 *   70% 이상이면 양호, 50% 미만이면 테스트 보강 필요
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

const ROOT = resolve(import.meta.dirname, '../..')

// ── Mutation Strategies ────────────────────────────────
// 각 전략은 소스 코드에서 특정 패턴을 찾아 망가뜨린다

const strategies = [
  {
    name: 'filter-to-noop',
    desc: '.filter() 콜백을 항상 true로 변경',
    find: /\.filter\s*\(\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*\{/g,
    replace: (match) => match.replace(/=>\s*\{/, '=> { return true; /* MUTANT */'),
  },
  {
    name: 'filter-arrow-to-noop',
    desc: '.filter(x => expr) 한줄 필터를 항상 true로 변경',
    find: /\.filter\s*\(\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*(?!\{)[^\n)]+\)/g,
    replace: (match) => {
      // .filter(m => matchesQuery(m) && isNotIncompatible(m)) → .filter(m => true)
      const arrowIdx = match.indexOf('=>')
      if (arrowIdx === -1) return match
      const beforeArrow = match.substring(0, arrowIdx + 2)
      return beforeArrow + ' true /* MUTANT */)'
    },
  },
  {
    name: 'condition-flip',
    desc: 'if 조건의 === 를 !== 로 변경',
    find: /if\s*\([^)]*===(?!=)[^)]*\)/g,
    replace: (match) => match.replace('===', '!== /* MUTANT */'),
  },
  {
    name: 'condition-flip-not',
    desc: 'if 조건의 !== 를 === 로 변경',
    find: /if\s*\([^)]*!==(?!=)[^)]*\)/g,
    replace: (match) => match.replace('!==', '=== /* MUTANT */'),
  },
  {
    name: 'return-null',
    desc: 'return 값을 null로 변경',
    find: /return\s+(?!null|undefined|false|true|\{|\[|;)[^\n;]+;/g,
    replace: () => 'return null; /* MUTANT */',
  },
  {
    name: 'callback-noop',
    desc: 'onClick/onChange 등 이벤트 핸들러를 빈 함수로 변경',
    find: /(?:onClick|onChange|onMouseEnter|onMouseLeave|onSelect|onSubmit)\s*=\s*\{[^}]+\}/g,
    replace: (match) => {
      const eqIdx = match.indexOf('=')
      return match.substring(0, eqIdx + 1) + '{() => {/* MUTANT */}}'
    },
  },
  {
    name: 'state-setter-noop',
    desc: 'setState 호출을 제거',
    find: /set[A-Z]\w+\s*\([^)]+\)/g,
    replace: (match) => `void 0 /* MUTANT: ${match.substring(0, 20)}... */`,
  },
]

// ── Runner ─────────────────────────────────────────────

function runTests(testFile) {
  try {
    execSync(`npx vitest run "${testFile}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 120_000,
    })
    return 'pass'
  } catch {
    return 'fail'
  }
}

function applyMutation(sourceContent, strategy) {
  const mutations = []
  let mutatedContent = sourceContent
  let match

  // Reset regex
  strategy.find.lastIndex = 0
  const regex = new RegExp(strategy.find.source, strategy.find.flags)

  while ((match = regex.exec(sourceContent)) !== null) {
    const original = match[0]
    const mutated = strategy.replace(original)
    if (original !== mutated) {
      mutations.push({
        position: match.index,
        line: sourceContent.substring(0, match.index).split('\n').length,
        original: original.substring(0, 80),
        mutated: mutated.substring(0, 80),
      })
    }
  }

  // Apply first mutation only (one at a time)
  if (mutations.length > 0) {
    const m = mutations[0]
    mutatedContent = sourceContent.replace(m.original, m.mutated)
  }

  return { mutations, mutatedContent }
}

// ── Main ───────────────────────────────────────────────

const args = process.argv.slice(2)
if (args.length < 2) {
  console.log(`
  Usage: node mutation-test.mjs <test-file> <source-file>

  Example:
    node scripts/test-quality/mutation-test.mjs \\
      __tests__/components/smart-flow/steps/MethodBrowser.test.tsx \\
      components/smart-flow/steps/purpose/MethodBrowser.tsx
  `)
  process.exit(1)
}

const testFile = args[0]
const sourceFile = args[1]
const sourceFullPath = resolve(ROOT, sourceFile)

// Read original source
const originalSource = readFileSync(sourceFullPath, 'utf-8')

console.log(`\n  Mutation Test Runner`)
console.log(`  Source: ${sourceFile}`)
console.log(`  Test:   ${testFile}`)
console.log()

// Step 1: Verify baseline passes
console.log('  [0/N] Baseline check...')
const baseline = runTests(testFile)
if (baseline !== 'pass') {
  console.log('  \u274C Baseline tests FAIL — fix tests first!')
  process.exit(1)
}
console.log('  \u2705 Baseline: all tests pass\n')

// Step 2: Apply each mutation
const results = []
let strategyIdx = 0

for (const strategy of strategies) {
  strategyIdx++
  const { mutations, mutatedContent } = applyMutation(originalSource, strategy)

  if (mutations.length === 0) {
    continue // No applicable mutations for this strategy
  }

  const m = mutations[0]
  console.log(`  [${strategyIdx}] ${strategy.name}: ${strategy.desc}`)
  console.log(`      Line ${m.line}: ${m.original.substring(0, 60)}...`)

  // Apply mutation
  writeFileSync(sourceFullPath, mutatedContent, 'utf-8')

  // Run test
  const result = runTests(testFile)

  // Revert immediately
  writeFileSync(sourceFullPath, originalSource, 'utf-8')

  const status = result === 'fail' ? 'KILLED' : 'SURVIVED'
  const icon = status === 'KILLED' ? '\u2705' : '\u274C'
  console.log(`      ${icon} ${status}\n`)

  results.push({
    strategy: strategy.name,
    desc: strategy.desc,
    line: m.line,
    status,
  })
}

// Ensure source is reverted
writeFileSync(sourceFullPath, originalSource, 'utf-8')

// Step 3: Summary
const killed = results.filter(r => r.status === 'KILLED').length
const survived = results.filter(r => r.status === 'SURVIVED').length
const total = killed + survived
const score = total > 0 ? Math.round((killed / total) * 100) : 0

console.log('  ═══════════════════════════════════════')
console.log(`  Mutation Score: ${score}% (${killed}/${total})`)
console.log()

for (const r of results) {
  const icon = r.status === 'KILLED' ? '\u2705' : '\u274C'
  console.log(`    ${icon} [${r.status}] ${r.strategy} (L${r.line})`)
}

console.log()
if (score >= 70) {
  console.log('  \u2705 Good — 테스트가 실제 동작을 검증하고 있습니다')
} else if (score >= 50) {
  console.log('  \u26A0\uFE0F Moderate — 일부 테스트 보강이 필요합니다')
} else {
  console.log('  \u274C Poor — 테스트가 동작을 제대로 검증하지 못합니다')
}
console.log()

process.exit(survived > killed ? 1 : 0)
