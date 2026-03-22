import { describe, it, expect } from 'vitest'
import type { BlastTopHit } from '@biohub/types'
import {
  analyzeBlastResult,
  parseBlastHits,
  detectTaxonAlert,
  getRecommendedMarkers,
} from '@/lib/decision-engine'

// ─── 헬퍼 ───

function makeHit(species: string, identity: number, accession = 'AB123456'): BlastTopHit {
  return { species, identity, accession, description: species }
}

// ─── analyzeBlastResult ───

describe('analyzeBlastResult', () => {
  it('빈 배열 → no_hit', () => {
    const result = analyzeBlastResult([])
    expect(result.status).toBe('no_hit')
    expect(result.title).toContain('매칭 없음')
  })

  it('≥97% 단일 매칭 → high', () => {
    const hits = [makeHit('Gadus morhua', 0.992), makeHit('Gadus ogac', 0.85)]
    const result = analyzeBlastResult(hits)
    expect(result.status).toBe('high')
    expect(result.title).toContain('종 수준 확인')
  })

  it('≥97% 하지만 top 2가 <2% 차이 → ambiguous', () => {
    const hits = [
      makeHit('Thunnus albacares', 0.992),
      makeHit('Thunnus obesus', 0.991),
      makeHit('Thunnus tonggol', 0.985),
    ]
    const result = analyzeBlastResult(hits)
    expect(result.status).toBe('ambiguous')
  })

  it('95-97% → ambiguous', () => {
    const hits = [makeHit('Gadus morhua', 0.96)]
    const result = analyzeBlastResult(hits)
    expect(result.status).toBe('ambiguous')
  })

  it('90-95% → low', () => {
    const hits = [makeHit('Gadus morhua', 0.92)]
    const result = analyzeBlastResult(hits)
    expect(result.status).toBe('low')
    expect(result.title).toContain('속 수준')
  })

  it('<90% → failed', () => {
    const hits = [makeHit('Gadus morhua', 0.85)]
    const result = analyzeBlastResult(hits)
    expect(result.status).toBe('failed')
    expect(result.title).toContain('동정 실패')
  })

  it('currentMarker가 추천 마커에 반영됨', () => {
    const hits = [makeHit('Gadus morhua', 0.92)]
    const result = analyzeBlastResult(hits, 'COI')
    expect(result.recommendedMarkers).toContain('Cyt b')
    expect(result.recommendedMarkers).toContain('D-loop')
  })

  it('high 결과 → 추천 마커 없음', () => {
    const hits = [makeHit('Gadus morhua', 0.995)]
    const result = analyzeBlastResult(hits, 'COI')
    expect(result.recommendedMarkers).toHaveLength(0)
  })

  it('nextActions 항상 존재', () => {
    const result = analyzeBlastResult([makeHit('Test', 0.5)])
    expect(result.nextActions.length).toBeGreaterThan(0)
    expect(result.nextActions[0].label).toBeTruthy()
  })
})

// ─── detectTaxonAlert ───

describe('detectTaxonAlert', () => {
  it('Thunnus → 참치 안내', () => {
    const alert = detectTaxonAlert([makeHit('Thunnus albacares', 0.99)])
    expect(alert?.taxon).toBe('Thunnus')
    expect(alert?.recommendation).toContain('D-loop')
  })

  it('Salmo → 연어과 안내', () => {
    const alert = detectTaxonAlert([makeHit('Salmo trutta', 0.95)])
    expect(alert?.taxon).toBe('Salmonidae')
  })

  it('Oncorhynchus → 연어과 안내', () => {
    const alert = detectTaxonAlert([makeHit('Oncorhynchus mykiss', 0.96)])
    expect(alert?.taxon).toBe('Salmonidae')
  })

  it('Rana → 양서류 안내', () => {
    const alert = detectTaxonAlert([makeHit('Rana temporaria', 0.88)])
    expect(alert?.taxon).toBe('Amphibia')
    expect(alert?.recommendation).toContain('16S')
  })

  it('Mytilus → 이매패류 DUI 안내', () => {
    const alert = detectTaxonAlert([makeHit('Mytilus edulis', 0.90)])
    expect(alert?.taxon).toBe('Bivalvia')
    expect(alert?.recommendation).toContain('ITS2')
  })

  it('일반 종 → 안내 없음', () => {
    const alert = detectTaxonAlert([makeHit('Gadus morhua', 0.99)])
    expect(alert).toBeNull()
  })

  it('빈 배열 → null', () => {
    expect(detectTaxonAlert([])).toBeNull()
  })
})

