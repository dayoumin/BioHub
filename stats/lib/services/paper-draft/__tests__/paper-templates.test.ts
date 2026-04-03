/**
 * paper-templates 테스트
 *
 * 커버리지:
 * 1. fmtP() 경계값
 * 2. 12 카테고리 한글 golden snapshot (Methods + Results + Captions)
 * 3. 불완전 데이터 (effectSize=null, groupStats=[], assumptions=undefined)
 */

import { describe, it, expect } from 'vitest'
import { fmtP, fmt, getTemplate } from '../paper-templates'
import type { TemplateInput } from '../paper-templates'
import type { AnalysisResult } from '@/types/analysis'
import type { DraftContext, FlatAssumption, PaperDraftOptions } from '../paper-types'
import { groupAssumptions } from '@/lib/services/export/assumption-utils'

// ─── 공통 픽스처 ──────────────────────────────────────────────────────────────

const ctx: DraftContext = {
  variableLabels: { body_len: '체장', weight: '체중' },
  variableUnits: { body_len: 'cm', weight: 'g' },
  groupLabels: { M: '수컷', F: '암컷' },
  dependentVariable: '체장',
  researchContext: '양식 어류의 성별에 따른 성장 차이 비교',
}

const opts: PaperDraftOptions = {
  language: 'ko',
  postHocDisplay: 'significant-only',
}

/** 기본 AnalysisResult 팩토리 */
function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 't-test',
    statistic: 2.45,
    pValue: 0.021,
    df: 28,
    effectSize: 0.89,
    confidence: { lower: 0.34, upper: 4.06, level: 0.95 },
    interpretation: '유의한 차이',
    groupStats: [
      { name: 'M', mean: 13.1, std: 2.8, n: 15 },
      { name: 'F', mean: 15.3, std: 2.1, n: 15 },
    ],
    ...overrides,
  }
}

/** 기본 가정 픽스처 */
const normAssumptions: FlatAssumption[] = [
  { category: 'normality', testName: 'Shapiro-Wilk', statistic: 0.96, pValue: 0.712, passed: true, group: 'group1' },
  { category: 'normality', testName: 'Shapiro-Wilk', statistic: 0.94, pValue: 0.534, passed: true, group: 'group2' },
]
const homoAssumptions: FlatAssumption[] = [
  { category: 'homogeneity', testName: 'Levene', statistic: 1.23, pValue: 0.277, passed: true },
]

function makeInput(
  methodId: string,
  rOverrides: Partial<AnalysisResult> = {},
  assumptionOverrides: FlatAssumption[] = [...normAssumptions, ...homoAssumptions]
): TemplateInput {
  const assumptions = assumptionOverrides
  return {
    r: makeResult(rOverrides),
    assumptions,
    grouped: groupAssumptions(assumptions),
    ctx,
    lang: 'ko',
    methodId,
    options: opts,
  }
}

// ─── 1. fmtP() 경계값 ────────────────────────────────────────────────────────

describe('fmtP()', () => {
  it('p < .001 → "< .001"', () => {
    expect(fmtP(0.0001)).toBe('< .001')
    expect(fmtP(0.00099)).toBe('< .001')
    expect(fmtP(0)).toBe('< .001')
  })

  it('p = .001 → "= .001" (경계 포함)', () => {
    expect(fmtP(0.001)).toBe('= .001')
  })

  it('p = .021 → "= .021"', () => {
    expect(fmtP(0.021)).toBe('= .021')
  })

  it('p = .05 → "= .050"', () => {
    expect(fmtP(0.05)).toBe('= .050')
  })

  it('p = 1.0 → "= 1.000"', () => {
    expect(fmtP(1.0)).toBe('= 1.000')
  })

  it('p = .123 → 앞의 0 제거', () => {
    expect(fmtP(0.123)).toBe('= .123')
  })
})

// ─── 2. fmt() ─────────────────────────────────────────────────────────────────

describe('fmt()', () => {
  it('소수점 2자리 포맷', () => {
    expect(fmt(1.2345)).toBe('1.23')
    expect(fmt(0)).toBe('0.00')
  })
  it('undefined/null → "—"', () => {
    expect(fmt(undefined)).toBe('—')
    expect(fmt(null)).toBe('—')
  })
})

// ─── 3. T-TEST golden snapshot ────────────────────────────────────────────────

