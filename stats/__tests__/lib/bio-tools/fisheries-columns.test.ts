import { describe, expect, it } from 'vitest'
import {
  detectColumn,
  detectAgeColumn,
  detectLengthColumn,
  detectWeightColumn,
} from '@/lib/bio-tools/fisheries-columns'

describe('detectColumn', () => {
  const hints = ['length', 'tl'] as const

  it('정확 일치 (case-insensitive)', () => {
    expect(detectColumn(['id', 'Length', 'value'], hints, 0)).toBe('Length')
    expect(detectColumn(['id', 'TL', 'value'], hints, 0)).toBe('TL')
  })

  it('토큰 매칭 — "Total Length (cm)" → length 토큰 포함', () => {
    expect(detectColumn(['id', 'Total Length (cm)', 'value'], hints, 0)).toBe(
      'Total Length (cm)',
    )
  })

  it('토큰 매칭 — "tl_mm" → tl 토큰 포함', () => {
    expect(detectColumn(['id', 'tl_mm', 'value'], hints, 0)).toBe('tl_mm')
  })

  it('정확 일치가 토큰 매칭보다 우선', () => {
    expect(
      detectColumn(['Total Length (cm)', 'length', 'value'], hints, 0),
    ).toBe('length')
  })

  it('매칭 실패 시 fallback 인덱스 반환', () => {
    expect(detectColumn(['id', 'score', 'value'], hints, 2)).toBe('value')
  })

  it('fallback 인덱스 범위 초과 시 첫 번째 컬럼', () => {
    expect(detectColumn(['id', 'score'], hints, 10)).toBe('id')
  })

  it('짧은 힌트 "tl"이 "title" 등 단어 내부에는 매칭되지 않음', () => {
    expect(detectColumn(['id', 'title', 'value'], hints, 0)).toBe('id')
  })

  it('짧은 힌트 "tl"이 "bottle", "shuttle" 등에도 매칭되지 않음', () => {
    expect(detectColumn(['id', 'bottle', 'shuttle'], hints, 0)).toBe('id')
  })

  it('구분자로 분리된 짧은 힌트는 매칭됨 — tl-cm, tl.cm', () => {
    expect(detectColumn(['id', 'tl-cm', 'value'], hints, 0)).toBe('tl-cm')
    expect(detectColumn(['id', 'tl.cm', 'value'], hints, 0)).toBe('tl.cm')
  })

  it('camelCase 헤더 매칭 — "totalLength" → length 토큰', () => {
    expect(detectColumn(['id', 'totalLength', 'value'], hints, 0)).toBe('totalLength')
  })
})

describe('detectAgeColumn', () => {
  it('Age_years 토큰 매칭', () => {
    expect(detectAgeColumn(['id', 'Age_years', 'length'])).toBe('Age_years')
  })

  it('연령(세) 한글 접두 매칭', () => {
    expect(detectAgeColumn(['id', '연령(세)', 'length'])).toBe('연령(세)')
  })

  it('"stage" 에 "age"가 포함되지만 매칭되지 않음 (오탐 방지)', () => {
    expect(detectAgeColumn(['id', 'stage', 'length'])).toBe('id')
  })

  it('"cage_number" 에 "age"가 포함되지만 매칭되지 않음', () => {
    expect(detectAgeColumn(['id', 'cage_number', 'length'])).toBe('id')
  })

  it('"fish_age" → 토큰으로 올바르게 매칭', () => {
    expect(detectAgeColumn(['id', 'fish_age', 'length'])).toBe('fish_age')
  })

  it('"fishAge" camelCase → age 토큰으로 매칭', () => {
    expect(detectAgeColumn(['id', 'fishAge', 'length'])).toBe('fishAge')
  })

  it('"year" 힌트 제거됨 — year/sampling_year 컬럼은 연령으로 감지되지 않음', () => {
    expect(detectAgeColumn(['year', 'sampling_year', 'length'])).toBe('year')  // fallback[0]
  })

  it('한글 복합어 "사육연령대" 에 "연령"이 포함되지만 매칭되지 않음', () => {
    expect(detectAgeColumn(['id', '사육연령대', 'length'])).toBe('id')
  })

  it('한글 복합어 "총연령" 에 "연령"이 포함되지만 매칭되지 않음', () => {
    expect(detectAgeColumn(['id', '총연령', 'length'])).toBe('id')
  })
})

describe('detectLengthColumn', () => {
  it('Total Length (cm) 토큰 매칭', () => {
    expect(detectLengthColumn(['id', 'Total Length (cm)'])).toBe(
      'Total Length (cm)',
    )
  })

  it('SL_mm 토큰 매칭', () => {
    expect(detectLengthColumn(['id', 'SL_mm'])).toBe('SL_mm')
  })

  it('"result" 에 "sl"이 포함되지만 매칭되지 않음', () => {
    expect(detectLengthColumn(['id', 'result'])).toBe('id')
  })

  it('"shuffle" 에 "fl"이 포함되지만 매칭되지 않음', () => {
    expect(detectLengthColumn(['id', 'shuffle'])).toBe('id')
  })

  it('"fl_cm" → 토큰으로 올바르게 매칭', () => {
    expect(detectLengthColumn(['id', 'fl_cm'])).toBe('fl_cm')
  })

  it('"totalLength" camelCase → length 토큰으로 매칭', () => {
    expect(detectLengthColumn(['id', 'totalLength'])).toBe('totalLength')
  })

  it('"bodyLength" camelCase → length 토큰으로 매칭', () => {
    expect(detectLengthColumn(['id', 'bodyLength'])).toBe('bodyLength')
  })

  it('한글 복합어 "전체장" 에 "체장"이 포함되지만 매칭되지 않음', () => {
    expect(detectLengthColumn(['id', '전체장'])).toBe('id')
  })
})

describe('detectWeightColumn', () => {
  it('Body Weight (g) 토큰 매칭', () => {
    expect(detectWeightColumn(['id', 'Body Weight (g)'])).toBe(
      'Body Weight (g)',
    )
  })

  it('bw_kg 토큰 매칭', () => {
    expect(detectWeightColumn(['id', 'bw_kg'])).toBe('bw_kg')
  })

  it('매칭 실패 시 두 번째 컬럼 (fallbackIndex=1)', () => {
    expect(detectWeightColumn(['id', 'score', 'value'])).toBe('score')
  })

  it('"newt_count" 에 "wt"가 포함되지만 매칭되지 않음', () => {
    expect(detectWeightColumn(['id', 'newt_count'])).toBe('newt_count')  // fallback[1]
  })

  it('"wt_g" → 토큰으로 올바르게 매칭', () => {
    expect(detectWeightColumn(['id', 'wt_g'])).toBe('wt_g')
  })

  it('"bodyWeight" camelCase → weight 토큰으로 매칭', () => {
    expect(detectWeightColumn(['id', 'bodyWeight'])).toBe('bodyWeight')
  })
})
