import { describe, expect, it } from 'vitest'
import { pickHeroOptionEntries } from '@/components/analysis/steps/results/ResultsHeroCard'
import type { ExecutionSettingEntry } from '@/lib/utils/analysis-execution'
import type { StatisticalMethodRequirements } from '@/lib/statistics/variable-requirements'

// pickHeroOptionEntries는 Step 3 buildAnalysisExecutionContext의 executionSettingEntries를
// Step 4 hero 메타 배지로 좁히는 필터. 라벨 해석은 상위 util에서 이미 완료된 상태 가정.
describe('pickHeroOptionEntries', () => {
  it('returns empty for undefined input (history restore without options)', () => {
    expect(pickHeroOptionEntries(undefined)).toEqual([])
  })

  it('hides showAssumptions and showEffectSize (noise for hero)', () => {
    const entries: ExecutionSettingEntry[] = [
      { key: 'showAssumptions', label: '가정 검정', value: '사용' },
      { key: 'showEffectSize', label: '효과크기', value: '표시' },
      { key: 'postHoc', label: '사후검정 방법', value: 'Tukey HSD' },
    ]
    expect(pickHeroOptionEntries(entries).map((e) => e.key)).toEqual(['postHoc'])
  })

  it('hides default alpha (0.05) but keeps custom alpha', () => {
    const defaultAlpha: ExecutionSettingEntry[] = [{ key: 'alpha', label: 'alpha', value: '0.05' }]
    expect(pickHeroOptionEntries(defaultAlpha)).toEqual([])

    const customAlpha: ExecutionSettingEntry[] = [{ key: 'alpha', label: 'alpha', value: '0.01' }]
    expect(pickHeroOptionEntries(customAlpha)).toEqual([{ key: 'alpha', label: 'alpha', value: '0.01' }])
  })

  it('preserves order of remaining entries (Step 3 uses same order)', () => {
    const entries: ExecutionSettingEntry[] = [
      { key: 'alpha', label: 'alpha', value: '0.01' },
      { key: 'alternative', label: '대립가설', value: '양측 (≠)' },
      { key: 'showAssumptions', label: '가정 검정', value: '사용' },
      { key: 'ciMethod', label: '신뢰구간 방법', value: 'Wilson Score' },
    ]
    expect(pickHeroOptionEntries(entries).map((e) => e.key)).toEqual(['alpha', 'alternative', 'ciMethod'])
  })

  it('returns empty for empty array', () => {
    expect(pickHeroOptionEntries([])).toEqual([])
  })

  it('keeps entry when alpha value is empty string (cannot parse, assume customized)', () => {
    // Number('') === 0, so we'd silently hide. Current policy: only hide when parse matches 0.05 exactly.
    const entries: ExecutionSettingEntry[] = [{ key: 'alpha', label: 'alpha', value: '' }]
    expect(pickHeroOptionEntries(entries)).toEqual([{ key: 'alpha', label: 'alpha', value: '' }])
  })

  it('hides entries that match the setting default when methodRequirements is provided', () => {
    const entries: ExecutionSettingEntry[] = [
      { key: 'alternative', label: '대립가설', value: '양측 (≠)' },
      { key: 'postHoc', label: '사후검정 방법', value: 'Tukey HSD' },
    ]
    const methodRequirements = {
      settings: {
        alternative: {
          label: '대립가설',
          default: 'two-sided',
          options: [
            { value: 'two-sided', label: '양측 (≠)', description: '' },
            { value: 'less', label: '좌측 (<)', description: '' },
            { value: 'greater', label: '우측 (>)', description: '' },
          ],
        },
        postHoc: {
          label: '사후검정 방법',
          default: 'tukey',
          options: [
            { value: 'tukey', label: 'Tukey HSD', description: '' },
            { value: 'bonferroni', label: 'Bonferroni', description: '' },
          ],
        },
      },
    } as unknown as StatisticalMethodRequirements
    // 둘 다 기본값 그대로 → 둘 다 숨김.
    expect(pickHeroOptionEntries(entries, methodRequirements)).toEqual([])
  })

  it('hides localized generic-domain defaults with the same comparison rule', () => {
    const entries: ExecutionSettingEntry[] = [
      { key: 'alternative', label: 'Alternative hypothesis', value: 'Two-sided' },
      { key: 'welch', label: 'Execution mode', value: 'Welch ANOVA' },
    ]
    const methodRequirements = {
      settings: {
        alternative: {
          label: '대립가설',
          default: 'two-sided',
          options: [
            { value: 'two-sided', label: '양측 검정', description: '' },
            { value: 'greater', label: '단측 검정 (greater)', description: '' },
          ],
        },
        welch: {
          label: '실행 방식',
          default: true,
          options: [
            { value: false, label: '일반 ANOVA', description: '' },
            { value: true, label: 'Welch ANOVA', description: '' },
          ],
        },
      },
    } as unknown as StatisticalMethodRequirements

    expect(pickHeroOptionEntries(entries, methodRequirements, 'generic')).toEqual([])
  })

  it('keeps entries whose value differs from default', () => {
    const entries: ExecutionSettingEntry[] = [
      { key: 'postHoc', label: '사후검정 방법', value: 'Bonferroni' },
    ]
    const methodRequirements = {
      settings: {
        postHoc: {
          label: '사후검정 방법',
          default: 'tukey',
          options: [
            { value: 'tukey', label: 'Tukey HSD', description: '' },
            { value: 'bonferroni', label: 'Bonferroni', description: '' },
          ],
        },
      },
    } as unknown as StatisticalMethodRequirements
    // 사용자가 기본 Tukey → Bonferroni로 바꿈 → 유지.
    expect(pickHeroOptionEntries(entries, methodRequirements)).toEqual([
      { key: 'postHoc', label: '사후검정 방법', value: 'Bonferroni' },
    ])
  })

  it('keeps entries whose key is not in methodRequirements.settings', () => {
    const entries: ExecutionSettingEntry[] = [{ key: 'unknown-setting', label: 'X', value: 'v' }]
    const methodRequirements = { settings: {} } as unknown as StatisticalMethodRequirements
    expect(pickHeroOptionEntries(entries, methodRequirements)).toEqual(entries)
  })

  it('keeps entries when setting.default is null (guard prevents false match)', () => {
    const entries: ExecutionSettingEntry[] = [{ key: 'postHoc', label: '사후검정', value: 'Tukey HSD' }]
    const methodRequirements = {
      settings: {
        postHoc: {
          label: '사후검정',
          default: null,
          options: [{ value: 'tukey', label: 'Tukey HSD', description: '' }],
        },
      },
    } as unknown as StatisticalMethodRequirements
    expect(pickHeroOptionEntries(entries, methodRequirements)).toEqual(entries)
  })

  it('hides testProportion when value matches default (no options → formatExecutionSettingValue fallback)', () => {
    // buildExecutionSettingEntries translates MANAGED schema key `nullProportion` → entry key `testProportion`.
    // Default 값은 숫자이고 options 배열 없음 → getSettingOptionLabel가 formatExecutionSettingValue로 폴백하여
    // "0.5"를 얻고, entry.value도 "0.5"로 같아 숨김된다.
    const entries: ExecutionSettingEntry[] = [{ key: 'testProportion', label: '검정 비율 (p₀)', value: '0.5' }]
    const methodRequirements = {
      settings: { testProportion: { label: '검정 비율 (p₀)', default: 0.5 } },
    } as unknown as StatisticalMethodRequirements
    expect(pickHeroOptionEntries(entries, methodRequirements)).toEqual([])
  })

  it('selectively hides defaults while keeping customized entries in one pass', () => {
    const entries: ExecutionSettingEntry[] = [
      { key: 'alternative', label: '대립가설', value: '양측 (≠)' },
      { key: 'postHoc', label: '사후검정', value: 'Bonferroni' },
    ]
    const methodRequirements = {
      settings: {
        alternative: {
          label: '대립가설',
          default: 'two-sided',
          options: [{ value: 'two-sided', label: '양측 (≠)', description: '' }],
        },
        postHoc: {
          label: '사후검정',
          default: 'tukey',
          options: [
            { value: 'tukey', label: 'Tukey HSD', description: '' },
            { value: 'bonferroni', label: 'Bonferroni', description: '' },
          ],
        },
      },
    } as unknown as StatisticalMethodRequirements
    expect(pickHeroOptionEntries(entries, methodRequirements).map((e) => e.key)).toEqual(['postHoc'])
  })
})
