/**
 * E2E Selector Integrity Test
 *
 * selectors.ts에 등록된 모든 정적 data-testid 값이
 * 실제 컴포넌트/앱 소스에 존재하는지 검증합니다.
 *
 * 목적: testid를 컴포넌트에서 바꿨는데 selectors.ts를 업데이트 안 하는 실수 방지
 *
 * 실행: pnpm test e2e-selectors.integrity
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

const ROOT = resolve(__dirname, '..')

// ── 헬퍼: 디렉토리 재귀 탐색 ───────────────────────────────────────────────

function walkFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'out') continue
    const full = join(dir, entry)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      results.push(...walkFiles(full, ext))
    } else if (entry.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

// ── selectors.ts 소스에서 정적 testid 값 추출 ─────────────────────────────

function extractStaticTestIds(selectorsPath: string): string[] {
  const src = readFileSync(selectorsPath, 'utf-8')
  // '[data-testid="foo-bar"]' 또는 `[data-testid="foo-${var}"]` 패턴
  const matches = src.matchAll(/\[data-testid="([^"]+)"\]/g)
  const ids = new Set<string>()
  for (const m of matches) {
    ids.add(m[1])
  }
  return [...ids]
}

// ── 소스 파일 전체 내용 캐시 ──────────────────────────────────────────────

let _sourceContent: string | null = null

function getAllSourceContent(): string {
  if (_sourceContent !== null) return _sourceContent

  const dirs = [
    join(ROOT, 'components'),
    join(ROOT, 'app'),
    join(ROOT, 'hooks'),
    join(ROOT, 'lib'),
  ]

  const files: string[] = []
  for (const dir of dirs) {
    files.push(...walkFiles(dir, '.tsx'))
    files.push(...walkFiles(dir, '.ts'))
  }

  const contents: string[] = []
  for (const f of files) {
    try {
      contents.push(readFileSync(f, 'utf-8'))
    } catch {
      // skip unreadable files
    }
  }

  _sourceContent = contents.join('\n')
  return _sourceContent
}

// ── testid가 소스에 존재하는지 검사 ──────────────────────────────────────

/**
 * testid가 컴포넌트 소스에 존재하는지 검사합니다.
 *
 * 검사 순서:
 * 1. 정적 매칭: data-testid="foo-bar"
 * 2. 프롭 전달: 문자열 값으로 사용 (confirmTestId: 'foo-bar' 등)
 * 3. 템플릿 리터럴 prefix 매칭:
 *    - selectors.ts에 "stepper-step-${n}" 형태 → prefix "stepper-step-" 검색
 *    - selectors.ts에 "filter-ai" 형태이나 컴포넌트가 `filter-${id}` 로 생성
 */
function findTestIdInSource(id: string, sourceContent: string): boolean {
  // 1. 정적 attribute 정확 매칭
  if (sourceContent.includes(`data-testid="${id}"`)) return true

  // 2. 문자열 값으로 전달되는 패턴 (prop value, confirmTestId 등)
  if (sourceContent.includes(`'${id}'`) || sourceContent.includes(`"${id}"`)) return true

  // 3. 템플릿 리터럴 prefix 매칭
  // 3a. selectors.ts 자체가 템플릿 패턴인 경우: "stepper-step-${n}" → prefix = "stepper-step-"
  const templateIdx = id.indexOf('${')
  if (templateIdx >= 0) {
    const prefix = id.slice(0, templateIdx)
    if (sourceContent.includes(`data-testid={\`${prefix}`)) return true
    if (sourceContent.includes('data-testid=`' + prefix)) return true
  }

  // 3b. 정적 id이나 컴포넌트에서 동적으로 생성: "filter-ai" → prefix "filter-"
  // 마지막 '-' 기준으로 prefix 추출 후 template literal 검색
  const lastDash = id.lastIndexOf('-')
  if (lastDash > 0) {
    const prefix = id.slice(0, lastDash + 1)
    if (sourceContent.includes(`data-testid={\`${prefix}`)) return true
    if (sourceContent.includes('data-testid=`' + prefix)) return true
  }

  return false
}

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('E2E Selector Integrity', () => {
  const selectorsPath = join(ROOT, 'e2e', 'selectors.ts')

  it('selectors.ts 파일이 존재한다', () => {
    expect(() => readFileSync(selectorsPath)).not.toThrow()
  })

  it('selectors.ts의 모든 정적 testid가 컴포넌트 소스에 존재한다 (dead reference 없음)', () => {
    const testIds = extractStaticTestIds(selectorsPath)
    expect(testIds.length).toBeGreaterThan(0)

    const sourceContent = getAllSourceContent()
    const missing: string[] = []

    for (const id of testIds) {
      if (!findTestIdInSource(id, sourceContent)) {
        missing.push(id)
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `selectors.ts에 등록됐지만 컴포넌트에 없는 testid ${missing.length}개:\n` +
        missing.map(id => `  • "${id}"`).join('\n') +
        '\n\n컴포넌트를 수정했다면 e2e/selectors.ts도 함께 업데이트하세요.'
      )
    }
  })

  it('selectors.ts에 등록된 testid 개수가 최소 기준을 충족한다', () => {
    const testIds = extractStaticTestIds(selectorsPath)
    // 현재 49개 등록 — 새 기능 추가 시 자연스럽게 증가
    expect(testIds.length).toBeGreaterThanOrEqual(40)
  })
})
