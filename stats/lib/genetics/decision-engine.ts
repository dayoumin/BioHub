import type { BlastMarker, BlastResultStatus, BlastTopHit } from '@biohub/types'

/**
 * Decision Engine — BLAST 결과를 4단계로 분류하고 맞춤 안내 생성
 *
 * REFERENCE-E0 섹션 7 + 8-3 + 8-4 기반
 */

export interface MarkerRecommendation {
  name: string
  reason: string
  detail: string
}

export interface DecisionResult {
  status: BlastResultStatus
  title: string
  description: string
  topHits: BlastTopHit[]
  taxonAlert: TaxonAlert | null
  recommendedMarkers: MarkerRecommendation[]
  nextActions: NextAction[]
}

export interface TaxonAlert {
  taxon: string
  title: string
  description: string
  recommendation: string
}

export type NextActionId =
  | 'quality-check' | 'change-marker' | 'novel-species'
  | 'report' | 'species-info' | 'genbank'
  | 'recommend-marker' | 'papers' | 'phylogeny'
  | 'protocol' | 'alt-db'

export interface NextAction {
  label: string
  type: 'primary' | 'secondary'
  action: NextActionId
}

/**
 * Worker의 tabular BLAST 응답 파싱
 * Worker가 { hits: [{ accession, identity, alignLength, evalue, ... }] }를 반환
 */
export function parseBlastHits(data: unknown): BlastTopHit[] {
  if (!data || typeof data !== 'object') return []
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

      const species = (hit['species'] as string) || accession

      return {
        species,
        identity,
        accession,
        evalue: (hit['evalue'] as number) ?? undefined,
        bitScore: (hit['bitScore'] as number) ?? undefined,
        queryCoverage: alignLength > 0 ? (queryEnd - queryStart + 1) / alignLength : undefined,
        taxid: (hit['taxid'] as number) ?? undefined,
        country: (hit['country'] as string) ?? undefined,
        isBarcode: (hit['isBarcode'] as boolean) ?? undefined,
        description: species,
      }
    })
  } catch (err) {
    console.warn('[parseBlastHits] 응답 파싱 실패:', err)
    return []
  }
}

