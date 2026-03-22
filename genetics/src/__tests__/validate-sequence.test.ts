import { describe, it, expect } from 'vitest'
import { validateSequence, cleanSequence } from '@/lib/validate-sequence'

describe('cleanSequence', () => {
  it('FASTA 헤더 제거', () => {
    expect(cleanSequence('>sample\nATGC')).toBe('ATGC')
  })

  it('공백, 숫자, 개행 제거', () => {
    expect(cleanSequence('ATG C\n123\tGCA')).toBe('ATGCGCA')
  })

  it('소문자 → 대문자', () => {
    expect(cleanSequence('atgcn')).toBe('ATGCN')
  })

  it('복수 FASTA 헤더 처리', () => {
    expect(cleanSequence('>seq1\nATGC\n>seq2\nGGCC')).toBe('ATGCGGCC')
  })

  it('빈 입력', () => {
    expect(cleanSequence('')).toBe('')
  })
})

describe('validateSequence', () => {
  const validSeq = 'A'.repeat(100) // 최소 길이

  it('유효한 서열 (100bp)', () => {
    const result = validateSequence(validSeq)
    expect(result.valid).toBe(true)
    expect(result.length).toBe(100)
    expect(result.errors).toHaveLength(0)
  })

  it('빈 서열 → 에러', () => {
    const result = validateSequence('')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('서열을 입력')
  })

  it('100bp 미만 → 에러', () => {
    const result = validateSequence('ATGC'.repeat(10)) // 40bp
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('최소 100 bp')
  })

  it('100bp 경계값 통과', () => {
    const result = validateSequence('A'.repeat(100))
    expect(result.valid).toBe(true)
  })

  it('99bp 경계값 실패', () => {
    const result = validateSequence('A'.repeat(99))
    expect(result.valid).toBe(false)
  })

  it('허용되지 않는 문자 → 에러', () => {
    const result = validateSequence('A'.repeat(99) + 'X')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('허용되지 않는 문자')
    expect(result.errors[0]).toContain('X')
  })

  it('FASTA 헤더 포함해도 정상 처리', () => {
    const fasta = '>my_sequence\n' + 'ATGC'.repeat(30) // 120bp
    const result = validateSequence(fasta)
    expect(result.valid).toBe(true)
    expect(result.length).toBe(120)
  })

  it('GC 함량 계산', () => {
    const seq = 'GC'.repeat(50) + 'AT'.repeat(50) // 200bp, GC=50%
    const result = validateSequence(seq)
    expect(result.gcContent).toBeCloseTo(0.5)
  })

  it('N이 5% 이하 → 경고 없음', () => {
    const seq = 'A'.repeat(95) + 'N'.repeat(5) // 5%
    const result = validateSequence(seq)
    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('N이 5% 초과 → 경고', () => {
    const seq = 'A'.repeat(93) + 'N'.repeat(7) // 7%
    const result = validateSequence(seq)
    expect(result.valid).toBe(true) // 에러가 아니라 경고
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('모호 염기')
  })

  it('ambiguousCount 정확', () => {
    const seq = 'A'.repeat(97) + 'NNN'
    const result = validateSequence(seq)
    expect(result.ambiguousCount).toBe(3)
  })

  it('숫자/공백은 무시', () => {
    const seq = '1 A T G C '.repeat(30) // 숫자/공백 제거 후 120bp
    const result = validateSequence(seq)
    expect(result.valid).toBe(true)
    expect(result.length).toBe(120)
  })
})
