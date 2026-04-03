import { describe, it, expect, beforeEach } from 'vitest'
import {
  storeSequenceForTransfer,
  consumeTransferredSequence,
  formatTransferSource,
} from '@/lib/genetics/sequence-transfer'

describe('sequence-transfer', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('저장 후 consume하면 서열을 반환한다', () => {
    storeSequenceForTransfer('ATGC', 'genbank')
    const result = consumeTransferredSequence()
    expect(result).toEqual({ sequence: 'ATGC', source: 'genbank' })
  })

  it('consume은 1회성 — 두 번째 호출은 null', () => {
    storeSequenceForTransfer('ATGC', 'blast')
    consumeTransferredSequence()
    expect(consumeTransferredSequence()).toBeNull()
  })

  it('저장 없이 consume하면 null', () => {
    expect(consumeTransferredSequence()).toBeNull()
  })

  it('최신 저장이 이전 저장을 덮어쓴다', () => {
    storeSequenceForTransfer('AAA', 'genbank')
    storeSequenceForTransfer('TTT', 'barcoding')
    const result = consumeTransferredSequence()
    expect(result?.sequence).toBe('TTT')
    expect(result?.source).toBe('barcoding')
  })

  it('손상된 JSON은 null을 반환한다', () => {
    sessionStorage.setItem('biohub:sequence-transfer', '{invalid')
    expect(consumeTransferredSequence()).toBeNull()
  })

  it('필수 필드가 누락된 객체는 null을 반환한다', () => {
    sessionStorage.setItem('biohub:sequence-transfer', '{"sequence":"ATGC"}')
    expect(consumeTransferredSequence()).toBeNull()
  })
})

describe('formatTransferSource', () => {
  it('genbank → GenBank', () => {
    expect(formatTransferSource('genbank')).toBe('GenBank')
  })

  it('barcoding → 바코딩', () => {
    expect(formatTransferSource('barcoding')).toBe('바코딩')
  })

  it('blast → BLAST', () => {
    expect(formatTransferSource('blast')).toBe('BLAST')
  })

  it('미등록 소스는 그대로 반환', () => {
    expect(formatTransferSource('unknown-tool')).toBe('unknown-tool')
  })
})
