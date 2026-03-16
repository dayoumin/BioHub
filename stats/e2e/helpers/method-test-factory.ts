/**
 * Method Test Factory
 *
 * Phase 2 통계 메서드 E2E 테스트를 위한 팩토리 패턴.
 * 공통 플로우(upload → select → variables → run → verify)를 추상화하여
 * 각 메서드 테스트를 설정만으로 생성할 수 있게 합니다.
 */

import { test, expect, Page } from '@playwright/test'
import {
  navigateToUploadStep,
  uploadCSV,
  goToMethodSelection,
  selectMethodDirect,
  goToVariableSelection,
  ensureVariablesOrSkip,
  clickAnalysisRun,
  waitForResults,
  verifyStatisticalResults,
  log,
} from './flow-helpers'
import { S } from '../selectors'

// ── Types ──────────────────────────────────────────────────────────────────

/** Role-based variable assignment (used by methods/ specs) */
export interface RoleVariable {
  role: string
  variableName: string
}

export interface MethodTestConfig {
  /** statistical-methods.ts의 method ID */
  methodId?: string
  /** 테스트 이름 (suite-style에서 사용) */
  name?: string
  /** 검색 input에 입력할 한국어 검색어 */
  searchTerm: string
  /** 메서드명 정규식 (버튼 텍스트 매칭) */
  methodRegex: RegExp
  /** test-data/e2e/ 아래의 CSV 파일명 */
  csvFile: string
  /** 변수 설정 — 객체 또는 배열 형태 모두 지원 */
  variables?:
    | RoleVariable[]
    | {
        independent?: string
        dependent?: string
        /** 커스텀 변수 할당 함수 (복잡한 selector 대응) */
        custom?: (page: Page) => Promise<void>
      }
  /** 결과 검증 항목 */
  expectedResults?: {
    hasStatistic?: boolean
    hasPValue?: boolean
    hasEffectSize?: boolean
    /** 커스텀 검증 함수 */
    custom?: (page: Page) => Promise<void>
  }
  /** 태그 (필터링용, 테스트 제목에 포함) */
  tags?: string[]
  /** 분석 대기 타임아웃 (ms, 기본 120000) */
  timeout?: number
  /** 메서드가 비활성화될 수 있는 경우 skip 허용 */
  allowSkip?: boolean
  /** 스크린샷 파일명 (확장자 제외) */
  screenshotName?: string
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * 메서드 테스트 생성 팩토리.
 *
 * 하나의 config로 표준 Smart Flow 플로우를 실행하는 테스트를 등록합니다.
 * test.describe 블록 안에서 호출하세요.
 */
/** Check if variables config is array format */
function isRoleVariableArray(v: MethodTestConfig['variables']): v is RoleVariable[] {
  return Array.isArray(v)
}

export function createMethodTest(config: MethodTestConfig): void {
  const {
    methodId,
    name,
    searchTerm,
    methodRegex,
    csvFile,
    variables,
    expectedResults,
    tags = [],
    timeout = 120_000,
    allowSkip = false,
    screenshotName,
  } = config

  const id = methodId ?? name ?? searchTerm
  const tagStr = tags.length > 0 ? ` ${tags.join(' ')}` : ''
  const title = name ? `${name}${tagStr}` : `${searchTerm} (${id})${tagStr}`

  test(title, async ({ page }) => {
    // Step 1: Upload
    await navigateToUploadStep(page)
    expect(await uploadCSV(page, csvFile)).toBe(true)
    await expect(page.locator(S.dataProfileSummary)).toBeVisible({ timeout: 15_000 })

    // Step 2: Method Selection
    await goToMethodSelection(page)
    const selected = await selectMethodDirect(page, searchTerm, methodRegex)

    if (!selected && allowSkip) {
      log(id, `SKIPPED: 메서드 비활성화 (${searchTerm})`)
      test.skip()
      return
    }
    expect(selected).toBe(true)

    // Step 3: Variable Selection
    await goToVariableSelection(page)

    if (isRoleVariableArray(variables)) {
      // Array format: [{role, variableName}] — role-zone modal 기반 선택
      if (await isAutoAssigned(page)) {
        log(id, '변수 자동 할당됨 (RoleVariable), 선택 건너뜀')
      } else {
        // role별로 그룹핑하여 모달 할당
        const byRole = new Map<string, string[]>()
        for (const v of variables) {
          const list = byRole.get(v.role) ?? []
          list.push(v.variableName)
          byRole.set(v.role, list)
        }
        for (const [role, varNames] of byRole) {
          await assignVarViaModal(page, role, varNames)
        }
      }
    } else if (variables && 'custom' in variables && variables.custom) {
      await variables.custom(page)
    } else {
      const vars = variables as { independent?: string; dependent?: string } | undefined
      const indep = vars?.independent ?? 'group'
      const dep = vars?.dependent ?? 'value'
      await ensureVariablesOrSkip(page, id, indep, dep)
    }

    // Step 4: Run Analysis
    await clickAnalysisRun(page)
    expect(await waitForResults(page, timeout)).toBe(true)

    // Step 5: Verify Results
    const r = await verifyStatisticalResults(page)
    log(id, r.details)

    if (expectedResults?.hasStatistic !== false) {
      expect(r.hasStatistic).toBe(true)
    }
    if (expectedResults?.hasPValue !== false) {
      expect(r.hasPValue).toBe(true)
    }
    if (expectedResults?.hasEffectSize) {
      expect(r.hasEffectSize).toBe(true)
    }
    if (expectedResults?.custom) {
      await expectedResults.custom(page)
    }

    // Screenshot
    const ssName = screenshotName ?? id
    await page.screenshot({
      path: `e2e/results/screenshots/${ssName}-result.png`,
      fullPage: true,
    })
  })
}

/**
 * 다수의 메서드 테스트를 한 번에 등록.
 * describe 블록 안에서 사용.
 */
export function createMethodTests(configs: MethodTestConfig[]): void {
  for (const config of configs) {
    createMethodTest(config)
  }
}

/** Named suite variant — wraps configs in a test.describe block */
export function createMethodTestSuite(suiteName: string, configs: MethodTestConfig[]): void {
  test.describe(suiteName, () => {
    createMethodTests(configs)
  })
}

// ── Variable Selection Helpers ─────────────────────────────────────────────

/**
 * 모달 기반 변수 할당: roleZone 클릭 → modal에서 변수 선택 → 확인
 * 실패 시 fallback으로 button text matching 시도
 */
async function assignVarViaModal(
  page: Page,
  role: string,
  varNames: string[],
): Promise<void> {
  const roleZone = page.locator(S.roleZone(role))
  if ((await roleZone.count()) === 0) {
    log('assignVar', `WARN: role-zone-${role} not found, trying button fallback`)
    await assignVarViaButtonFallback(page, varNames)
    return
  }

  await roleZone.click()
  await page.waitForTimeout(300)

  // 모달이 열렸는지 확인
  const modal = page.locator(S.variableModal(role))
  const modalVisible = await modal.isVisible({ timeout: 3_000 }).catch(() => false)
  if (!modalVisible) {
    log('assignVar', `WARN: modal for role "${role}" did not open, trying button fallback`)
    await assignVarViaButtonFallback(page, varNames)
    return
  }

  for (const varName of varNames) {
    const modalVar = page.locator(S.modalVar(varName))
    if ((await modalVar.count()) > 0) {
      await modalVar.click()
      log('assignVar', `✓ ${role} ← ${varName} (modal)`)
      await page.waitForTimeout(200)
    } else {
      log('assignVar', `WARN: modal-var-${varName} not found in ${role} modal`)
    }
  }

  const confirmBtn = page.locator(S.modalConfirmBtn)
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click()
    await page.waitForTimeout(300)
  }
}