// ─── getRecommendedMarkers ───

describe('getRecommendedMarkers', () => {
  it('high → 빈 배열', () => {
    expect(getRecommendedMarkers('high', null, 'COI')).toEqual([])
  })

  it('Thunnus alert → D-loop, ITS1, Cyt b', () => {
    const alert = { taxon: 'Thunnus', title: '', description: '', recommendation: '' }
    const markers = getRecommendedMarkers('ambiguous', alert, 'COI')
    expect(markers).toContain('D-loop')
    expect(markers).toContain('ITS1')
  })

  it('Amphibia alert → 16S rRNA', () => {
    const alert = { taxon: 'Amphibia', title: '', description: '', recommendation: '' }
    const markers = getRecommendedMarkers('low', alert, 'COI')
    expect(markers).toContain('16S rRNA')
  })

  it('COI 마커 실패 → Cyt b, D-loop 추천', () => {
    const markers = getRecommendedMarkers('low', null, 'COI')
    expect(markers).toContain('Cyt b')
    expect(markers).toContain('D-loop')
  })

  it('16S 마커 실패 → COI, 12S 추천', () => {
    const markers = getRecommendedMarkers('low', null, '16S')
    expect(markers).toContain('COI')
    expect(markers).toContain('12S')
  })
})

// ─── parseBlastHits ───

describe('parseBlastHits', () => {
  it('빈/잘못된 입력 → 빈 배열', () => {
    expect(parseBlastHits(null)).toEqual([])
    expect(parseBlastHits({})).toEqual([])
    expect(parseBlastHits('string')).toEqual([])
  })

  it('유효한 NCBI JSON2 응답 파싱', () => {
    const data = {
      BlastOutput2: [{
        report: {
          results: {
            search: {
              hits: [{
                description: [{ title: 'Gadus morhua isolate XYZ cytochrome c oxidase', accession: 'KF601412' }],
                hsps: [{
                  identity: 648,
                  align_len: 654,
                  evalue: 0.0,
                  query_from: 1,
                  query_to: 654,
                  query_len: 654,
                }],
              }],
            },
          },
        },
      }],
    }

    const hits = parseBlastHits(data)
    expect(hits).toHaveLength(1)
    expect(hits[0].species).toBe('Gadus morhua')
    expect(hits[0].identity).toBeCloseTo(0.9908, 3)
    expect(hits[0].accession).toBe('KF601412')
  })

  it('종명 추출: 첫 두 단어', () => {
    const data = {
      BlastOutput2: [{
        report: {
          results: {
            search: {
              hits: [{
                description: [{ title: 'Thunnus albacares voucher ABC123 COI gene', accession: 'AB000001' }],
                hsps: [{ identity: 600, align_len: 650, evalue: 0.0, query_from: 1, query_to: 650, query_len: 650 }],
              }],
            },
          },
        },
      }],
    }

    const hits = parseBlastHits(data)
    expect(hits[0].species).toBe('Thunnus albacares')
  })

  it('최대 10개까지만', () => {
    const manyHits = Array.from({ length: 15 }, (_, i) => ({
      description: [{ title: `Species ${i}`, accession: `ACC${i}` }],
      hsps: [{ identity: 600, align_len: 650, evalue: 0.0, query_from: 1, query_to: 650, query_len: 650 }],
    }))

    const data = {
      BlastOutput2: [{ report: { results: { search: { hits: manyHits } } } }],
    }

    expect(parseBlastHits(data)).toHaveLength(10)
  })
})
