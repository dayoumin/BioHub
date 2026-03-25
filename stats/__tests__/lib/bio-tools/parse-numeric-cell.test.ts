import { describe, expect, it } from 'vitest'
import { parseNumericCell } from '@/lib/bio-tools/parse-numeric-cell'

describe('parseNumericCell', () => {
  it('숫자 문자열 → 숫자', () => {
    expect(parseNumericCell('42')).toBe(42)
    expect(parseNumericCell('3.14')).toBe(3.14)
  })

  it('숫자 타입 → 그대로 반환', () => {
    expect(parseNumericCell(7)).toBe(7)
    expect(parseNumericCell(0)).toBe(0)
  })

  it('빈 문자열 → NaN (Number("")=0 함정 방지)', () => {
    expect(parseNumericCell('')).toBeNaN()
  })

  it('null → NaN', () => {
    expect(parseNumericCell(null)).toBeNaN()
  })

  it('undefined → NaN', () => {
    expect(parseNumericCell(undefined)).toBeNaN()
  })

  it('비숫자 문자열 → NaN', () => {
    expect(parseNumericCell('abc')).toBeNaN()
    expect(parseNumericCell('N/A')).toBeNaN()
  })

  it('0은 유효한 값으로 유지', () => {
    expect(parseNumericCell(0)).toBe(0)
    expect(parseNumericCell('0')).toBe(0)
  })
})
