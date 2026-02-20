/**
 * AI 결과 해석 프롬프트 빌더 테스트
 *
 * buildInterpretationPrompt()가 다양한 분석 메서드에서
 * 올바른 프롬프트를 생성하는지 검증합니다.
 */

import { buildInterpretationPrompt, InterpretationContext } from '@/lib/services/result-interpreter'
import type { AnalysisResult } from '@/types/smart-flow'

// ============================================
// 헬퍼: 최소 AnalysisResult 생성
// ============================================
function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 'test-method',
    statistic: 1.234,
    pValue: 0.05,
    interpretation: 'test interpretation',
    ...overrides,
  }
}

function makeContext(result: AnalysisResult, extra: Partial<InterpretationContext> = {}): InterpretationContext {
  return { results: result, ...extra }
}

// ============================================
// 기본 프롬프트 구조
// ============================================
describe('buildInterpretationPrompt: 기본 구조', () => {
  it('method, statistic, pValue가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult()))
    expect(prompt).toContain('test-method')
    expect(prompt).toContain('1.2340')
    expect(prompt).toContain('0.050000')
  })

  it('df가 있으면 자유도가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ df: 29 })))
    expect(prompt).toContain('자유도(df): 29')
  })

  it('df가 undefined이면 자유도가 포함되지 않는다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult()))
    expect(prompt).not.toContain('자유도')
  })

  it('유의한 경우 유의함 문구가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ pValue: 0.001 })))
    expect(prompt).toContain('통계적으로 유의함')
  })

  it('유의하지 않은 경우 유의하지 않음 문구가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ pValue: 0.12 })))
    expect(prompt).toContain('통계적으로 유의하지 않음')
  })

  it('메타데이터(표본, 변수, 파일명)가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult(), {
      sampleSize: 100,
      variables: ['height', 'weight'],
      uploadedFileName: 'data.csv',
    }))
    expect(prompt).toContain('표본 크기: 100')
    expect(prompt).toContain('height, weight')
    expect(prompt).toContain('data.csv')
  })

  it('해석 요청 문구가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult()))
    expect(prompt).toContain('통계 분석 결과를 해석해주세요')
  })
})

// ============================================
// 효과크기
// ============================================
describe('buildInterpretationPrompt: 효과크기', () => {
  it('숫자형 효과크기가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ effectSize: 0.75 })))
    expect(prompt).toContain('효과크기')
    expect(prompt).toContain('0.7500')
  })

  it('EffectSizeInfo 형태 효과크기가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      effectSize: { type: "Cohen's d", value: 0.85, interpretation: '큰 효과' },
    })))
    expect(prompt).toContain("Cohen's d")
    expect(prompt).toContain('0.8500')
    expect(prompt).toContain('큰 효과')
  })

  it('효과크기 없으면 섹션이 없다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult()))
    expect(prompt).not.toContain('효과크기')
  })
})

// ============================================
// 신뢰구간
// ============================================
describe('buildInterpretationPrompt: 신뢰구간', () => {
  it('신뢰구간이 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      confidence: { lower: 0.1234, upper: 0.5678, level: 0.95 },
    })))
    expect(prompt).toContain('신뢰구간 (95%)')
    expect(prompt).toContain('하한: 0.1234')
    expect(prompt).toContain('상한: 0.5678')
  })

  it('level 미지정 시 95%로 표시된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      confidence: { lower: 0.1, upper: 0.9 },
    })))
    expect(prompt).toContain('신뢰구간 (95%)')
  })
})

// ============================================
// 그룹 통계
// ============================================
describe('buildInterpretationPrompt: 그룹 통계', () => {
  it('그룹별 기술통계가 테이블로 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      groupStats: [
        { name: '실험군', n: 30, mean: 75.5, std: 10.2 },
        { name: '대조군', n: 28, mean: 68.3, std: 9.8 },
      ],
    })))
    expect(prompt).toContain('그룹별 기술통계')
    expect(prompt).toContain('실험군')
    expect(prompt).toContain('대조군')
    expect(prompt).toContain('30')
    expect(prompt).toContain('75.500')
  })

  it('groupStats가 빈 배열이면 섹션이 없다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ groupStats: [] })))
    expect(prompt).not.toContain('그룹별 기술통계')
  })
})