describe('t-test 템플릿', () => {
  const input = makeInput('t-test')
  const tmpl = getTemplate('t-test', 't-test')

  it('Methods — 정규성/등분산/alpha 포함', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('독립표본 t-검정')
    expect(text).toContain('Shapiro-Wilk')
    expect(text).toContain('Levene')
    expect(text).toContain('α = 0.05')
    expect(text).toContain('BioHub')
  })

  it('Results — 수치/이탤릭/방향 포함', () => {
    const text = tmpl.results(input)
    expect(text).toContain('*t*(28) = 2.45')
    expect(text).toContain('*p* = .021')
    expect(text).toContain('Cohen\'s *d* = 0.89')
    expect(text).toContain('95% 신뢰구간은 [0.34, 4.06]')
    expect(text).toContain('수컷')
    expect(text).toContain('암컷')
  })

  it('Captions — table + figure', () => {
    const caps = tmpl.captions({
      ...input,
      r: makeResult({ visualizationData: { type: 'boxplot', data: {} } }),
    })
    expect(caps.find(c => c.kind === 'table')).toBeTruthy()
    expect(caps.find(c => c.kind === 'figure')).toBeTruthy()
    expect(caps.find(c => c.kind === 'figure')?.text).toContain('사분위 범위')
  })
})

// ─── 4. paired-t METHOD_OVERRIDE ─────────────────────────────────────────────

describe('paired-t 템플릿 (METHOD_OVERRIDE)', () => {
  const input = makeInput('paired-t', {}, normAssumptions)
  const tmpl = getTemplate('paired-t', 't-test')

  it('Methods — 대응표본 문구 포함', () => {
    expect(tmpl.methods(input)).toContain('대응표본 t-검정')
  })

  it('Results — 처치 전후 문구', () => {
    const text = tmpl.results(input)
    expect(text).toContain('처치 전후')
    expect(text).toContain('*t*(28)')
  })
})

// ─── 5. ANOVA golden snapshot ─────────────────────────────────────────────────

describe('anova 템플릿', () => {
  const anovaResult = makeResult({
    method: 'anova',
    statistic: 4.87,
    pValue: 0.012,
    df: [2, 42],
    effectSize: { value: 0.19, type: "eta-squared", interpretation: '중간 효과' },
    groupStats: [
      { name: 'M', mean: 13.1, std: 2.8, n: 15 },
      { name: 'F', mean: 15.3, std: 2.1, n: 15 },
    ],
    postHocMethod: 'Tukey',
    postHoc: [
      { group1: 'M', group2: 'F', pvalue: 0.008, significant: true },
    ],
  })
  const input = makeInput('anova', anovaResult, [...normAssumptions, ...homoAssumptions])

  it('Methods — Tukey 사후검정 언급', () => {
    const text = getTemplate('anova', 'anova').methods(input)
    expect(text).toContain('일원분산분석')
    expect(text).toContain('Tukey')
  })

  it('Results — F통계량, η², 사후검정', () => {
    const text = getTemplate('anova', 'anova').results(input)
    expect(text).toContain('*F*(2, 42) = 4.87')
    expect(text).toContain('*p* = .012')
    expect(text).toContain('수컷–암컷')
  })
})

// ─── 6. NONPARAMETRIC golden snapshot ────────────────────────────────────────

describe('nonparametric 템플릿', () => {
  const input = makeInput('mann-whitney', {
    method: 'Mann-Whitney U',
    statistic: 67.5,
    pValue: 0.043,
    df: undefined,
  }, normAssumptions.map(a => ({ ...a, passed: false })))
  const tmpl = getTemplate('mann-whitney', 'nonparametric')

  it('Methods — 비모수 선택 사유 포함', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('비모수 검정')
    expect(text).toContain('정규분포 가정을 충족하지 않아')
  })

  it('Results — *U* 통계량, Mdn 언급', () => {
    const text = tmpl.results(input)
    expect(text).toContain('*U*')
    expect(text).toContain('*p* = .043')
  })
})

// ─── 7. CORRELATION golden snapshot ──────────────────────────────────────────

