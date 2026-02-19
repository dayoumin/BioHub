#!/usr/bin/env node
/**
 * Test Quality Linter — 테스트 안티패턴 정적 분석
 *
 * AI가 작성한 테스트에서 흔히 발생하는 문제를 자동 탐지합니다.
 *
 * 사용법:
 *   node scripts/test-quality/lint-tests.mjs                      # 전체 검사
 *   node scripts/test-quality/lint-tests.mjs __tests__/path/to/test.tsx  # 특정 파일
 *   node scripts/test-quality/lint-tests.mjs --fix                # 수정 가능한 것만 표시
 *
 * 탐지 항목:
 *   [ANTI-01] Korean text assertions  — getByText('한글')는 L2 위반
 *   [ANTI-02] Non-null assertions     — .closest()! 는 CLAUDE.md 위반
 *   [ANTI-03] Loose assertions        — toBeGreaterThan(0), >= 1 등
 *   [ANTI-04] Trivial assertions      — expect(true).toBe(true)
 *   [ANTI-05] No state transition     — fireEvent 후 before/after 미검증
 *   [ANTI-06] Snapshot-only tests     — toMatchSnapshot()만 있는 테스트
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')
const TEST_DIR = join(ROOT, '__tests__')

// ── Rules ──────────────────────────────────────────────

const rules = [
  {
    id: 'ANTI-01',
    name: 'Korean text assertion (L2 violation)',
    severity: 'warning',
    // getByText/queryByText/findByText/getAllByText with Korean characters
    pattern: /(?:getByText|queryByText|findByText|getAllByText|queryAllByText)\s*\(\s*['"\/](?=[^'"]*[\uac00-\ud7a3])/g,
    message: (match, line) =>
      `getByText() with Korean text — use data-testid instead`,
    // Allowlist: terminology mock 등 fixture 설정은 허용
    exclude: /vi\.mock|mockReturnValue|mockImplementation|createMethod|const METHODS/,
  },
  {
    id: 'ANTI-02',
    name: 'Non-null assertion (!)',
    severity: 'error',
    pattern: /\.closest\([^)]+\)\s*!/g,
    message: () => `.closest()! — use null check + expect().not.toBeNull()`,
  },
  {
    id: 'ANTI-03',
    name: 'Loose assertion',
    severity: 'warning',
    pattern: /(?:toBeGreaterThan\s*\(\s*0\s*\)|toBeGreaterThanOrEqual\s*\(\s*1\s*\)|\.length\s*>\s*0|\.length\s*>=\s*1)/g,
    message: () => `Loose assertion — use exact toHaveLength(N) instead`,
  },
  {
    id: 'ANTI-04',
    name: 'Trivial assertion',
    severity: 'error',
    pattern: /expect\s*\(\s*(?:true|1|'.*?')\s*\)\.toBe\s*\(\s*(?:true|1|'.*?')\s*\)/g,
    message: () => `Trivial assertion — testing a constant, not behavior`,
  },
  {
    id: 'ANTI-05',
    name: 'fireEvent without before/after',
    severity: 'info',
    // Heuristic: fireEvent call without expect in surrounding 3 lines before it
    custom: (lines, lineIdx) => {
      const line = lines[lineIdx]
      if (!/fireEvent\.\w+/.test(line)) return null

      // Check if there's an expect within 3 lines BEFORE the fireEvent
      const hasBefore = lines
        .slice(Math.max(0, lineIdx - 4), lineIdx)
        .some(l => /expect\s*\(/.test(l))

      // Check if there's an expect within 3 lines AFTER the fireEvent
      const hasAfter = lines
        .slice(lineIdx + 1, Math.min(lines.length, lineIdx + 5))
        .some(l => /expect\s*\(/.test(l))

      if (!hasBefore && hasAfter) {
        return 'fireEvent without pre-condition assertion — add before/after state check'
      }
      return null
    },
  },
  {
    id: 'ANTI-06',
    name: 'Snapshot-only test',
    severity: 'warning',
    custom: (lines, lineIdx) => {
      const line = lines[lineIdx]
      if (!/toMatchSnapshot|toMatchInlineSnapshot/.test(line)) return null

      // Check the whole it() block for other expect calls
      // Find the it() block containing this line
      let blockStart = lineIdx
      while (blockStart > 0 && !/^\s*it\s*\(/.test(lines[blockStart])) {
        blockStart--
      }
      let blockEnd = lineIdx
      let depth = 0
      while (blockEnd < lines.length) {
        depth += (lines[blockEnd].match(/\{/g) || []).length
        depth -= (lines[blockEnd].match(/\}/g) || []).length
        if (depth <= 0 && blockEnd > blockStart) break
        blockEnd++
      }

      const blockLines = lines.slice(blockStart, blockEnd + 1)
      const expectCount = blockLines.filter(l => /expect\s*\(/.test(l)).length
      if (expectCount <= 1) {
        return 'Test has only snapshot assertion — add behavioral expects'
      }
      return null
    },
  },
]

// ── Scanner ────────────────────────────────────────────

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const findings = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    for (const rule of rules) {
      // Skip if line is in exclude context
      if (rule.exclude) {
        // Check surrounding 5 lines for exclude pattern
        const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n')
        if (rule.exclude.test(context)) continue
      }

      if (rule.pattern) {
        rule.pattern.lastIndex = 0
        const match = rule.pattern.exec(line)
        if (match) {
          findings.push({
            rule: rule.id,
            severity: rule.severity,
            file: relative(ROOT, filePath),
            line: i + 1,
            message: rule.message(match[0], line),
            source: line.trim(),
          })
        }
      }

      if (rule.custom) {
        const msg = rule.custom(lines, i)
        if (msg) {
          findings.push({
            rule: rule.id,
            severity: rule.severity,
            file: relative(ROOT, filePath),
            line: i + 1,
            message: msg,
            source: line.trim(),
          })
        }
      }
    }
  }

  return findings
}

// ── File Discovery ─────────────────────────────────────

function findTestFiles(dir) {
  const files = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue
        walk(full)
      } else if (/\.test\.(tsx?|jsx?)$/.test(entry)) {
        files.push(full)
      }
    }
  }
  walk(dir)
  return files
}

// ── Main ───────────────────────────────────────────────

const args = process.argv.slice(2)
const specificFile = args.find(a => !a.startsWith('--'))

let files
if (specificFile) {
  const resolved = resolve(ROOT, specificFile)
  files = [resolved]
} else {
  files = findTestFiles(TEST_DIR)
}

console.log(`\n  Test Quality Lint`)
console.log(`  Scanning ${files.length} test file(s)...\n`)

let totalFindings = 0
const severityCounts = { error: 0, warning: 0, info: 0 }

for (const file of files) {
  const findings = scanFile(file)
  if (findings.length === 0) continue

  totalFindings += findings.length
  console.log(`  ${relative(ROOT, file)}`)
  for (const f of findings) {
    severityCounts[f.severity]++
    const icon = f.severity === 'error' ? '\u274C' : f.severity === 'warning' ? '\u26A0\uFE0F' : '\u2139\uFE0F'
    console.log(`    ${icon} L${f.line} [${f.rule}] ${f.message}`)
    console.log(`       ${f.source.substring(0, 100)}`)
  }
  console.log()
}

// Summary
console.log(`  ─────────────────────────────────────`)
if (totalFindings === 0) {
  console.log(`  \u2705 No anti-patterns found!`)
} else {
  console.log(`  Found ${totalFindings} issue(s):`)
  if (severityCounts.error > 0) console.log(`    \u274C error:   ${severityCounts.error}`)
  if (severityCounts.warning > 0) console.log(`    \u26A0\uFE0F warning: ${severityCounts.warning}`)
  if (severityCounts.info > 0) console.log(`    \u2139\uFE0F info:    ${severityCounts.info}`)
}
console.log()

// Exit with error if there are error-level findings
process.exit(severityCounts.error > 0 ? 1 : 0)
