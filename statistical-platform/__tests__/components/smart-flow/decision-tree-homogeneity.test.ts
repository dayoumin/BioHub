/**
 * DecisionTree - homogeneity 답변 반영 테스트
 *
 * 이 테스트는 decideCompare 함수가 등분산성(homogeneity) 답변을
 * 올바르게 반영하는지 검증합니다.
 */
import { decide } from '@/components/smart-flow/steps/purpose/DecisionTree'

describe('DecisionTree - homogeneity 답변 반영', () => {
  // ============================================
  // 1. 2그룹 독립표본 테스트
  // ============================================
  describe('2그룹 독립표본', () => {
    it('정규 + 등분산=yes → 독립표본 t-검정 (Student)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'yes'
        }
      })

      expect(result.method.id).toBe('independent-t')
      expect(result.method.name).toBe('독립표본 t-검정')

      // reasoning에 등분산성 단계가 포함되어야 함
      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep).toBeDefined()
      expect(homogeneityStep?.description).toContain('등분산 충족')

      // 대안에 welch-t가 있어야 함
      const welchAlt = result.alternatives.find(a => a.method.id === 'welch-t')
      expect(welchAlt).toBeDefined()
    })

    it('정규 + 등분산=no → Welch t-검정', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'no'
        }
      })

      expect(result.method.id).toBe('welch-t')
      expect(result.method.name).toBe('Welch t-검정')

      // reasoning에 등분산 미충족 표시
      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep?.description).toContain('등분산 미충족')

      // 대안에 independent-t가 있어야 함
      const indAlt = result.alternatives.find(a => a.method.id === 'independent-t')
      expect(indAlt).toBeDefined()
    })

    it('정규 + 등분산=check → Welch t-검정 (보수적)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'check'
        }
      })

      expect(result.method.id).toBe('welch-t')

      // reasoning에 "미확인" 또는 "안전" 표시
      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep?.description).toContain('미확인')
    })

    it('정규 + 등분산 미입력 → Welch t-검정 (보수적 기본값)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'yes'
          // homogeneity 생략
        }
      })

      // 등분산 미입력 시 보수적으로 Welch 추천
      expect(result.method.id).toBe('welch-t')
    })

    it('비정규 → Mann-Whitney (등분산 무관)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'no',
          homogeneity: 'yes'  // 이 값은 무시되어야 함
        }
      })

      expect(result.method.id).toBe('mann-whitney')

      // 등분산성 단계가 없어야 함 (비모수는 등분산 가정 없음)
      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep).toBeUndefined()
    })
  })

  // ============================================
  // 2. 3+그룹 독립 테스트
  // ============================================
  describe('3+그룹 독립', () => {
    it('정규 + 등분산=yes → 일원분산분석 (ANOVA)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'yes'
        }
      })

      expect(result.method.id).toBe('one-way-anova')
      expect(result.method.name).toBe('일원분산분석 (ANOVA)')

      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep?.description).toContain('등분산 충족')
    })

    it('정규 + 등분산=no → Welch ANOVA', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'no'
        }
      })

      expect(result.method.id).toBe('welch-anova')
      expect(result.method.name).toBe('Welch ANOVA')

      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep?.description).toContain('등분산 미충족')
    })

    it('정규 + 등분산=check → Welch ANOVA (보수적)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'check'
        }
      })

      expect(result.method.id).toBe('welch-anova')

      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep?.description).toContain('미확인')
    })

    it('비정규 → Kruskal-Wallis (등분산 무관)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          normality: 'no',
          homogeneity: 'yes'  // 이 값은 무시되어야 함
        }
      })

      expect(result.method.id).toBe('kruskal-wallis')

      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep).toBeUndefined()
    })
  })

  // ============================================
  // 3. 대응표본/반복측정 (등분산 무관)
  // ============================================
  describe('대응표본/반복측정 (등분산 무관)', () => {
    it('2그룹 대응 + 정규 → 대응표본 t-검정 (등분산 무관)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'paired',
          normality: 'yes',
          homogeneity: 'no'  // 대응표본에서는 무시됨
        }
      })

      expect(result.method.id).toBe('paired-t')

      // 대응표본에서는 등분산성 단계가 없어야 함
      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep).toBeUndefined()
    })

    it('3+그룹 반복측정 + 정규 → 반복측정 ANOVA (등분산 무관)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'paired',
          normality: 'yes',
          homogeneity: 'no'  // 반복측정에서는 무시됨
        }
      })

      expect(result.method.id).toBe('repeated-anova')

      const homogeneityStep = result.reasoning.find(r => r.step === '등분산성')
      expect(homogeneityStep).toBeUndefined()
    })
  })

  // ============================================
  // 4. reasoning 구조 검증
  // ============================================
  describe('reasoning 구조 검증', () => {
    it('2그룹 독립 + 정규 + 등분산=yes → 4단계 reasoning', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'yes'
        }
      })

      expect(result.reasoning).toHaveLength(4)
      expect(result.reasoning[0].step).toBe('그룹 수')
      expect(result.reasoning[1].step).toBe('표본 유형')
      expect(result.reasoning[2].step).toBe('정규성')
      expect(result.reasoning[3].step).toBe('등분산성')
    })

    it('2그룹 독립 + 비정규 → 3단계 reasoning (등분산 없음)', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'no',
          homogeneity: 'yes'
        }
      })

      expect(result.reasoning).toHaveLength(3)
      expect(result.reasoning.map(r => r.step)).not.toContain('등분산성')
    })

    it('3+그룹 독립 + 정규 + 등분산=no → 4단계 reasoning', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'no'
        }
      })

      expect(result.reasoning).toHaveLength(4)
      expect(result.reasoning[3].step).toBe('등분산성')
      expect(result.reasoning[3].description).toContain('Welch ANOVA')
    })
  })

  // ============================================
  // 5. alternatives 검증
  // ============================================
  describe('alternatives 검증', () => {
    it('등분산=yes → alternatives에 welch가 있음', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'yes'
        }
      })

      const altIds = result.alternatives.map(a => a.method.id)
      expect(altIds).toContain('welch-t')
      expect(altIds).toContain('mann-whitney')
    })

    it('등분산=no → alternatives에 independent/one-way가 있음', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'independent',
          normality: 'yes',
          homogeneity: 'no'
        }
      })

      const altIds = result.alternatives.map(a => a.method.id)
      expect(altIds).toContain('independent-t')
      expect(altIds).toContain('mann-whitney')
    })
  })
})