describe('correlation 템플릿', () => {
  const input = makeInput('pearson-correlation', {
    method: 'Pearson',
    statistic: 0.72,
    pValue: 0.001,
    effectSize: 0.72,
  }, normAssumptions)
  const tmpl = getTemplate('pearson-correlation', 'correlation')

  it('Results — r값, 방향, 강도', () => {
    const text = tmpl.results(input)
    expect(text).toContain('*r* = 0.72')
    expect(text).toContain('정적')
    expect(text).toContain('강한')
  })

  it('Captions — 상관계수 행렬', () => {
    const caps = tmpl.captions(input)
    expect(caps[0]?.text).toContain('상관계수')
  })
})

// ─── 8. REGRESSION golden snapshot ───────────────────────────────────────────

describe('regression 템플릿', () => {
  const input = makeInput('simple-regression', {
    method: 'simple regression',
    statistic: 12.3,
    pValue: 0.002,
    df: [1, 28],
    additional: {
      rSquared: 0.31,
      adjustedRSquared: 0.28,
    },
    coefficients: [
      { name: '체중', value: 0.42, stdError: 0.1, tValue: 4.2, pvalue: 0.001 },
    ],
  }, [])
  const tmpl = getTemplate('simple-regression', 'regression')

  it('Methods — 가정 목록 포함', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('선형성')
    expect(text).toContain('잔차')
  })

  it('Results — R², 계수, 유의성', () => {
    const text = tmpl.results(input)
    expect(text).toContain('*R*² = 0.31')
    expect(text).toContain('수정 *R*² = 0.28')
    expect(text).toContain('체중')
    expect(text).toContain('β = 0.42')
  })
})

// ─── 9. CHI-SQUARE golden snapshot ───────────────────────────────────────────

describe('chi-square 템플릿', () => {
  const input = makeInput('chi-square-independence', {
    method: 'chi-square',
    statistic: 8.54,
    pValue: 0.014,
    df: 2,
    effectSize: 0.38,
  }, [])
  const tmpl = getTemplate('chi-square-independence', 'chi-square')

  it('Methods — 기대빈도 확인 문구', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('기대빈도')
  })

  it('Results — χ² 표기', () => {
    const text = tmpl.results(input)
    expect(text).toContain('χ²(2) = 8.54')
    expect(text).toContain("Cramér's *V* = 0.38")
  })
})

// ─── 10. DESCRIPTIVE golden snapshot ─────────────────────────────────────────

describe('descriptive 템플릿', () => {
  const input = makeInput('descriptive', {
    method: 'descriptive',
    statistic: 0.97,
    pValue: 0.823,
    additional: {
      mean: 14.2,
      std: 2.5,
      median: 14.0,
      iqr: 3.2,
      skewness: 0.12,
      kurtosis: -0.3,
    },
  }, [])
  const tmpl = getTemplate('descriptive', 'descriptive')

  it('Results — M, SD, Mdn, IQR', () => {
    const text = tmpl.results(input)
    expect(text).toContain('*M*) = 14.20')
    expect(text).toContain('*SD*) = 2.50')
    expect(text).toContain('*Mdn*) = 14.00')
    expect(text).toContain('IQR) = 3.20')
  })

  it('Methods — 기술통계 문구', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('기술통계')
  })
})

// ─── 11. TIMESERIES golden snapshot ──────────────────────────────────────────

describe('timeseries 템플릿', () => {
  const input = makeInput('arima', {
    method: 'ARIMA',
    statistic: -4.32,
    pValue: 0.001,
    additional: {
      aic: 123.4,
      bic: 131.2,
      model: 'ARIMA(1,1,1)',
    },
  }, [
    { category: 'stationarity', testName: 'ADF', statistic: -4.32, pValue: 0.001, passed: true },
  ])
  const tmpl = getTemplate('arima', 'timeseries')

  it('Methods — ADF 정상성 검정', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('ADF 검정')
  })

  it('Results — AIC/BIC, 모형명', () => {
    const text = tmpl.results(input)
    expect(text).toContain('ARIMA(1,1,1)')
    expect(text).toContain('AIC = 123.40')
    expect(text).toContain('BIC = 131.20')
  })
})

// ─── 12. SURVIVAL golden snapshot ────────────────────────────────────────────

