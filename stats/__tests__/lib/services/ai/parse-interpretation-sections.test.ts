import { describe, it, expect } from 'vitest'
import { parseDetailSections } from '@/lib/services/ai/parse-interpretation-sections'

// ============================================
// 헬퍼
// ============================================

/** 전체 8섹션 포함 샘플 상세 텍스트 */
const FULL_DETAIL = `**통계량 해석**: 검정 통계량 t=3.42는 두 그룹 간 평균 차이가 크다는 것을 의미해요.

**효과크기**: Cohen's d가 0.82로 큰 효과크기에요. 실질적으로 의미 있는 차이라고 볼 수 있어요.

**신뢰구간**: 95% CI [1.23, 4.56]으로, 모집단의 실제 평균 차이가 이 범위 안에 있을 거예요.

**가정 충족 여부**: Shapiro-Wilk p=0.234로 정규성 가정이 충족되었어요. Levene p=0.512로 등분산성도 충족이에요.

**그룹/변수별 패턴**: A그룹 평균 12.3, B그룹 8.7로 A그룹이 유의하게 높아요.

**활용 방법**: 이 결과를 바탕으로 사료 종류에 따른 성장률 차이를 보고할 수 있어요.

**주의할 점**: 표본 크기가 30으로 검정력이 충분하지 않을 수 있어요. 추가 표본 수집을 권장해요.

**추가 분석 제안**: Tukey HSD를 추가로 수행하면 다중 비교에서 더 정확한 결론을 낼 수 있어요.`

// ============================================
// 테스트
// ============================================

describe('parseDetailSections', () => {
  it('빈 문자열이면 빈 배열 반환', () => {
    expect(parseDetailSections('', false)).toEqual([])
    expect(parseDetailSections(null, false)).toEqual([])
  })

  it('볼드 소제목이 없으면 빈 배열 반환 (fallback용)', () => {
    const plain = '이 결과는 통계적으로 유의해요. p-value가 0.003이에요.'
    expect(parseDetailSections(plain, false)).toEqual([])
  })

  it('전체 8섹션을 올바르게 파싱', () => {
    const sections = parseDetailSections(FULL_DETAIL, false)

    expect(sections).toHaveLength(8)

    // 키 순서 확인
    const keys = sections.map(s => s.key)
    expect(keys).toEqual([
      'statistics', 'effectSize', 'confidence', 'assumptions',
      'groupPatterns', 'practical', 'cautions', 'suggestions',
    ])

    // 카테고리 확인
    expect(sections[6].category).toBe('warning')   // 주의할 점
    expect(sections[7].category).toBe('action')     // 추가 분석 제안
    expect(sections[0].category).toBe('detail')     // 통계량 해석

    // shortLabel 확인
    expect(sections[0].shortLabel).toBe('통계량')
    expect(sections[3].shortLabel).toBe('가정 검정')
    expect(sections[5].shortLabel).toBe('활용법')
  })

  it('부분 섹션 (3개만)', () => {
    const partial = `**통계량 해석**: t=3.42로 유의해요.

**효과크기**: d=0.82로 큰 효과.

**주의할 점**: 표본이 작아요.`

    const sections = parseDetailSections(partial, false)
    expect(sections).toHaveLength(3)
    expect(sections[0].key).toBe('statistics')
    expect(sections[1].key).toBe('effectSize')
    expect(sections[2].key).toBe('cautions')
    expect(sections[2].category).toBe('warning')
  })

  it('스트리밍 중 마지막 섹션만 isStreaming=true', () => {
    const streaming = `**통계량 해석**: t=3.42.

**효과크기**: d=0.82 큰 효과`

    const sections = parseDetailSections(streaming, true)
    expect(sections).toHaveLength(2)
    expect(sections[0].isStreaming).toBe(false)
    expect(sections[1].isStreaming).toBe(true)
  })

  it('스트리밍 false면 모든 섹션 isStreaming=false', () => {
    const sections = parseDetailSections(FULL_DETAIL, false)
    expect(sections.every(s => !s.isStreaming)).toBe(true)
  })

  it('미완성 볼드는 무시 (닫는 ** 없음)', () => {
    const incomplete = `**통계량 해석**: t=3.42.

**효과크기`  // 닫는 ** 없음

    const sections = parseDetailSections(incomplete, true)
    // 통계량 해석만 파싱됨, 미완성 볼드는 무시
    expect(sections).toHaveLength(1)
    expect(sections[0].key).toBe('statistics')
  })

  it('알 수 없는 헤딩은 unknown 키 + detail 카테고리', () => {
    const custom = `**커스텀 분석**: 특별한 결과예요.

**데이터 품질**: 매우 양호해요.`

    const sections = parseDetailSections(custom, false)
    expect(sections).toHaveLength(2)
    expect(sections[0].key).toBe('unknown-0')
    expect(sections[0].category).toBe('detail')
    expect(sections[0].shortLabel).toBe('커스텀 분석')
    expect(sections[1].key).toBe('unknown-1')
  })

  it('중복 키 방지 (같은 헤딩이 두 번)', () => {
    const duplicate = `**통계량 해석**: 첫 번째 내용.

**통계량 해석**: 두 번째 내용.`

    const sections = parseDetailSections(duplicate, false)
    expect(sections).toHaveLength(2)
    // 첫 번째는 원래 키, 두 번째는 인덱스 붙음
    expect(sections[0].key).toBe('statistics')
    expect(sections[1].key).toBe('statistics-0')
  })

  it('콜론 없는 볼드 헤딩도 파싱', () => {
    const noColon = `**통계량 해석**
t=3.42로 유의해요.

**효과크기**
d=0.82.`

    const sections = parseDetailSections(noColon, false)
    expect(sections).toHaveLength(2)
    expect(sections[0].key).toBe('statistics')
    expect(sections[0].content).toContain('t=3.42')
  })

  it('한국어 콜론(：)도 처리', () => {
    const koreanColon = `**통계량 해석**： t=3.42입니다.`
    const sections = parseDetailSections(koreanColon, false)
    expect(sections).toHaveLength(1)
    expect(sections[0].content).toContain('t=3.42')
  })

  it('content에 볼드 헤딩이 포함되지 않음', () => {
    const sections = parseDetailSections(FULL_DETAIL, false)
    for (const section of sections) {
      expect(section.content).not.toMatch(/^\*\*[^*]+\*\*/)
    }
  })

  it('부분 매칭: 헤딩 텍스트가 약간 다를 때', () => {
    const variation = `**통계량 해석 결과**: t=3.42.`
    const sections = parseDetailSections(variation, false)
    expect(sections).toHaveLength(1)
    // '통계량 해석 결과' contains '통계량 해석' → statistics로 매핑
    expect(sections[0].key).toBe('statistics')
    expect(sections[0].shortLabel).toBe('통계량')
  })

  it('본문 내 inline bold는 섹션으로 오인하지 않음', () => {
    const withInlineBold = `**통계량 해석**: p-value가 **0.003**으로 매우 유의해요. 이는 **큰 차이**를 의미합니다.

**효과크기**: d=0.82.`

    const sections = parseDetailSections(withInlineBold, false)
    // 줄 시작의 **통계량 해석**, **효과크기**만 섹션. 본문 내 **0.003**, **큰 차이**는 무시
    expect(sections).toHaveLength(2)
    expect(sections[0].key).toBe('statistics')
    expect(sections[0].content).toContain('**0.003**')
    expect(sections[0].content).toContain('**큰 차이**')
    expect(sections[1].key).toBe('effectSize')
  })
})
