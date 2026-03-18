'use client'

/**
 * PaperDraftPanel 개발용 데모
 * 실제 분석 결과와 연결 전 UI 확인용.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PaperDraftPanel, type PaperDraftContent } from './PaperDraftPanel'

const DEMO_CONTENT: PaperDraftContent = {
  methods: {
    ko: `독립표본 *t*-검정을 실시하여 수컷과 암컷 넙치(*Paralichthys olivaceus*) 간 체중 차이를 분석하였다. 정규성 검정은 Shapiro-Wilk 검정으로, 등분산성 검정은 Levene 검정으로 확인하였다. 유의수준은 α = .05로 설정하였으며, 모든 분석은 브라우저 기반 통계 플랫폼인 BioHub(버전 1.0)를 사용하였다.`,
    en: `An independent samples *t*-test was conducted to examine differences in body weight between male and female fish (*Paralichthys olivaceus*). Data were assessed for normality using the Shapiro-Wilk test and homogeneity of variances using Levene's test. The significance level was set at α = .05. All analyses were performed using BioHub (version 1.0), a browser-based statistical computing platform.`,
  },

  methodsCitation: {
    ko: `Kim, J. (2025). BioHub: 생물학 연구를 위한 웹 기반 통계 분석 플랫폼. https://biohub.ecomarin.workers.dev`,
    en: `Kim, J. (2025). BioHub: A web-based statistical analysis platform for biological research. https://biohub.ecomarin.workers.dev`,
  },

  results: {
    ko: `독립표본 *t*-검정 결과, 수컷 넙치(*M* = 312.4 g, *SD* = 28.7)와 암컷 넙치(*M* = 287.1 g, *SD* = 31.2) 간 체중에서 통계적으로 유의한 차이가 나타났다, *t*(28) = 2.45, *p* = .021, *d* = 0.84 (95% CI [0.16, 1.51]). Cohen(1988)의 기준에 따라 효과크기는 크다고 해석된다.`,
    en: `An independent samples *t*-test revealed a statistically significant difference in body weight between male (*M* = 312.4 g, *SD* = 28.7) and female (*M* = 287.1 g, *SD* = 31.2) olive flounder, *t*(28) = 2.45, *p* = .021, *d* = 0.84 (95% CI [0.16, 1.51]). The effect size was large according to Cohen's (1988) conventions.`,
  },

  captions: [
    {
      id: 'table1',
      label: { ko: '표 1', en: 'Table 1' },
      text: {
        ko: '성별에 따른 넙치(*Paralichthys olivaceus*) 체중(g) 기술통계 (N = 30). 값은 평균 ± 표준편차를 나타낸다.',
        en: 'Descriptive statistics for body weight (g) by sex in *Paralichthys olivaceus* (N = 30). Values represent mean ± standard deviation.',
      },
    },
    {
      id: 'figure1',
      label: { ko: '그림 1', en: 'Figure 1' },
      text: {
        ko: '성별에 따른 넙치 체중(g) 분포를 나타낸 상자 그림. 상자 내 가로선은 중앙값, 상자는 사분위 범위를 나타낸다. 이상값은 개별 점(●)으로 표시하였다.',
        en: 'Box plots depicting the distribution of body weight (g) for male and female olive flounder. The horizontal line within each box indicates the median; boxes span the interquartile range. Outliers are shown as individual points (●).',
      },
    },
  ],
}

/** 실제 스트리밍을 흉내내는 mock 함수 */
async function mockGenerateDiscussion(
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const text = `본 연구는 넙치에서 수컷이 암컷보다 유의하게 높은 체중을 나타냄을 확인하였으며, 이는 관련 가자미목 어류에서 보고된 성적 이형성과 일치하는 결과이다(Park et al., 2020). 큰 효과크기(*d* = 0.84)는 성별이 양식 환경에서 성장 결과의 유의미한 예측 인자임을 시사한다.\n\n이러한 결과는 수조식 넙치 양식에서 성별에 따른 차별적 사료 전략의 필요성을 제기한다. 향후 연구에서는 호르몬 또는 환경적 요인이 발달 단계별로 이 체중 차이를 매개하는지 여부를 검토할 필요가 있다.`

  const words = text.split(' ')
  for (const word of words) {
    if (signal.aborted) {
      const error = new Error('AbortError')
      error.name = 'AbortError'
      throw error
    }
    await new Promise((r) => setTimeout(r, 55))
    onChunk(word + ' ')
  }
}

export function PaperDraftPanelDemo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="p-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">PaperDraftPanel 데모</h2>
      <Button onClick={() => setIsOpen(true)} className="w-fit">
        논문 초안 패널 열기
      </Button>

      <PaperDraftPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        content={DEMO_CONTENT}
        onGenerateDiscussion={mockGenerateDiscussion}
        onRegenerateAll={() => {
          // eslint-disable-next-line no-console
          console.log('전체 다시 생성 요청')
        }}
      />
    </div>
  )
}
