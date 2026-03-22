import type { BlastResultStatus, BlastTopHit } from '@biohub/types'

/**
 * Decision Engine — BLAST 결과를 4단계로 분류하고 맞춤 안내 생성
 *
 * REFERENCE-E0 섹션 7 + 8-3 + 8-4 기반
 */

export interface DecisionResult {
  status: BlastResultStatus
  title: string
  description: string
  topHits: BlastTopHit[]
  taxonAlert: TaxonAlert | null
  recommendedMarkers: string[]
  nextActions: NextAction[]
}

export interface TaxonAlert {
  taxon: string
  title: string
  description: string
  recommendation: string
}

export interface NextAction {
  label: string
  type: 'primary' | 'secondary'
  action: string // 식별자 (UI에서 매핑)
}

/**
 * Worker의 tabular BLAST 응답 파싱
 * Worker가 { hits: [{ accession, identity, alignLength, evalue, ... }] }를 반환
 */
export function parseBlastHits(data: unknown): BlastTopHit[] {
  try {
    const root = data as Record<string, unknown>
    const rawHits = root['hits'] as Array<Record<string, unknown>> | undefined

    if (!rawHits || rawHits.length === 0) return []

    return rawHits.slice(0, 10).map(hit => {
      const accession = (hit['accession'] as string) || ''
      const identity = (hit['identity'] as number) || 0
      const alignLength = (hit['alignLength'] as number) || 0
      const queryStart = (hit['queryStart'] as number) || 0
      const queryEnd = (hit['queryEnd'] as number) || 0

      return {
        species: accession, // 종명은 accession으로 우선 표시 (E-utilities 연동 시 개선)
        identity,
        accession,
        evalue: (hit['evalue'] as number) ?? undefined,
        queryCoverage: alignLength > 0 ? (queryEnd - queryStart + 1) / alignLength : undefined,
        description: accession,
      }
    })
  } catch (err) {
    console.warn('[parseBlastHits] 응답 파싱 실패:', err)
    return []
  }
}

/** 4단계 분류 + 맞춤 안내 생성 */
export function analyzeBlastResult(topHits: BlastTopHit[], currentMarker?: string): DecisionResult {
  const mk = currentMarker || ''

  if (topHits.length === 0) {
    return makeResult('no_hit', topHits, '매칭 없음', 'DB에 유사 서열이 없습니다.', [
      { label: '서열 품질 확인', type: 'primary', action: 'quality-check' },
      { label: '다른 마커로 분석', type: 'secondary', action: 'change-marker' },
      { label: '신종 후보 안내', type: 'secondary', action: 'novel-species' },
    ], mk)
  }

  const best = topHits[0]
  const bestIdentity = best.identity

  const topSpecies = topHits.slice(0, 3).map(h => h.species)
  const uniqueSpecies = new Set(topSpecies)
  const isAmbiguous = uniqueSpecies.size > 1 &&
    topHits.length >= 2 &&
    Math.abs(topHits[0].identity - topHits[1].identity) < 0.02

  if (bestIdentity >= 0.97 && !isAmbiguous) {
    return makeResult('high', topHits,
      '종 수준 확인됨',
      `${best.species} (${(bestIdentity * 100).toFixed(1)}% 일치)`,
      [
        { label: '보고서 생성', type: 'primary', action: 'report' },
        { label: '종 상세정보', type: 'secondary', action: 'species-info' },
        { label: 'GenBank 레코드', type: 'secondary', action: 'genbank' },
      ], mk)
  }

  if (bestIdentity >= 0.95 || (isAmbiguous && bestIdentity >= 0.90)) {
    const desc = isAmbiguous
      ? `${uniqueSpecies.size}개 종이 유사하게 매칭됨 (${[...uniqueSpecies].join(', ')})`
      : `최고 유사도 ${(bestIdentity * 100).toFixed(1)}% — 종 수준 확신 불가`

    return makeResult('ambiguous', topHits, '종 구분 불확실', desc, [
      { label: '추가 마커 추천', type: 'primary', action: 'recommend-marker' },
      { label: '관련 논문 보기', type: 'secondary', action: 'papers' },
      { label: '계통수 보기', type: 'secondary', action: 'phylogeny' },
    ], mk)
  }

  if (bestIdentity >= 0.90) {
    return makeResult('low', topHits,
      '속 수준 확인, 종 구분 불가',
      `최고 유사도 ${(bestIdentity * 100).toFixed(1)}% — 추가 마커 분석이 필요합니다.`,
      [
        { label: '대안 마커 안내', type: 'primary', action: 'recommend-marker' },
        { label: '실험 프로토콜', type: 'secondary', action: 'protocol' },
        { label: '관련 논문', type: 'secondary', action: 'papers' },
      ], mk)
  }

  return makeResult('failed', topHits,
    '동정 실패',
    `최고 유사도 ${(bestIdentity * 100).toFixed(1)}% — 서열 품질 문제 또는 DB 미등록 종 가능`,
    [
      { label: '서열 품질 재검사', type: 'primary', action: 'quality-check' },
      { label: '다른 DB 검색', type: 'secondary', action: 'alt-db' },
      { label: '신종 등록 가이드', type: 'secondary', action: 'novel-species' },
    ], mk)
}