/** 4단계 분류 + 맞춤 안내 생성 */
export function analyzeBlastResult(topHits: BlastTopHit[], currentMarker: BlastMarker = 'COI'): DecisionResult {
  const mk = currentMarker

  if (topHits.length === 0) {
    return makeResult('no_hit', topHits, '매칭 없음', 'DB에서 유사한 서열을 찾지 못했습니다. 서열 품질을 확인하거나 다른 마커를 시도해보세요.', [
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
      '종 수준 동정 가능',
      `${best.species}와 ${(bestIdentity * 100).toFixed(1)}% 일치합니다.`,
      [
        { label: '보고서 생성', type: 'primary', action: 'report' },
        { label: '종 상세정보', type: 'secondary', action: 'species-info' },
        { label: 'GenBank 레코드', type: 'secondary', action: 'genbank' },
      ], mk)
  }

  if (bestIdentity >= 0.95 || (isAmbiguous && bestIdentity >= 0.90)) {
    const desc = isAmbiguous
      ? `${uniqueSpecies.size}개 종이 유사한 유사도로 매칭되어 종 구분이 어렵습니다 (${[...uniqueSpecies].join(', ')})`
      : `최고 유사도 ${(bestIdentity * 100).toFixed(1)}%로, 종 수준 동정에는 추가 확인이 필요합니다.`

    return makeResult('ambiguous', topHits, '종 구분 불확실', desc, [
      { label: '추가 마커 추천', type: 'primary', action: 'recommend-marker' },
      { label: '관련 논문 보기', type: 'secondary', action: 'papers' },
      { label: '계통수 보기', type: 'secondary', action: 'phylogeny' },
    ], mk)
  }

  if (bestIdentity >= 0.90) {
    return makeResult('low', topHits,
      '속 수준 추정, 종 수준은 불확실',
      `최고 유사도 ${(bestIdentity * 100).toFixed(1)}%로, 속 수준까지 추정 가능합니다. 종 확인을 위해 추가 마커 분석을 권장합니다.`,
      [
        { label: '대안 마커 안내', type: 'primary', action: 'recommend-marker' },
        { label: '실험 프로토콜', type: 'secondary', action: 'protocol' },
        { label: '관련 논문', type: 'secondary', action: 'papers' },
      ], mk)
  }

  return makeResult('failed', topHits,
    '동정 어려움',
    `최고 유사도 ${(bestIdentity * 100).toFixed(1)}%로, 종 판별이 어렵습니다. 서열 품질 문제이거나 DB에 미등록된 종일 수 있습니다.`,
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

/** 마커별 상세 정보 */
const MARKER_INFO: Record<string, { reason: string; detail: string }> = {
  'COI': {
    reason: '동물 표준 바코드',
    detail: '대부분의 동물에서 가장 먼저 시도되는 마커. BOLD/GenBank 레퍼런스가 가장 풍부하여 매칭 확률이 높습니다.',
  },
  'Cyt b': {
    reason: '포유류/어류 종 세분화',
    detail: 'COI와 다른 진화 속도를 가져 COI로 구분이 안 되는 근연종에서 차이를 보일 수 있습니다. 특히 포유류와 어류에서 레퍼런스가 풍부합니다.',
  },
  'D-loop': {
    reason: '가장 빠르게 진화하는 영역',
    detail: 'mt DNA에서 가장 변이가 큰 영역. 참치류, 연어과 등 COI가 종간 거의 동일한 분류군에서 종 구분이 가능합니다. 단, 정렬이 어려울 수 있습니다.',
  },
  '16S rRNA': {
    reason: '양서류 표준 + 보편적 프라이머',
    detail: '양서류에서는 COI보다 16S가 종 판별 정확도가 높습니다. 보편적 프라이머로 다양한 분류군에 적용 가능하며, 열화된 시료에서도 증폭 성공률이 높습니다.',
  },
  '12S': {
    reason: '어류 eDNA · 짧은 단편',
    detail: '환경 DNA(eDNA) 분석에 최적화된 짧은 마커(~170bp). 열화된 시료나 혼합 시료에서 증폭 성공률이 높지만 종 수준 해상도는 COI보다 낮을 수 있습니다.',
  },
  'ITS': {
    reason: '진균 표준 바코드',
    detail: '진균류의 공식 바코드 마커. 핵 DNA 마커로 미토콘드리아 마커와 독립적인 정보를 제공합니다.',
  },
  'ITS1': {
    reason: '핵 마커 · 교차 검증',
    detail: '핵 DNA 마커로 미토콘드리아(COI, Cyt b 등)와 독립적인 계통 정보를 제공합니다. mtDNA introgression이 의심될 때 교차 검증에 유용합니다.',
  },
  'ITS2': {
    reason: '핵 마커 · 이매패류 필수',
    detail: '이매패류는 DUI(이중 미토콘드리아 유전) 때문에 mtDNA 마커가 오도될 수 있어, 핵 마커 병행이 필수입니다.',
  },
  'RAG1': {
    reason: '핵 유전자 · 양서류 계통',
    detail: '핵 단백질 코딩 유전자로 양서류의 속~과 수준 계통 관계를 해결하는 데 유용합니다. mtDNA와 독립적인 확인이 필요할 때 사용합니다.',
  },
  'H3': {
    reason: '핵 유전자 · 무척추동물',
    detail: 'Histone H3 핵 마커. 이매패류 등 무척추동물에서 mtDNA와 독립적인 종 확인에 사용됩니다.',
  },
  '28S': {
    reason: '리보솜 핵 마커',
    detail: '28S rDNA는 과~목 수준의 넓은 분류에 유용하며, 이매패류에서 핵 마커로 병행 사용됩니다.',
  },
  'microsatellite': {
    reason: '집단 수준 구분',
    detail: '종 수준이 아닌 집단/개체군 수준 구분이 필요할 때 사용합니다. 연어과의 양식 vs 자연산 구분 등에 활용됩니다.',
  },
}

function toRecommendation(name: string): MarkerRecommendation {
  const info = MARKER_INFO[name]
  return info
    ? { name, reason: info.reason, detail: info.detail }
    : { name, reason: '대안 마커', detail: '현재 마커로 충분한 해상도를 얻지 못했을 때 시도할 수 있는 마커입니다.' }
}

/** 추천 마커 결정 */
export function getRecommendedMarkers(
  status: BlastResultStatus,
  taxonAlert: TaxonAlert | null,
  currentMarker: BlastMarker
): MarkerRecommendation[] {
  if (status === 'high') return []

  // 분류군별 추천
  if (taxonAlert) {
    switch (taxonAlert.taxon) {
      case 'Thunnus': return ['D-loop', 'ITS1', 'Cyt b'].map(toRecommendation)
      case 'Salmonidae': return ['D-loop', 'microsatellite', 'ITS'].map(toRecommendation)
      case 'Amphibia': return ['16S rRNA', 'RAG1'].map(toRecommendation)
      case 'Bivalvia': return ['ITS2', 'H3', '28S'].map(toRecommendation)
    }
  }

  // 일반 대안 (현재 마커에 따라)
  if (currentMarker === 'COI') return ['Cyt b', 'D-loop', '16S rRNA'].map(toRecommendation)
  if (currentMarker === '16S') return ['COI', '12S'].map(toRecommendation)
  if (currentMarker === '12S') return ['COI', '16S'].map(toRecommendation)

  return ['COI', 'Cyt b'].map(toRecommendation)
}

function makeResult(
  status: BlastResultStatus,
  topHits: BlastTopHit[],
  title: string,
  description: string,
  nextActions: NextAction[],
  currentMarker: BlastMarker
): DecisionResult {
  const taxonAlert = detectTaxonAlert(topHits)
  const recommendedMarkers = getRecommendedMarkers(status, taxonAlert, currentMarker)

  return { status, title, description, topHits, taxonAlert, recommendedMarkers, nextActions }
}
