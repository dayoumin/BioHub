import { describe, it, expect } from 'vitest'
import { getAlternatives } from '@/lib/statistics/alternative-mapping'

describe('alternative-mapping', () => {
  it('ANOVA의 Welch 대안은 canonical ANOVA 페이지로 연결한다', () => {
    const alternatives = getAlternatives('anova')
    const welchAnova = alternatives.find(item => item.name === "Welch's ANOVA")

    expect(welchAnova).toBeDefined()
    expect(welchAnova?.route).toBe('/statistics/anova')
    expect(welchAnova?.methodId).toBe('one-way-anova')
    expect(welchAnova?.suggestedSettings).toEqual({
      welch: true,
      postHoc: 'games-howell',
    })
  })

  it('paired-t는 Wilcoxon 대안을 반환한다', () => {
    const alternatives = getAlternatives('paired-t')

    expect(alternatives).toEqual([
      {
        name: 'Wilcoxon Signed-Rank',
        route: '/statistics/wilcoxon',
        reason: '정규성 위반 시 (비모수 검정)',
      },
    ])
  })
})