/** 분류군별 맞춤 안내 */
export function detectTaxonAlert(topHits: BlastTopHit[]): TaxonAlert | null {
  if (topHits.length === 0) return null

  const bestSpecies = topHits[0].species.toLowerCase()
  const bestDesc = topHits[0].description?.toLowerCase() || ''

  // Thunnus (참치류)
  if (bestSpecies.startsWith('thunnus') || bestDesc.includes('thunnus')) {
    return {
      taxon: 'Thunnus',
      title: '참치류 COI 한계',
      description: '참치류는 최근 진화 + mtDNA 공유(introgression)로 COI 종 구분이 어렵습니다.',
      recommendation: 'D-loop (Control Region) 사용을 권장합니다. ITS1으로 교차 검증하세요.',
    }
  }

  // Salmo / Salmonidae (연어과)
  if (bestSpecies.startsWith('salmo ') || bestSpecies.startsWith('oncorhynchus') || bestDesc.includes('salmonidae')) {
    return {
      taxon: 'Salmonidae',
      title: '연어과 교잡 주의',
      description: '연어과는 종간 교잡과 haplotype 공유가 광범위합니다.',
      recommendation: 'D-loop + microsatellite 또는 ITS 사용을 권장합니다.',
    }
  }

  // 양서류 감지 (일부 속 이름으로)
  const amphibianGenera = ['rana ', 'bufo ', 'hyla ', 'salamandra ', 'triturus ', 'plethodon ']
  if (amphibianGenera.some(g => bestSpecies.startsWith(g)) || bestDesc.includes('amphibia')) {
    return {
      taxon: 'Amphibia',
      title: '양서류 높은 종내 변이',
      description: '양서류 COI 종내 변이는 7-14%로 다른 동물의 3-7배입니다. 일반 임계값(2-3%) 적용 불가.',
      recommendation: '16S rRNA 병행 분석을 권장합니다. 종 경계 임계값은 ~10%입니다.',
    }
  }

  // 이매패류
  const bivalveGenera = ['mytilus ', 'crassostrea ', 'mercenaria ', 'mactra ', 'ruditapes ']
  if (bivalveGenera.some(g => bestSpecies.startsWith(g)) || bestDesc.includes('bivalvia')) {
    return {
      taxon: 'Bivalvia',
      title: '이매패류 DUI 주의',
      description: '이매패류는 수컷이 2개의 서로 다른 미토콘드리아 게놈을 가져 COI 결과가 오도될 수 있습니다.',
      recommendation: '핵 마커(ITS2, H3, 28S) 병행이 필수입니다.',
    }
  }

  return null
}

/** 추천 마커 결정 */
export function getRecommendedMarkers(
  status: BlastResultStatus,
  taxonAlert: TaxonAlert | null,
  currentMarker: string
): string[] {
  if (status === 'high') return []

  // 분류군별 추천
  if (taxonAlert) {
    switch (taxonAlert.taxon) {
      case 'Thunnus': return ['D-loop', 'ITS1', 'Cyt b']
      case 'Salmonidae': return ['D-loop', 'microsatellite', 'ITS']
      case 'Amphibia': return ['16S rRNA', 'RAG1']
      case 'Bivalvia': return ['ITS2', 'H3', '28S']
    }
  }

  // 일반 대안 (현재 마커에 따라)
  if (currentMarker === 'COI') return ['Cyt b', 'D-loop', '16S rRNA']
  if (currentMarker === '16S') return ['COI', '12S']
  if (currentMarker === '12S') return ['COI', '16S']

  return ['COI', 'Cyt b']
}

function makeResult(
  status: BlastResultStatus,
  topHits: BlastTopHit[],
  title: string,
  description: string,
  nextActions: NextAction[],
  currentMarker: string
): DecisionResult {
  const taxonAlert = detectTaxonAlert(topHits)
  const recommendedMarkers = getRecommendedMarkers(status, taxonAlert, currentMarker)

  return { status, title, description, topHits, taxonAlert, recommendedMarkers, nextActions }
}
