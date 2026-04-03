/**
 * history-adapters 단위 테스트
 *
 * 3개 모듈 어댑터(통계/유전학/Bio-Tools)의 변환 로직 검증:
 * - 필드 매핑 정확성
 * - pinned 상태 반영
 * - 빈 입력/null 필드 처리
 * - 뱃지 생성 조건
 */

import {
  toAnalysisHistoryItem,
  toAnalysisHistoryItems,
  toGeneticsHistoryItem,
  toGeneticsHistoryItems,
  toBioToolHistoryItem,
  toBioToolHistoryItems,
} from '@/lib/utils/history-adapters'
import type { AnalysisHistory } from '@/lib/stores/history-store'
import type { AnalysisHistoryEntry } from '@/lib/genetics/analysis-history'
import type { BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'

// ── 통계 분석 어댑터 ──

describe('toAnalysisHistoryItem', () => {
  const baseItem: AnalysisHistory = {
    id: 'h1',
    timestamp: new Date('2026-03-27T10:00:00Z'),
    name: 'T-test 분석',
    purpose: '두 그룹 비교',
    method: { id: 't-test', name: '독립표본 t-검정', category: 'parametric' },
    dataFileName: 'data.csv',
    dataRowCount: 100,
    results: { pValue: 0.032, effectSize: { value: 0.45 } },
  }

  it('기본 필드가 정확히 매핑되어야 함', () => {
    const item = toAnalysisHistoryItem(baseItem, [])

    expect(item.id).toBe('h1')
    expect(item.title).toBe('T-test 분석')
    expect(item.subtitle).toBe('두 그룹 비교')
    expect(item.hasResult).toBe(true)
    expect(item.pinned).toBe(false)
    expect(item.createdAt).toBe(new Date('2026-03-27T10:00:00Z').getTime())
  })

  it('pinnedIds에 포함되면 pinned=true', () => {
    const item = toAnalysisHistoryItem(baseItem, ['h1'])
    expect(item.pinned).toBe(true)
  })

  it('pinnedIds에 없으면 pinned=false', () => {
    const item = toAnalysisHistoryItem(baseItem, ['other-id'])
    expect(item.pinned).toBe(false)
  })

  it('method가 있으면 뱃지에 포함', () => {
    const item = toAnalysisHistoryItem(baseItem, [])
    const methodBadge = item.badges?.find(b => b.value === '독립표본 t-검정')
    expect(methodBadge).toBeDefined()
  })

  it('p-value가 0.05 미만이면 primary variant', () => {
    const item = toAnalysisHistoryItem(baseItem, [])
    const pBadge = item.badges?.find(b => b.label === 'p')
    expect(pBadge).toBeDefined()
    expect(pBadge!.value).toBe('0.0320')
    expect(pBadge!.variant).toBe('primary')
  })

  it('p-value가 0.05 이상이면 muted variant', () => {
    const highP = { ...baseItem, results: { pValue: 0.123 } }
    const item = toAnalysisHistoryItem(highP, [])
    const pBadge = item.badges?.find(b => b.label === 'p')
    expect(pBadge!.variant).toBe('muted')
  })

  it('results가 null이면 hasResult=false, p-value 뱃지 없음', () => {
    const noResult = { ...baseItem, results: null }
    const item = toAnalysisHistoryItem(noResult, [])
    expect(item.hasResult).toBe(false)
    expect(item.badges?.find(b => b.label === 'p')).toBeUndefined()
  })

  it('method가 null이면 메서드 뱃지 없음', () => {
    const noMethod = { ...baseItem, method: null }
    const item = toAnalysisHistoryItem(noMethod, [])
    expect(item.badges?.find(b => b.value === '독립표본 t-검정')).toBeUndefined()
  })

  it('purpose가 빈 문자열이면 subtitle=undefined', () => {
    const noPurpose = { ...baseItem, purpose: '' }
    const item = toAnalysisHistoryItem(noPurpose, [])
    expect(item.subtitle).toBeUndefined()
  })

  it('data에 원본 AnalysisHistory가 보존되어야 함', () => {
    const item = toAnalysisHistoryItem(baseItem, [])
    expect(item.data).toBe(baseItem)
  })
})

describe('toAnalysisHistoryItems', () => {
  it('빈 배열 → 빈 배열', () => {
    expect(toAnalysisHistoryItems([], [])).toEqual([])
  })

  it('여러 항목 변환 + pinned 반영', () => {
    const items: AnalysisHistory[] = [
      { id: 'a', timestamp: new Date(), name: 'A', purpose: '', method: null, dataFileName: '', dataRowCount: 0, results: null },
      { id: 'b', timestamp: new Date(), name: 'B', purpose: '', method: null, dataFileName: '', dataRowCount: 0, results: null },
    ]
    const result = toAnalysisHistoryItems(items, ['b'])
    expect(result).toHaveLength(2)
    expect(result[0].pinned).toBe(false)
    expect(result[1].pinned).toBe(true)
  })
})

// ── 유전학 어댑터 ──

describe('toGeneticsHistoryItem', () => {
  const baseEntry: AnalysisHistoryEntry = {
    id: 'g1',
    type: 'barcoding',
    sampleName: 'Sample-01',
    marker: 'COI',
    sequencePreview: 'ATCG...',
    topSpecies: 'Gadus morhua',
    topIdentity: 0.987,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: 'confirmed' as any,
    pinned: true,
    createdAt: 1711500000000,
  }

  it('기본 필드 매핑', () => {
    const item = toGeneticsHistoryItem(baseEntry)
    expect(item.id).toBe('g1')
    expect(item.title).toBe('Sample-01')
    expect(item.pinned).toBe(true)
    expect(item.hasResult).toBe(false) // resultData 없음
    expect(item.createdAt).toBe(1711500000000)
  })

  it('sampleName이 없으면 sequencePreview를 title로', () => {
    const noName = { ...baseEntry, sampleName: '' }
    const item = toGeneticsHistoryItem(noName)
    expect(item.title).toBe('ATCG...')
  })

  it('topSpecies 뱃지: sampleName과 다를 때만 포함', () => {
    const item = toGeneticsHistoryItem(baseEntry)
    expect(item.badges?.find(b => b.value === 'Gadus morhua')).toBeDefined()

    const sameSpecies = { ...baseEntry, topSpecies: 'Sample-01' }
    const item2 = toGeneticsHistoryItem(sameSpecies)
    expect(item2.badges?.find(b => b.value === 'Sample-01')).toBeUndefined()
  })

  it('marker 뱃지는 항상 포함', () => {
    const item = toGeneticsHistoryItem(baseEntry)
    expect(item.badges?.find(b => b.value === 'COI')).toBeDefined()
  })

  it('topIdentity 뱃지: 99.9% 대신 98.7%', () => {
    const item = toGeneticsHistoryItem(baseEntry)
    const identBadge = item.badges?.find(b => b.variant === 'mono')
    expect(identBadge?.value).toBe('98.7%')
  })

  it('topIdentity가 null이면 identity 뱃지 없음', () => {
    const noIdent = { ...baseEntry, topIdentity: null }
    const item = toGeneticsHistoryItem(noIdent)
    expect(item.badges?.find(b => b.variant === 'mono')).toBeUndefined()
  })

  it('pinned 미지정이면 false', () => {
    const noPinned = { ...baseEntry, pinned: undefined }
    const item = toGeneticsHistoryItem(noPinned)
    expect(item.pinned).toBe(false)
  })

  it('resultData 있으면 hasResult=true', () => {
    const withResult = { ...baseEntry, resultData: { species: 'test' } as unknown as AnalysisHistoryEntry['resultData'] }
    const item = toGeneticsHistoryItem(withResult)
    expect(item.hasResult).toBe(true)
  })
})

describe('toGeneticsHistoryItems', () => {
  it('빈 배열 → 빈 배열', () => {
    expect(toGeneticsHistoryItems([])).toEqual([])
  })
})

// ── Bio-Tools 어댑터 ──

describe('toBioToolHistoryItem', () => {
  const baseEntry: BioToolHistoryEntry = {
    id: 'bio-diversity-123',
    toolId: 'diversity-index',
    toolNameEn: 'Diversity Index',
    toolNameKo: '다양성 지수',
    csvFileName: 'species_data.csv',
    columnConfig: { species: 'species', count: 'count' },
    results: { shannonIndex: 2.34 },
    pinned: false,
    createdAt: 1711500000000,
  }

  it('기본 필드 매핑', () => {
    const item = toBioToolHistoryItem(baseEntry)
    expect(item.id).toBe('bio-diversity-123')
    expect(item.title).toBe('species_data.csv')
    expect(item.pinned).toBe(false)
    expect(item.hasResult).toBe(true)
  })

  it('toolNameKo 우선, 없으면 toolNameEn', () => {
    const item = toBioToolHistoryItem(baseEntry)
    const toolBadge = item.badges?.[0]
    expect(toolBadge?.value).toBe('다양성 지수')

    const noKo = { ...baseEntry, toolNameKo: '' }
    const item2 = toBioToolHistoryItem(noKo)
    expect(item2.badges?.[0]?.value).toBe('Diversity Index')
  })

  it('results가 undefined면 hasResult=false', () => {
    const noResult = { ...baseEntry, results: undefined }
    const item = toBioToolHistoryItem(noResult)
    expect(item.hasResult).toBe(false)
  })

  it('pinned 미지정이면 false', () => {
    const noPinned = { ...baseEntry, pinned: undefined }
    const item = toBioToolHistoryItem(noPinned)
    expect(item.pinned).toBe(false)
  })
})

describe('toBioToolHistoryItems', () => {
  it('빈 배열 → 빈 배열', () => {
    expect(toBioToolHistoryItems([])).toEqual([])
  })
})