describe('survival 템플릿', () => {
  const input = makeInput('kaplan-meier', {
    method: 'Kaplan-Meier',
    statistic: 5.43,
    pValue: 0.02,
    effectSize: 1.85,
    confidence: { lower: 1.12, upper: 3.06, level: 0.95 },
  }, [
    { category: 'proportionalHazards', testName: 'Schoenfeld Residuals', statistic: 2.1, pValue: 0.34, passed: true },
  ])
  const tmpl = getTemplate('kaplan-meier', 'survival')

  it('Methods — Schoenfeld 잔차 언급', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('Schoenfeld')
  })

  it('Results — HR, CI', () => {
    const text = tmpl.results(input)
    expect(text).toContain('HR = 1.85')
    expect(text).toContain('[1.12, 3.06]')
  })

  it('Captions — HR/CI 설명', () => {
    const caps = tmpl.captions(input)
    expect(caps[0]?.text).toContain('HR')
  })
})

// ─── 13. MULTIVARIATE golden snapshot ────────────────────────────────────────

describe('multivariate 템플릿', () => {
  const input = makeInput('pca', {
    method: 'PCA',
    statistic: 0,
    pValue: 1,
    additional: {
      explainedVarianceRatio: [0.45, 0.22, 0.13],
    },
  }, [])
  const tmpl = getTemplate('pca', 'multivariate')

  it('Results — 분산 설명률', () => {
    const text = tmpl.results(input)
    expect(text).toContain('80.00%')  // 0.45+0.22+0.13 = 0.80
  })
})

// ─── 14. PSYCHOMETRICS (reliability) METHOD_OVERRIDE ─────────────────────────

describe('reliability 템플릿 (METHOD_OVERRIDE)', () => {
  const input = makeInput('reliability', {
    method: 'reliability',
    statistic: 0.87,  // Cronbach alpha
    pValue: 1,
    additional: {
      n: 10,
      itemTotalCorrelations: [0.62, 0.71, 0.58, 0.74, 0.65],
    },
  }, [])
  const tmpl = getTemplate('reliability', 'psychometrics')

  it('Methods — Cronbach α 언급', () => {
    const text = tmpl.methods(input)
    expect(text).toContain('Cronbach α')
    expect(text).toContain('문항 수는 10개')
  })

  it('Results — α값, 해석, 문항-전체 상관', () => {
    const text = tmpl.results(input)
    expect(text).toContain('α = 0.87')
    expect(text).toContain('양호')
    expect(text).toContain('문항-전체 상관계수')
  })
})

// ─── 15. DESIGN (power-analysis) METHOD_OVERRIDE ─────────────────────────────

describe('power-analysis 템플릿 (METHOD_OVERRIDE)', () => {
  const input = makeInput('power-analysis', {
    method: 'power-analysis',
    statistic: 0.5,
    pValue: 1,
    effectSize: 0.5,
    additional: {
      analysisType: 'a-priori',
      requiredSampleSize: 52,
      power: 0.8,
      alpha: 0.05,
    },
  }, [])
  const tmpl = getTemplate('power-analysis', 'design')

  it('Methods — 사전 검정력 분석', () => {
    expect(tmpl.methods(input)).toContain('사전 검정력 분석')
  })

  it('Results — 필요 표본 수, 검정력, α', () => {
    const text = tmpl.results(input)
    expect(text).toContain('*n* = 52')
    expect(text).toContain('0.80')
    expect(text).toContain('α = 0.05')
  })
})

// ─── 16. 불완전 데이터 — null guard 검증 ──────────────────────────────────────