/** Fallback: variable-item → button text matching (모달 미지원 케이스 대응) */
async function assignVarViaButtonFallback(page: Page, varNames: string[]): Promise<void> {
  for (const varName of varNames) {
    // variable-item 시도
    const varItem = page.locator(S.variableItem(varName))
    if ((await varItem.count()) > 0) {
      await varItem.first().click()
      log('assignVar', `✓ ${varName} (variable-item)`)
      await page.waitForTimeout(300)
      continue
    }
    // button text fallback
    const btn = page.locator('button:not([disabled])').filter({ hasText: varName })
    if ((await btn.count()) > 0) {
      await btn.first().click()
      log('assignVar', `✓ ${varName} (button fallback)`)
      await page.waitForTimeout(300)
    } else {
      log('assignVar', `WARN: fallback for "${varName}" not found`)
    }
  }
}

/** run-analysis-btn이 이미 활성화되어 있으면 true (자동 할당 완료, 최대 10초 polling) */
async function isAutoAssigned(page: Page): Promise<boolean> {
  const runBtn = page.locator(S.runAnalysisBtn)
  await runBtn.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {
    log('autoAssign', 'run-analysis-btn not visible yet')
  })

  for (let i = 0; i < 10; i++) {
    if (await runBtn.isEnabled().catch(() => false)) {
      log('autoAssign', `자동 할당 완료 (${i + 1}번째 폴링)`)
      return true
    }
    await page.waitForTimeout(1000)
  }
  return false
}

/** AutoConfirm 방식 — 변수 자동 할당 대기 (KM, ROC 등) */
export async function waitForAutoConfirm(page: Page): Promise<void> {
  const runBtn = page.locator(S.runAnalysisBtn)
  await runBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() =>
    log('autoConfirm', 'run-analysis-btn not found'),
  )
  await page.waitForTimeout(1000)
}

/** 대응표본 변수 선택 (pre, post) */
export async function selectPairedVariables(page: Page): Promise<void> {
  if (await isAutoAssigned(page)) return
  await assignVarViaButtonFallback(page, ['pre', 'post'])
}

/** 이원 분산분석 변수 선택 (factor1, factor2, value) */
export async function selectTwoWayAnovaVars(page: Page): Promise<void> {
  if (await isAutoAssigned(page)) return
  await assignVarViaButtonFallback(page, ['factor1', 'factor2', 'value'])
}

/** 다중 독립변수 선택 — 모달 기반 */
export async function selectMultipleIndependentVars(
  page: Page,
  indepVars: string[],
  depVar: string,
): Promise<void> {
  if (await isAutoAssigned(page)) return

  // 독립변수 role zone이 있으면 모달 사용
  const indepZone = page.locator(S.roleZone('independent'))
  if ((await indepZone.count()) > 0) {
    await assignVarViaModal(page, 'independent', indepVars)
    await assignVarViaModal(page, 'dependent', [depVar])
    return
  }

  // fallback: 순차 button click
  await assignVarViaButtonFallback(page, [...indepVars, depVar])
}

/** 다변량 분석 변수 선택 (다수 numeric 변수) — 모달 기반 */
export async function selectMultivariateVars(
  page: Page,
  varNames: string[],
): Promise<void> {
  if (await isAutoAssigned(page)) return

  // variables role zone이 있으면 모달 사용
  const varsZone = page.locator(S.roleZone('variables'))
  if ((await varsZone.count()) > 0) {
    await assignVarViaModal(page, 'variables', varNames)
    return
  }

  // fallback: 순차 button click
  await assignVarViaButtonFallback(page, varNames)
}
