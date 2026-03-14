/**
 * Method Registry — 통합 메서드 메타데이터
 *
 * 메서드 추가 시 이 파일에서 registerMethod() 1회 호출로:
 * - selectorType (UI 변수 선택 방식)
 * - requirements (최소 표본, 변수 타입, 가정)
 * - canonical 메서드 정보 (name, category 등)
 * 를 한 곳에서 관리.
 *
 * 기존 소스:
 * - SELECTOR_MAP (VariableSelectionStep.tsx) → selectorType
 * - method-mapping.ts → requirements
 * - statistical-methods.ts → canonical 정보
 *
 * @example
 * // 새 메서드 추가 (1파일에서 완료):
 * registerMethod({
 *   id: 'new-method',
 *   selectorType: 'group-comparison',
 *   name: 'New Method',
 *   koreanName: '새 방법',
 *   description: 'A new statistical method',
 *   category: 'anova',
 *   requirements: { minSampleSize: 10, variableTypes: ['numeric', 'categorical'] },
 * })
 */

import type { SelectorType } from './selector-types'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { StatisticalMethod } from '@/types/analysis'

// ============================================================================
// Types
// ============================================================================

export interface MethodRequirements {
  minSampleSize: number
  variableTypes: string[]
  assumptions?: string[]
}

/**
 * registerMethod()에 전달하는 메서드 정의.
 *
 * 새 메서드: id, selectorType, name, category 필수.
 * 기존 메서드 보강: id, selectorType만으로 충분 (나머지는 canonical에서 조회).
 */
export interface MethodRegistration {
  /** 고유 ID (canonical) */
  id: string
  /** UI 변수 선택기 타입 */
  selectorType: SelectorType
  /** 하위 호환 별칭 IDs (같은 selectorType으로 자동 매핑) */
  aliases?: string[]
  /** 최소 표본 + 변수 타입 + 가정 */
  requirements?: MethodRequirements

  // --- 아래는 canonical 메서드 정보 (STATISTICAL_METHODS에 없는 경우 자동 등록) ---
  name?: string
  koreanName?: string
  description?: string
  koreanDescription?: string
  category?: StatisticalMethod['category']
}

// ============================================================================
// Internal Storage
// ============================================================================

const selectorTypeMap = new Map<string, SelectorType>()
const requirementsMap = new Map<string, MethodRequirements>()

// ============================================================================
// Public API
// ============================================================================

/**
 * 메서드를 레지스트리에 등록
 *
 * 새 메서드 추가 시 이 함수 1회 호출로 모든 메타데이터 등록:
 * 1. selectorType → UI 변수 선택기 결정
 * 2. requirements → 최소 표본/변수 타입/가정
 * 3. canonical 정보 → STATISTICAL_METHODS에 자동 추가 (없는 경우)
 * 4. aliases → 하위 호환 ID도 동일 selectorType 매핑
 */
export function registerMethod(entry: MethodRegistration): void {
  // 0. 중복 등록 감지 — selectorType 불일치 시 경고
  const existing = selectorTypeMap.get(entry.id)
  if (existing !== undefined && existing !== entry.selectorType) {
    console.warn(
      `[method-registry] registerMethod("${entry.id}"): selectorType 충돌 ` +
      `(기존 "${existing}" → 새 "${entry.selectorType}"). 기존 값이 덮어씌워집니다.`
    )
  }

  // 1. selectorType 등록
  selectorTypeMap.set(entry.id, entry.selectorType)

  // 2. aliases → 같은 selectorType (충돌 감지 포함)
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      const existingAlias = selectorTypeMap.get(alias)
      if (existingAlias !== undefined && existingAlias !== entry.selectorType) {
        console.warn(
          `[method-registry] alias "${alias}": selectorType 충돌 ` +
          `(기존 "${existingAlias}" → 새 "${entry.selectorType}").`
        )
      }
      selectorTypeMap.set(alias, entry.selectorType)
    }
  }

  // 3. requirements 등록
  if (entry.requirements) {
    requirementsMap.set(entry.id, entry.requirements)
  }

  // 4. canonical 메서드에 없으면 자동 등록
  if (entry.name && entry.category && !STATISTICAL_METHODS[entry.id]) {
    STATISTICAL_METHODS[entry.id] = {
      id: entry.id,
      name: entry.name,
      description: entry.description ?? '',
      category: entry.category,
      aliases: entry.aliases,
      koreanName: entry.koreanName,
      koreanDescription: entry.koreanDescription,
    }
  }
}

/**
 * 메서드 ID → SelectorType 조회
 *
 * 못 찾으면 'default' 반환.
 */
