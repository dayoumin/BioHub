/**
 * AI 해석 응답의 상세 섹션 파서
 *
 * splitInterpretation()이 반환한 detail 문자열을
 * **볼드 소제목** 기준으로 개별 섹션으로 분리한다.
 *
 * 스트리밍 안전: 미완성 볼드 마크다운은 무시하고,
 * 완성된 **...**  쌍만 파싱한다.
 */

// ============================================
// 타입
// ============================================

export type SectionCategory = 'detail' | 'warning' | 'action'

export interface InterpretationSection {
  /** 섹션 키 — React key + 테마 조회용 */
  key: string
  /** 원문 헤딩 텍스트 (e.g. '통계량 해석') */
  label: string
  /** pill 표시용 짧은 라벨 (e.g. '통계량') */
  shortLabel: string
  /** 마크다운 내용 (볼드 헤딩 제외) */
  content: string
  /** 스트리밍 중 마지막 섹션이면 true */
  isStreaming: boolean
  /** 렌더링 스타일 결정 */
  category: SectionCategory
}

// ============================================
// 헤딩 → 키/카테고리/짧은라벨 매핑
// ============================================

interface SectionMeta {
  key: string
  shortLabel: string
  category: SectionCategory
}

/** 정규 헤딩 → 메타 매핑 (프롬프트에서 지정한 정확한 문구) */
const HEADING_MAP: Record<string, SectionMeta> = {
  '통계량 해석': { key: 'statistics', shortLabel: '통계량', category: 'detail' },
  '효과크기': { key: 'effectSize', shortLabel: '효과크기', category: 'detail' },
  '신뢰구간': { key: 'confidence', shortLabel: '신뢰구간', category: 'detail' },
  '가정 충족 여부': { key: 'assumptions', shortLabel: '가정 검정', category: 'detail' },
  '그룹/변수별 패턴': { key: 'groupPatterns', shortLabel: '그룹 패턴', category: 'detail' },
  '활용 방법': { key: 'practical', shortLabel: '활용법', category: 'detail' },
  '주의할 점': { key: 'cautions', shortLabel: '주의사항', category: 'warning' },
  '추가 분석 제안': { key: 'suggestions', shortLabel: '추가 분석', category: 'action' },
}

/** AI가 자주 쓰는 축약형/동의어 → 정규 메타 매핑 */
const HEADING_ALIASES: Record<string, SectionMeta> = {
  // warning 계열
  '주의사항': HEADING_MAP['주의할 점'],
  '주의 사항': HEADING_MAP['주의할 점'],
  '유의사항': HEADING_MAP['주의할 점'],
  '유의할 점': HEADING_MAP['주의할 점'],
  '해석 시 주의': HEADING_MAP['주의할 점'],
  '한계점': HEADING_MAP['주의할 점'],
  '한계': HEADING_MAP['주의할 점'],
  // action 계열
  '추가 분석': HEADING_MAP['추가 분석 제안'],
  '후속 분석': HEADING_MAP['추가 분석 제안'],
  '후속 분석 제안': HEADING_MAP['추가 분석 제안'],
  '추천 분석': HEADING_MAP['추가 분석 제안'],
  // assumptions 계열
  '가정 검정': HEADING_MAP['가정 충족 여부'],
  '가정 검정 결과': HEADING_MAP['가정 충족 여부'],
  '가정 충족': HEADING_MAP['가정 충족 여부'],
  // practical 계열
  '활용법': HEADING_MAP['활용 방법'],
  '실무 활용': HEADING_MAP['활용 방법'],
  '실질적 의미': HEADING_MAP['활용 방법'],
  // groupPatterns 계열
  '그룹별 패턴': HEADING_MAP['그룹/변수별 패턴'],
  '변수별 패턴': HEADING_MAP['그룹/변수별 패턴'],
  '그룹 비교': HEADING_MAP['그룹/변수별 패턴'],
}

function lookupMeta(heading: string): SectionMeta {
  // 1. 정확히 매칭 (정규 헤딩)
  const exact = HEADING_MAP[heading]
  if (exact) return exact

  // 2. 축약형/동의어 매칭
  const alias = HEADING_ALIASES[heading]
  if (alias) return alias

  // 3. 부분 매칭: heading이 알려진 정규 패턴을 포함하는 경우
  for (const [pattern, meta] of Object.entries(HEADING_MAP)) {
    if (heading.includes(pattern)) {
      return meta
    }
  }

  // 4. 부분 매칭: heading이 축약형/동의어를 포함하는 경우 (compound heading 대응: "한계점 및 제안" 등)
  for (const [alias, meta] of Object.entries(HEADING_ALIASES)) {
    if (alias.length >= 3 && heading.includes(alias)) {
      return meta
    }
  }

  return { key: 'unknown', shortLabel: heading, category: 'detail' }
}

// ============================================
// 파서
// ============================================

/**
 * detail 문자열을 볼드 소제목 기준으로 섹션 배열로 분리
 *
 * @param detail - splitInterpretation()이 반환한 detail 문자열
 * @param isStreaming - 현재 스트리밍 중인지 여부
 * @returns 파싱된 섹션 배열. 볼드 소제목이 없으면 빈 배열 (fallback용)
 */
export function parseDetailSections(
  detail: string | null,
  isStreaming: boolean
): InterpretationSection[] {
  if (!detail || detail.trim().length === 0) return []

  // 완성된 **볼드** 쌍만 매칭 — 줄 시작에서만 (본문 내 inline bold 무시)
  // (?:^|\n) = 문자열 시작 또는 줄바꿈 직후
  const headingRegex = /(?:^|\n)\s*\*\*([^*]+)\*\*\s*[:：]?\s*/g

  const matches: Array<{ index: number; fullMatch: string; heading: string }> = []
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(detail)) !== null) {
    matches.push({
      index: match.index,
      fullMatch: match[0],
      heading: match[1].trim(),
    })
  }

  if (matches.length === 0) return []

  // 키 중복 방지용 카운터 (unknown + 동일 헤딩 반복)
  let dedupIdx = 0
  const usedKeys = new Set<string>()

  const sections: InterpretationSection[] = []

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const contentStart = current.index + current.fullMatch.length
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : detail.length
    const content = detail.substring(contentStart, contentEnd).trim()

    const meta = lookupMeta(current.heading)

    // 고유 키 생성
    let uniqueKey = meta.key
    if (uniqueKey === 'unknown' || usedKeys.has(uniqueKey)) {
      uniqueKey = `${meta.key}-${dedupIdx++}`
    }
    usedKeys.add(uniqueKey)

    const isLastSection = i === matches.length - 1

    sections.push({
      key: uniqueKey,
      label: current.heading,
      shortLabel: meta.shortLabel,
      content,
      isStreaming: isStreaming && isLastSection,
      category: meta.category,
    })
  }

  return sections
}
