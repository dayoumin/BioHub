import { describe, expect, it } from 'vitest'
import { cleanSequence, validateSequence } from '@/lib/genetics/validate-sequence'

// 100bp 이상의 유효 DNA 서열
const VALID_SEQ = 'ATGCGTACGTACGTACGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG'

describe('cleanSequence', () => {
  it('FASTA 헤더를 제거하고 순수 서열만 반환', () => {
    const input = '>sample1\nATGC\nGTAC'
    expect(cleanSequence(input)).toBe('ATGCGTAC')
  })

  it('공백과 숫자를 제거', () => {
    expect(cleanSequence('ATG C\n123\nGTAC')).toBe('ATGCGTAC')
  })

  it('소문자를 대문자로 변환', () => {
    expect(cleanSequence('atgc')).toBe('ATGC')
  })

  it('헤더 없는 순수 서열 처리', () => {
    expect(cleanSequence('ATGCGTAC')).toBe('ATGCGTAC')
  })
})

describe('validateSequence', () => {
  describe('다중 FASTA 감지', () => {
    it('2개 이상의 FASTA 헤더가 있으면 에러 반환', () => {
      const multi = '>seq1\nATGCGTAC\n>seq2\nGTACATGC'
      const result = validateSequence(multi)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('다중 서열이 감지되었습니다')
    })

    it('3개 헤더도 다중 서열로 감지', () => {
      const multi = '>seq1\nATGC\n>seq2\nGTAC\n>seq3\nCCCC'
      const result = validateSequence(multi)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('다중 서열이 감지되었습니다')
    })

    it('다중 서열 에러 시 length/gcContent는 0', () => {
      const multi = '>seq1\nATGC\n>seq2\nGTAC'
      const result = validateSequence(multi)

      expect(result.length).toBe(0)
      expect(result.gcContent).toBe(0)
      expect(result.ambiguousCount).toBe(0)
      expect(result.ambiguousRatio).toBe(0)
    })

    it('단일 FASTA 헤더는 정상 처리', () => {
      const single = `>sample1\n${VALID_SEQ}`
      const result = validateSequence(single)

      // 다중 서열 에러가 아님
      expect(result.errors.every(e => !e.includes('다중 서열'))).toBe(true)
      expect(result.length).toBe(VALID_SEQ.length)
    })

    it('헤더 없는 서열도 정상 처리', () => {
      const result = validateSequence(VALID_SEQ)

      expect(result.errors.every(e => !e.includes('다중 서열'))).toBe(true)
      expect(result.valid).toBe(true)
    })
  })

  describe('빈 서열', () => {
    it('빈 문자열이면 에러', () => {
      const result = validateSequence('')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('서열을 입력하세요')
    })

    it('헤더만 있고 서열이 없으면 에러', () => {
      const result = validateSequence('>header_only\n')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('서열을 입력하세요')
    })
  })

  describe('최소 길이', () => {
    it('100bp 미만이면 에러', () => {
      const result = validateSequence('ATGC')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('최소')
      expect(result.errors[0]).toContain('100')
    })

    it('100bp 이상이면 통과', () => {
      const result = validateSequence(VALID_SEQ)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('유효하지 않은 문자', () => {
    it('DNA가 아닌 문자 포함 시 에러', () => {
      const seq = 'X'.repeat(50) + VALID_SEQ
      const result = validateSequence(seq)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('허용되지 않는 문자'))).toBe(true)
      expect(result.errors.some(e => e.includes('X'))).toBe(true)
    })
  })

  describe('모호 염기(N) 경고', () => {
    it('N 비율 5% 초과 시 경고', () => {
      // 100bp 중 10개 N = 10%
      const seq = 'N'.repeat(10) + 'A'.repeat(90)
      const result = validateSequence(seq)

      expect(result.valid).toBe(true) // 경고이지 에러가 아님
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('모호 염기')
      expect(result.ambiguousCount).toBe(10)
      expect(result.ambiguousRatio).toBeCloseTo(0.1)
    })

    it('N 비율 5% 이하면 경고 없음', () => {
      // 100bp 중 5개 N = 5%
      const seq = 'N'.repeat(5) + 'A'.repeat(95)
      const result = validateSequence(seq)

      expect(result.warnings).toHaveLength(0)
      expect(result.ambiguousCount).toBe(5)
    })
  })

  describe('GC 함량 계산', () => {
    it('GC 함량을 정확히 계산', () => {
      // G 50개 + A 50개 = GC 50%
      const seq = 'G'.repeat(50) + 'A'.repeat(50)
      const result = validateSequence(seq)
      expect(result.gcContent).toBeCloseTo(0.5)
    })
  })
})