describe('불완전 데이터 처리 (null guard)', () => {
  it('effectSize=null — 에러 없이 생략', () => {
    const input = makeInput('t-test', { effectSize: undefined })
    const tmpl = getTemplate('t-test', 't-test')
    const text = tmpl.results(input)
    expect(text).not.toContain("Cohen's")
    expect(text).toContain('*t*(28)')
  })

  it('groupStats=[] — 에러 없이 집단 문구 생략', () => {
    const input = makeInput('t-test', { groupStats: [] })
    const tmpl = getTemplate('t-test', 't-test')
    const text = tmpl.results(input)
    expect(text).toContain('*t*')
    expect(text).not.toContain('*M* = ')
  })

  it('assumptions=undefined — Methods 에러 없음', () => {
    const input: TemplateInput = {
      r: makeResult(),
      assumptions: [],  // flattenAssumptions(undefined) → []
      grouped: {},
      ctx,
      lang: 'ko',
      methodId: 't-test',
      options: opts,
    }
    const tmpl = getTemplate('t-test', 't-test')
    expect(() => tmpl.methods(input)).not.toThrow()
    expect(tmpl.methods(input)).toContain('독립표본 t-검정')
  })

  it('confidence=undefined — CI 문장 생략', () => {
    const input = makeInput('t-test', { confidence: undefined })
    const tmpl = getTemplate('t-test', 't-test')
    const text = tmpl.results(input)
    expect(text).not.toContain('신뢰구간')
  })

  it('visualizationData=undefined — Figure 캡션 생략', () => {
    const input = makeInput('t-test', { visualizationData: undefined })
    const caps = getTemplate('t-test', 't-test').captions(input)
    expect(caps.every(c => c.kind !== 'figure')).toBe(true)
  })

  it('generic fallback — 미등록 methodId 에러 없음', () => {
    const input = makeInput('unknown-method-xyz', {}, [])
    const tmpl = getTemplate('unknown-method-xyz', 'unknown-category')
    expect(() => tmpl.results(input)).not.toThrow()
    expect(tmpl.results(input)).toContain('통계적으로')
  })
})

// ─── 17. 영문 템플릿 ─────────────────────────────────────────────────────────────

