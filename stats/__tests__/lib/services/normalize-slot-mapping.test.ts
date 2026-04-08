/**
 * normalizeSlotMapping 단위 테스트
 *
 * TD-2: slot-configs 출력 → executor/handler 기대 키 정규화 검증
 * 슬롯 UI(variables, timeVar)와 handler(within, dependent) 간 키 변환
 */

import { describe, it, expect } from 'vitest'
import { normalizeSlotMapping } from '@/lib/services/statistical-executor'

describe('normalizeSlotMapping', () => {

  // ─── survival ──────────────────────────────────────────────────

  it('kaplan-meier: timeVar → dependentVar', () => {
    const input = { timeVar: 'duration', event: 'status', groupVar: 'group' }
    const result = normalizeSlotMapping(input, 'kaplan-meier')
    expect(result.dependentVar).toBe('duration')
    expect(result.timeVar).toBeUndefined()
    expect(result.event).toBe('status')
    expect(result.groupVar).toBe('group')
  })

  it('kaplan-meier: dependent가 이미 있으면 timeVar 유지', () => {
    const input = { timeVar: 'time', dependentVar: 'y', event: 'status' }
    const result = normalizeSlotMapping(input, 'kaplan-meier')
    expect(result.dependentVar).toBe('y')
    expect(result.timeVar).toBe('time')
  })

  it('cox-regression: timeVar → dependentVar + comma independentVar split', () => {
    const input = { timeVar: 'time', event: 'event', independentVar: 'age,stage' }
    const result = normalizeSlotMapping(input, 'cox-regression')
    expect(result.dependentVar).toBe('time')
    expect(result.timeVar).toBeUndefined()
    expect(result.independentVar).toEqual(['age', 'stage'])
  })

  it('cox-regression: independentVar 배열이면 split 안 함', () => {
    const input = { timeVar: 'time', event: 'event', independentVar: ['age', 'stage'] }
    const result = normalizeSlotMapping(input, 'cox-regression')
    expect(result.independentVar).toEqual(['age', 'stage'])
  })

  // ─── repeated-measures ────────────────────────────────────────

  it('repeated-measures-anova: variables[] → within[]', () => {
    const input = { variables: ['t1', 't2', 't3'], groupVar: 'group' }
    const result = normalizeSlotMapping(input, 'repeated-measures-anova')
    expect(result.within).toEqual(['t1', 't2', 't3'])
    expect(result.variables).toBeUndefined()
    expect(result.groupVar).toBe('group')
  })

  it('friedman: variables[] 유지 (prepareData 특수 분기가 처리)', () => {
    const input = { variables: ['cond1', 'cond2', 'cond3'] }
    const result = normalizeSlotMapping(input, 'friedman')
    expect(result.variables).toEqual(['cond1', 'cond2', 'cond3'])
    expect(result.within).toBeUndefined()
  })

  it('repeated-measures-anova: within이 이미 있으면 variables 유지', () => {
    const input = { variables: ['v1', 'v2'], within: ['w1', 'w2'] }
    const result = normalizeSlotMapping(input, 'repeated-measures-anova')
    expect(result.within).toEqual(['w1', 'w2'])
    expect(result.variables).toEqual(['v1', 'v2'])
  })

  // ─── manova ───────────────────────────────────────────────────

  it('manova: variables[] → dependent[] + groupVar → group', () => {
    const input = { variables: ['y1', 'y2', 'y3'], groupVar: 'treatment' }
    const result = normalizeSlotMapping(input, 'manova')
    expect(result.dependent).toEqual(['y1', 'y2', 'y3'])
    expect(result.variables).toBeUndefined()
    expect(result.group).toBe('treatment')
    expect(result.groupVar).toBeUndefined()
  })

  it('manova: dependent/group가 이미 있으면 유지', () => {
    const input = { variables: ['v1', 'v2'], dependent: ['d1', 'd2'], group: 'g' }
    const result = normalizeSlotMapping(input, 'manova')
    expect(result.dependent).toEqual(['d1', 'd2'])
    expect(result.variables).toEqual(['v1', 'v2'])
    expect(result.group).toBe('g')
  })

  // ─── 비대상 메서드는 pass-through ────────────────────────────

  it('t-test: 변환 없음', () => {
    const input = { dependentVar: 'score', groupVar: 'group' }
    const result = normalizeSlotMapping(input, 'two-sample-t')
    expect(result).toEqual(input)
  })

  it('correlation: variables 유지', () => {
    const input = { variables: ['a', 'b', 'c'] }
    const result = normalizeSlotMapping(input, 'correlation')
    expect(result.variables).toEqual(['a', 'b', 'c'])
  })

  // ─── 원본 불변성 ─────────────────────────────────────────────

  it('원본 객체를 변경하지 않음', () => {
    const input = { timeVar: 'time', event: 'status' }
    const frozen = { ...input }
    normalizeSlotMapping(input, 'kaplan-meier')
    expect(input).toEqual(frozen)
  })
})