export function getSelectorType(methodId: string): SelectorType {
  return selectorTypeMap.get(methodId) ?? 'default'
}

/**
 * 메서드 ID → Requirements 조회
 */
export function getMethodRequirements(methodId: string): MethodRequirements | undefined {
  return requirementsMap.get(methodId)
}

/**
 * 등록된 모든 메서드 ID 목록
 */
export function getRegisteredMethodIds(): string[] {
  return [...new Set(selectorTypeMap.keys())]
}

/**
 * selectorType이 등록된 메서드 수 (별칭 포함)
 */
export function getRegistrySize(): number {
  return selectorTypeMap.size
}

// ============================================================================
// Boot: 기존 SELECTOR_MAP 데이터 등록
//
// VariableSelectionStep.tsx에 있던 SELECTOR_MAP을 여기로 이전.
// Primary IDs (method-mapping.ts) + Legacy aliases (statistical-methods.ts)
// ============================================================================

/** @internal 부트 타임 일괄 등록 (selectorType만) */
function bootSelectorTypes(entries: Array<[string, SelectorType]>): void {
  for (const [id, type] of entries) {
    selectorTypeMap.set(id, type)
  }
}

bootSelectorTypes([
  // ─── One-sample tests ───
  ['one-sample-t',            'one-sample'],
  ['binomial-test',           'one-sample'],
  ['runs-test',               'one-sample'],
  ['mann-kendall',            'one-sample'],
  ['normality-test',          'one-sample'],
  ['homogeneity-test',        'one-sample'],

  // ─── Paired / within-subjects ───
  ['paired-t',                'paired'],
  ['wilcoxon',                'paired'],
  ['sign-test',               'paired'],
  ['cochran-q',               'paired'],

  // ─── Group comparison (종속=numeric, 그룹=categorical) ───
  ['two-sample-t',            'group-comparison'],
  ['welch-t',                 'group-comparison'],
  ['one-way-anova',           'group-comparison'],
  ['ancova',                  'group-comparison'],
  ['mann-whitney',            'group-comparison'],
  ['kruskal-wallis',          'group-comparison'],
  ['ks-test',                 'group-comparison'],
  ['mood-median',             'group-comparison'],
  ['non-parametric',          'group-comparison'],
  ['means-plot',              'group-comparison'],
  ['dunn-test',               'group-comparison'],

  // ─── Two-way ANOVA ───
  ['two-way-anova',           'two-way-anova'],

  // ─── Correlation / multivariate numeric ───
  ['correlation',             'correlation'],
  ['partial-correlation',     'correlation'],
  ['descriptive-stats',       'correlation'],
  ['explore-data',            'correlation'],
  ['pca',                     'correlation'],
  ['factor-analysis',         'correlation'],
  ['k-means',                 'correlation'],
  ['hierarchical',            'correlation'],
  ['reliability-analysis',    'correlation'],

  // ─── Multiple regression ───
  ['simple-regression',       'multiple-regression'],
  ['multiple-regression',     'multiple-regression'],
  ['logistic-regression',     'multiple-regression'],
  ['poisson-regression',      'multiple-regression'],
  ['ordinal-regression',      'multiple-regression'],
  ['dose-response',           'multiple-regression'],
  ['response-surface',        'multiple-regression'],
  ['stepwise-regression',     'multiple-regression'],

  // ─── Chi-square / categorical ───
  ['chi-square',              'chi-square'],
  ['chi-square-goodness',     'chi-square'],
  ['chi-square-independence', 'chi-square'],
  ['mcnemar',                 'chi-square'],
  ['proportion-test',         'chi-square'],

  // ─── Auto-confirm (complex methods without custom variable UI) ───
  ['friedman',                'auto'],
  ['repeated-measures-anova', 'auto'],
  ['manova',                  'auto'],
  ['mixed-model',             'auto'],
  ['arima',                   'auto'],
  ['seasonal-decompose',      'auto'],
  ['stationarity-test',       'auto'],
  ['kaplan-meier',            'auto'],
  ['cox-regression',          'auto'],
  ['discriminant',            'auto'],
  ['power-analysis',          'auto'],

  // ─── Legacy aliases (statistical-methods.ts canonical ID → 호환성 유지) ───
  ['t-test',                  'group-comparison'],
  ['anova',                   'group-comparison'],
  ['regression',              'multiple-regression'],
  ['poisson',                 'multiple-regression'],
  ['stepwise',                'multiple-regression'],
  ['cluster',                 'correlation'],
  ['reliability',             'correlation'],
  ['descriptive',             'correlation'],
  ['roc-curve',               'auto'],
])
