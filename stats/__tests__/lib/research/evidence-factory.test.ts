import { describe, it, expect } from 'vitest'
import {
  createInterpretationEvidence,
  createMethodRationaleEvidence,
  createRuleDecisionEvidence,
  createAiEditEvidence,
  buildAnalysisEvidence,
} from '@/lib/research/evidence-factory'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'

describe('evidence-factory', () => {
  describe('createInterpretationEvidence', () => {
    it('model과 provider가 있으면 generator에 포함', () => {
      const ev = createInterpretationEvidence({
        ownerId: 'analysis-123',
        ownerKind: 'analysis',
        model: 'gpt-4o',
        provider: 'openrouter',
        inputSummary: '독립표본 t-검정',
      })

      expect(ev.id).toMatch(/^ev_/)
      expect(ev.ownerKind).toBe('analysis')
      expect(ev.ownerId).toBe('analysis-123')
      expect(ev.kind).toBe('ai-interpretation')
      expect(ev.generator.type).toBe('llm')
      expect(ev.generator.model).toBe('gpt-4o')
      expect(ev.generator.provider).toBe('openrouter')
      expect(ev.inputs).toHaveLength(1)
      expect(ev.inputs![0].label).toBe('독립표본 t-검정')
      expect(ev.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('model/provider 없으면 generator에 포함하지 않음', () => {
      const ev = createInterpretationEvidence({
        ownerId: 'analysis-456',
        ownerKind: 'analysis',
      })

      expect(ev.generator.model).toBeUndefined()
      expect(ev.generator.provider).toBeUndefined()
      expect(ev.inputs).toBeUndefined()
    })
  })

  describe('createMethodRationaleEvidence', () => {
    const mockRecommendation: AiRecommendationContext = {
      userQuery: '암수 체장 차이 비교',
      confidence: 0.85,
      reasoning: ['독립된 두 그룹', '연속형 종속변수', '정규성 충족'],
      provider: 'openrouter',
    }

    it('추천 맥락에서 evidence 생성', () => {
      const ev = createMethodRationaleEvidence({
        ownerId: 'analysis-789',
        recommendation: mockRecommendation,
        methodName: '독립표본 t-검정',
      })

      expect(ev.kind).toBe('method-rationale')
      expect(ev.title).toBe('독립표본 t-검정 추천 근거')
      expect(ev.summary).toBe('독립된 두 그룹; 연속형 종속변수; 정규성 충족')
      expect(ev.generator.provider).toBe('openrouter')
      expect(ev.inputs![0].kind).toBe('user-input')
      expect(ev.inputs![0].label).toBe('암수 체장 차이 비교')
      expect(ev.metadata).toEqual({ confidence: 0.85 })
    })

    it('methodName 없으면 title 없음', () => {
      const ev = createMethodRationaleEvidence({
        ownerId: 'analysis-000',
        recommendation: mockRecommendation,
      })

      expect(ev.title).toBeUndefined()
    })
  })

  describe('createRuleDecisionEvidence', () => {
    it('규칙 기반 판정 evidence 생성', () => {
      const ev = createRuleDecisionEvidence({
        ownerId: 'blast-123',
        ownerKind: 'blast-result',
        ruleVersion: 'decision-engine-v1',
        summary: '97.3% identity, COI marker → high confidence',
        metadata: { topIdentity: 0.973 },
      })

      expect(ev.kind).toBe('rule-decision')
      expect(ev.generator.type).toBe('rule')
      expect(ev.generator.version).toBe('decision-engine-v1')
      expect(ev.ownerKind).toBe('blast-result')
      expect(ev.metadata).toEqual({ topIdentity: 0.973 })
    })
  })

  describe('createAiEditEvidence', () => {
    it('AI 편집 evidence 생성', () => {
      const ev = createAiEditEvidence({
        ownerId: 'gp-123',
        ownerKind: 'figure',
        userMessage: '막대 색상을 파란색으로 변경',
        provider: 'openrouter',
        patchCount: 3,
      })

      expect(ev.kind).toBe('ai-edit')
      expect(ev.title).toContain('AI 편집')
      expect(ev.title).toContain('막대 색상을 파란색으로 변경')
      expect(ev.generator.type).toBe('llm')
      expect(ev.metadata).toEqual({ patchCount: 3 })
    })

    it('긴 메시지는 title에서 50자로 잘림', () => {
      const longMsg = '이 차트의 X축 라벨을 45도 회전하고 폰트 크기를 12로 변경하고 범례를 우측 상단에 배치해주세요'
      const ev = createAiEditEvidence({
        ownerId: 'gp-456',
        ownerKind: 'figure',
        userMessage: longMsg,
      })

      expect(ev.title!.length).toBeLessThanOrEqual(60) // 'AI 편집: "' + 50chars + '"'
    })
  })

  describe('buildAnalysisEvidence', () => {
    it('추천 + 해석 모두 있으면 2개 evidence', () => {
      const records = buildAnalysisEvidence({
        historyId: 'analysis-build-1',
        methodName: 'ANOVA',
        aiRecommendation: {
          userQuery: '사료 3종 비교',
          confidence: 0.9,
          reasoning: ['3그룹 이상 비교'],
          provider: 'openrouter',
        },
        aiInterpretation: 'F(2,42)=12.34, p<.001...',
        interpretationModel: 'gpt-4o',
      })

      expect(records).toHaveLength(2)
      expect(records[0].kind).toBe('method-rationale')
      expect(records[1].kind).toBe('ai-interpretation')
      expect(records[1].generator.model).toBe('gpt-4o')
    })

    it('추천만 있으면 1개', () => {
      const records = buildAnalysisEvidence({
        historyId: 'analysis-build-2',
        aiRecommendation: {
          userQuery: '테스트',
          confidence: 0.7,
          reasoning: ['이유'],
          provider: 'openrouter',
        },
      })

      expect(records).toHaveLength(1)
      expect(records[0].kind).toBe('method-rationale')
    })

    it('둘 다 없으면 빈 배열', () => {
      const records = buildAnalysisEvidence({
        historyId: 'analysis-build-3',
      })

      expect(records).toHaveLength(0)
    })
  })
})