describe('영문 템플릿', () => {
  it('모든 카테고리에서 en → 실제 영문 텍스트 반환', () => {
    const categories = [
      't-test', 'anova', 'nonparametric', 'correlation', 'regression', 'chi-square',
      'descriptive', 'timeseries', 'survival', 'multivariate', 'psychometrics', 'design',
    ]
    for (const cat of categories) {
      const input: TemplateInput = { ...makeInput(cat), lang: 'en' }
      const tmpl = getTemplate(cat, cat)
      const methods = tmpl.methods(input)
      const results = tmpl.results(input)
      expect(methods).not.toContain('coming soon')
      expect(results).not.toContain('coming soon')
      expect(methods.length).toBeGreaterThan(20)
      expect(results.length).toBeGreaterThan(20)
    }
  })

  it('영문 methods에 APA 통계 기호가 포함된다', () => {
    const input: TemplateInput = { ...makeInput('t-test'), lang: 'en' }
    const tmpl = getTemplate('t-test', 't-test')
    const methods = tmpl.methods(input)
    expect(methods).toContain('α =')
    expect(methods).toContain('BioHub')
  })

  it('영문 results에 통계량과 p값이 포함된다', () => {
    const input: TemplateInput = { ...makeInput('t-test'), lang: 'en' }
    const tmpl = getTemplate('t-test', 't-test')
    const results = tmpl.results(input)
    expect(results).toContain('*t*')
    expect(results).toContain('*p*')
  })

  it('영문 descriptive — mean/SD/skewness 포함', () => {
    const input: TemplateInput = {
      ...makeInput('descriptive', {
        method: 'descriptive', statistic: 0.97, pValue: 0.823,
        additional: { mean: 14.2, std: 2.5, median: 14.0, iqr: 3.2, skewness: 0.12, kurtosis: -0.3 },
      }, []),
      lang: 'en',
    }
    const tmpl = getTemplate('descriptive', 'descriptive')
    const results = tmpl.results(input)
    expect(results).toContain('Descriptive statistics')
    expect(results).toContain('*M*) = 14.20')
    expect(results).toContain('*SD*) = 2.50')
    expect(results).toContain('approximately normally distributed')
  })

  it('영문 correlation — 방향/강도 포함', () => {
    const input: TemplateInput = { ...makeInput('correlation'), lang: 'en' }
    const tmpl = getTemplate('correlation', 'correlation')
    const results = tmpl.results(input)
    expect(results).toMatch(/positive|negative/)
    expect(results).toMatch(/strong|moderate|weak/)
  })

  it('영문 timeseries — ADF/AIC/BIC 포함', () => {
    const input: TemplateInput = {
      ...makeInput('arima', {
        method: 'ARIMA', statistic: -4.32, pValue: 0.001,
        additional: { aic: 123.4, bic: 131.2, model: 'ARIMA(1,1,1)' },
      }, [
        { category: 'stationarity', testName: 'ADF', statistic: -4.32, pValue: 0.001, passed: true },
      ]),
      lang: 'en',
    }
    const tmpl = getTemplate('arima', 'timeseries')
    expect(tmpl.methods(input)).toContain('Augmented Dickey-Fuller')
    const results = tmpl.results(input)
    expect(results).toContain('ARIMA(1,1,1)')
    expect(results).toContain('AIC = 123.40')
  })

  it('영문 survival — HR/CI 포함', () => {
    const input: TemplateInput = {
      ...makeInput('kaplan-meier', {
        method: 'Kaplan-Meier', statistic: 5.43, pValue: 0.02,
        effectSize: 1.85, confidence: { lower: 1.12, upper: 3.06, level: 0.95 },
      }, []),
      lang: 'en',
    }
    const tmpl = getTemplate('kaplan-meier', 'survival')
    expect(tmpl.results(input)).toContain('HR = 1.85')
    expect(tmpl.results(input)).toContain('[1.12, 3.06]')
  })

  it('영문 multivariate — explained variance 포함', () => {
    const input: TemplateInput = {
      ...makeInput('pca', {
        method: 'PCA', statistic: 0, pValue: 1,
        additional: { explainedVarianceRatio: [0.45, 0.22, 0.13] },
      }, []),
      lang: 'en',
    }
    const tmpl = getTemplate('pca', 'multivariate')
    expect(tmpl.results(input)).toContain('80.00%')
  })

  it('영문 reliability — Cronbach α/해석 포함', () => {
    const input: TemplateInput = {
      ...makeInput('reliability', {
        method: 'reliability', statistic: 0.87, pValue: 1,
        additional: { n: 10, itemTotalCorrelations: [0.62, 0.71, 0.58] },
      }, []),
      lang: 'en',
    }
    const tmpl = getTemplate('reliability', 'psychometrics')
    expect(tmpl.methods(input)).toContain("Cronbach's α")
    expect(tmpl.methods(input)).toContain('10 items')
    const results = tmpl.results(input)
    expect(results).toContain('α = 0.87')
    expect(results).toContain('good')
  })

  it('영문 power-analysis — sample size/power 포함', () => {
    const input: TemplateInput = {
      ...makeInput('power-analysis', {
        method: 'power-analysis', statistic: 0.5, pValue: 1, effectSize: 0.5,
        additional: { analysisType: 'a-priori', requiredSampleSize: 52, power: 0.8, alpha: 0.05 },
      }, []),
      lang: 'en',
    }
    const tmpl = getTemplate('power-analysis', 'design')
    expect(tmpl.methods(input)).toContain('a priori power analysis')
    expect(tmpl.results(input)).toContain('*n* = 52')
  })

  it('영문 t-test methods — "Prior to analysis," 뒤 소문자', () => {
    const input: TemplateInput = { ...makeInput('t-test'), lang: 'en' }
    const tmpl = getTemplate('t-test', 't-test')
    const methods = tmpl.methods(input)
    expect(methods).toContain('Prior to analysis, normality')
    expect(methods).not.toContain('Prior to analysis, Normality')
  })

  it('영문 anova methods — "Prior to analysis," 뒤 소문자', () => {
    const input: TemplateInput = { ...makeInput('anova'), lang: 'en' }
    const tmpl = getTemplate('anova', 'anova')
    const methods = tmpl.methods(input)
    expect(methods).toContain('Prior to analysis, normality')
    expect(methods).not.toContain('Prior to analysis, Normality')
  })

  it('영문 anova methods — "A One-Way ANOVA" (An 아님)', () => {
    const input: TemplateInput = { ...makeInput('anova'), lang: 'en' }
    const tmpl = getTemplate('anova', 'anova')
    const methods = tmpl.methods(input)
    expect(methods).toContain('A One-Way ANOVA was conducted')
    expect(methods).not.toContain('An One-Way')
  })

  it('boxplot 캡션 한글 — "집단별" 사용 ("성별" 아님)', () => {
    const input: TemplateInput = {
      ...makeInput('t-test', { visualizationData: { type: 'boxplot', data: {} } }),
      lang: 'ko',
    }
    const tmpl = getTemplate('t-test', 't-test')
    const caps = tmpl.captions(input)
    const fig = caps.find(c => c.kind === 'figure')
    expect(fig?.text).toContain('집단별')
    expect(fig?.text).not.toContain('성별')
  })
})
