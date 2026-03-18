/**
 * csv-parse-errors 유틸 — 에러 분류 시뮬레이션
 *
 * findCriticalParseError: Delimiter/Quotes → 치명적, FieldMismatch → 경고
 * parseWarningMessage: 건수 포맷 검증
 */

import { describe, it, expect } from 'vitest'
import type { ParseError } from 'papaparse'
import { findCriticalParseError, parseWarningMessage } from '@/lib/utils/csv-parse-errors'

// ── 픽스처 ────────────────────────────────────────────────────

const CODE_FOR_TYPE: Record<ParseError['type'], ParseError['code']> = {
  Delimiter: 'UndetectableDelimiter',
  Quotes: 'MissingQuotes',
  FieldMismatch: 'TooFewFields',
}

function makeError(type: ParseError['type'], message = 'test error'): ParseError {
  return { type, code: CODE_FOR_TYPE[type], message, row: 0 }
}

// ── findCriticalParseError ────────────────────────────────────

describe('findCriticalParseError', () => {
  describe('빈 배열 / 경고만 있는 경우', () => {
    it('빈 배열 → undefined', () => {
      expect(findCriticalParseError([])).toBeUndefined()
    })

    it('FieldMismatch만 → undefined (경고 수준, 중단 안 함)', () => {
      expect(findCriticalParseError([makeError('FieldMismatch')])).toBeUndefined()
    })

    it('FieldMismatch 여러 개 → undefined', () => {
      expect(findCriticalParseError([
        makeError('FieldMismatch'),
        makeError('FieldMismatch'),
      ])).toBeUndefined()
    })
  })

  describe('치명적 에러 감지', () => {
    it('Delimiter → 에러 객체 반환', () => {
      const err = makeError('Delimiter', '구분자 감지 불가')
      const result = findCriticalParseError([err])
      expect(result).toBe(err)
      expect(result?.message).toBe('구분자 감지 불가')
    })

    it('Quotes → 에러 객체 반환', () => {
      const err = makeError('Quotes', '따옴표 오류')
      const result = findCriticalParseError([err])
      expect(result).toBe(err)
    })

    it('Delimiter + FieldMismatch 혼합 → Delimiter 반환 (치명적 우선)', () => {
      const critical = makeError('Delimiter')
      const warning = makeError('FieldMismatch')
      const result = findCriticalParseError([warning, critical])
      expect(result).toBe(critical)
    })

    it('FieldMismatch + Quotes 혼합 → Quotes 반환', () => {
      const warning = makeError('FieldMismatch')
      const critical = makeError('Quotes')
      const result = findCriticalParseError([warning, critical])
      expect(result).toBe(critical)
    })

    it('Delimiter 먼저 → Delimiter 반환', () => {
      const first = makeError('Delimiter', 'first')
      const second = makeError('Quotes', 'second')
      const result = findCriticalParseError([first, second])
      expect(result).toBe(first)
      expect(result?.type).toBe('Delimiter')
    })

    it('Quotes 먼저 → Quotes 반환 (순서 무관하게 처음 만난 치명적 에러)', () => {
      const first = makeError('Quotes', 'first')
      const second = makeError('Delimiter', 'second')
      const result = findCriticalParseError([first, second])
      expect(result).toBe(first)
      expect(result?.type).toBe('Quotes')
    })
  })

  describe('before/after — 동작 전후 상태 보존', () => {
    it('원본 배열을 변경하지 않는다', () => {
      const errors = [makeError('FieldMismatch'), makeError('Delimiter')]
      const original = [...errors]
      findCriticalParseError(errors)
      expect(errors).toEqual(original)
    })
  })
})

// ── parseWarningMessage ───────────────────────────────────────

describe('parseWarningMessage', () => {
  it('1건 → "1건" 포함', () => {
    expect(parseWarningMessage(1)).toContain('1건')
  })

  it('3건 → "3건" 포함', () => {
    expect(parseWarningMessage(3)).toContain('3건')
  })

  it('0건 → "0건" 포함 (엣지 케이스)', () => {
    expect(parseWarningMessage(0)).toContain('0건')
  })

  it('메시지에 "데이터를 확인하세요" 포함', () => {
    expect(parseWarningMessage(5)).toContain('데이터를 확인하세요')
  })

  it('메시지에 "파싱 오류" 포함', () => {
    expect(parseWarningMessage(2)).toContain('파싱 오류')
  })
})