// ============================================
// 사후검정
// ============================================
describe('buildInterpretationPrompt: 사후검정', () => {
  it('사후검정 결과가 테이블로 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      postHoc: [
        { group1: 'A', group2: 'B', meanDiff: 5.2, pvalue: 0.003, significant: true },
        { group1: 'A', group2: 'C', meanDiff: 2.1, pvalue: 0.15, significant: false },
      ],
    })))
    expect(prompt).toContain('사후검정 결과')
    expect(prompt).toContain('A vs B')
    expect(prompt).toContain('5.200')
    expect(prompt).toContain('Yes')
    expect(prompt).toContain('No')
  })

  it('meanDiff가 undefined이면 -로 표시된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      postHoc: [
        { group1: 'A', group2: 'B', pvalue: 0.01, significant: true },
      ],
    })))
    expect(prompt).toContain('A vs B')
    // meanDiff undefined → '-'
    expect(prompt).toMatch(/A vs B \| - \|/)
  })
})

// ============================================
// 회귀계수
// ============================================
describe('buildInterpretationPrompt: 회귀계수', () => {
  it('회귀계수 테이블이 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      coefficients: [
        { name: '(절편)', value: 3.14, stdError: 0.52, tValue: 6.04, pvalue: 0.0001 },
        { name: 'X1', value: 1.28, stdError: 0.31, tValue: 4.13, pvalue: 0.0005 },
      ],
    })))
    expect(prompt).toContain('회귀 계수')
    expect(prompt).toContain('(절편)')
    expect(prompt).toContain('X1')
    expect(prompt).toContain('3.1400')
  })
})

// ============================================
// 가정 검정
// ============================================
describe('buildInterpretationPrompt: 가정 검정', () => {
  it('정규성 검정 결과가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      assumptions: {
        normality: {
          shapiroWilk: { pValue: 0.234, isNormal: true },
        },
      },
    })))
    expect(prompt).toContain('가정 검정')
    expect(prompt).toContain('정규성')
    expect(prompt).toContain('충족')
  })

  it('등분산성 검정 결과가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      assumptions: {
        homogeneity: {
          levene: { pValue: 0.012, equalVariance: false },
        },
      },
    })))
    expect(prompt).toContain('등분산성')
    expect(prompt).toContain('미충족')
  })

  it('가정 검정 없으면 섹션이 없다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult()))
    expect(prompt).not.toContain('가정 검정')
  })
})

// ============================================
// 추가 메트릭 (additional)
// ============================================
describe('buildInterpretationPrompt: 추가 메트릭', () => {
  it('R², Adjusted R², RMSE가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      additional: {
        rSquared: 0.85,
        adjustedRSquared: 0.82,
        rmse: 2.34,
      },
    })))
    expect(prompt).toContain('R²: 0.8500')
    expect(prompt).toContain('Adjusted R²: 0.8200')
    expect(prompt).toContain('RMSE: 2.3400')
  })

  it('AIC, BIC가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      additional: { aic: 123.45, bic: 130.67 },
    })))
    expect(prompt).toContain('AIC: 123.45')
    expect(prompt).toContain('BIC: 130.67')
  })

  it('분류 메트릭이 포함된다 (accuracy, precision, recall, f1, ROC AUC)', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      additional: {
        accuracy: 0.92,
        precision: 0.88,
        recall: 0.95,
        f1Score: 0.914,
        rocAuc: 0.97,
      },
    })))
    expect(prompt).toContain('정확도: 92.0%')
    expect(prompt).toContain('정밀도: 88.0%')
    expect(prompt).toContain('재현율: 95.0%')
    expect(prompt).toContain('F1 Score: 0.9140')
    expect(prompt).toContain('ROC AUC: 0.9700')
  })

  it('Cronbach alpha, power, silhouette가 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      additional: {
        alpha: 0.89,
        power: 0.80,
        silhouetteScore: 0.65,
      },
    })))
    expect(prompt).toContain("Cronbach's α: 0.8900")
    expect(prompt).toContain('검정력: 0.8000')
    expect(prompt).toContain('Silhouette Score: 0.6500')
  })

  it('additional이 빈 객체이면 추가 메트릭 섹션이 없다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ additional: {} })))
    expect(prompt).not.toContain('추가 메트릭')
  })
})

// ============================================
// 분석 메서드별 시나리오 (통합 테스트)
// ============================================
describe('buildInterpretationPrompt: 분석 메서드별 시나리오', () => {
  it('독립표본 t-검정: 기본 필드 + 효과크기 + 그룹통계', () => {
    const result = makeResult({
      method: 't-test',
      statistic: 2.45,
      pValue: 0.018,
      df: 58,
      effectSize: { type: "Cohen's d", value: 0.64, interpretation: '중간 효과' },
      groupStats: [
        { name: '실험군', n: 30, mean: 82.3, std: 11.2 },
        { name: '대조군', n: 30, mean: 75.1, std: 10.8 },
      ],
      confidence: { lower: 1.28, upper: 13.12, level: 0.95 },
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('t-test')
    expect(prompt).toContain('2.4500')
    expect(prompt).toContain('자유도(df): 58')
    expect(prompt).toContain('통계적으로 유의함')
    expect(prompt).toContain("Cohen's d")
    expect(prompt).toContain('실험군')
    expect(prompt).toContain('대조군')
    expect(prompt).toContain('신뢰구간')
  })

  it('일원 ANOVA: 기본 + 사후검정 + 효과크기', () => {
    const result = makeResult({
      method: 'anova',
      statistic: 5.67,
      pValue: 0.004,
      df: 2,
      effectSize: { type: 'eta-squared', value: 0.12, interpretation: '중간' },
      postHoc: [
        { group1: 'A', group2: 'B', meanDiff: 4.5, pvalue: 0.001, significant: true },
        { group1: 'A', group2: 'C', meanDiff: 2.3, pvalue: 0.1, significant: false },
        { group1: 'B', group2: 'C', meanDiff: -2.2, pvalue: 0.12, significant: false },
      ],
      groupStats: [
        { name: 'A', n: 20, mean: 80, std: 10 },
        { name: 'B', n: 20, mean: 75.5, std: 9.5 },
        { name: 'C', n: 20, mean: 77.7, std: 11 },
      ],
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('anova')
    expect(prompt).toContain('자유도(df): 2')
    expect(prompt).toContain('eta-squared')
    expect(prompt).toContain('사후검정 결과')
    expect(prompt).toContain('A vs B')
    expect(prompt).toContain('그룹별 기술통계')
  })

  it('다중회귀: 회귀계수 + R² + AIC', () => {
    const result = makeResult({
      method: 'multiple-regression',
      statistic: 15.34,
      pValue: 0.0001,
      df: 3,
      effectSize: { type: 'R-squared', value: 0.72, interpretation: '강함' },
      coefficients: [
        { name: '(절편)', value: 2.5, stdError: 0.8, tValue: 3.12, pvalue: 0.003 },
        { name: 'X1', value: 0.45, stdError: 0.12, tValue: 3.75, pvalue: 0.001 },
        { name: 'X2', value: -0.22, stdError: 0.09, tValue: -2.44, pvalue: 0.018 },
      ],
      additional: {
        rSquared: 0.72,
        adjustedRSquared: 0.69,
        rmse: 3.45,
        aic: 245.6,
      },
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('multiple-regression')
    expect(prompt).toContain('회귀 계수')
    expect(prompt).toContain('X1')
    expect(prompt).toContain('X2')
    expect(prompt).toContain('R²: 0.7200')
    expect(prompt).toContain('Adjusted R²: 0.6900')
    expect(prompt).toContain('RMSE: 3.4500')
    expect(prompt).toContain('AIC: 245.60')
  })

  it('카이제곱: 기본 + Cramer V', () => {
    const result = makeResult({
      method: 'chi-square',
      statistic: 12.45,
      pValue: 0.002,
      df: 2,
      effectSize: { type: "Cramer's V", value: 0.35, interpretation: '중간' },
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('chi-square')
    expect(prompt).toContain("Cramer's V")
    expect(prompt).toContain('0.3500')
  })

  it('Mann-Whitney U (비모수): 기본 필드만', () => {
    const result = makeResult({
      method: 'mann-whitney',
      statistic: 245,
      pValue: 0.034,
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('mann-whitney')
    expect(prompt).toContain('245.0000')
    expect(prompt).toContain('통계적으로 유의함')
    // 비모수검정은 추가 메트릭이 없을 수 있음
    expect(prompt).not.toContain('추가 메트릭')
  })

  it('PCA: explained variance', () => {
    const result = makeResult({
      method: 'pca',
      statistic: 0.45,
      pValue: 1,
      effectSize: { type: 'Explained Variance', value: 0.85, interpretation: '총 85.0% 분산 설명' },
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('pca')
    expect(prompt).toContain('Explained Variance')
    expect(prompt).toContain('0.8500')
  })

  it('Cronbach alpha (신뢰도)', () => {
    const result = makeResult({
      method: 'cronbach-alpha',
      statistic: 0.89,
      pValue: 1,
      additional: { alpha: 0.89 },
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('cronbach-alpha')
    expect(prompt).toContain("Cronbach's α: 0.8900")
  })

  it('생존분석 (Cox): concordance', () => {
    const result = makeResult({
      method: 'cox-regression',
      statistic: 0.78,
      pValue: 0.003,
      additional: { rSquared: undefined },
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('cox-regression')
    expect(prompt).toContain('0.7800')
    expect(prompt).toContain('통계적으로 유의함')
  })

  it('검정력 분석: power', () => {
    const result = makeResult({
      method: 'power-analysis',
      statistic: 64,
      pValue: 0.05,
      additional: { power: 0.8 },
    })
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toContain('power-analysis')
    expect(prompt).toContain('검정력: 0.8000')
  })
})

// ============================================
// 엣지 케이스
// ============================================
describe('buildInterpretationPrompt: 엣지 케이스', () => {
  it('모든 선택적 필드가 없어도 크래시 없이 프롬프트가 생성된다', () => {
    const result = makeResult()
    const prompt = buildInterpretationPrompt(makeContext(result))

    expect(prompt).toBeTruthy()
    expect(prompt).toContain('test-method')
    // 선택적 섹션들이 없어야 함
    expect(prompt).not.toContain('효과크기')
    expect(prompt).not.toContain('신뢰구간')
    expect(prompt).not.toContain('그룹별 기술통계')
    expect(prompt).not.toContain('사후검정')
    expect(prompt).not.toContain('회귀 계수')
    expect(prompt).not.toContain('가정 검정')
    expect(prompt).not.toContain('추가 메트릭')
  })

  it('p-value가 매우 작은 값이어도 정상 처리된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ pValue: 1e-15 })))
    expect(prompt).toContain('통계적으로 유의함')
  })

  it('p-value가 1이어도 정상 처리된다 (기술통계/PCA)', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({ pValue: 1 })))
    expect(prompt).toContain('통계적으로 유의하지 않음')
  })

  it('assumptions에 shapiroWilk와 levene이 둘 다 있으면 모두 포함된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      assumptions: {
        normality: { shapiroWilk: { pValue: 0.35, isNormal: true } },
        homogeneity: { levene: { pValue: 0.08, equalVariance: true } },
      },
    })))
    expect(prompt).toContain('정규성')
    expect(prompt).toContain('등분산성')
  })

  it('assumptions에 pValue가 undefined이어도 N/A로 표시된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      assumptions: {
        normality: { shapiroWilk: { pValue: undefined as unknown as number, isNormal: true } },
      },
    })))
    expect(prompt).toContain('N/A')
  })

  it('groupStats name이 undefined이면 -로 표시된다', () => {
    const prompt = buildInterpretationPrompt(makeContext(makeResult({
      groupStats: [
        { name: undefined as unknown as string, n: 10, mean: 5, std: 1 },
      ],
    })))
    expect(prompt).toContain('| - |')
  })
})
