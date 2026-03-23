/**
 * EvidenceRecord 생성 팩토리
 *
 * 각 모듈에서 직접 EvidenceRecord를 조립하지 않고,
 * 용도별 팩토리 함수로 일관된 구조를 보장한다.
 *
 * 모든 함수는 순수 함수 — 부수효과 없음.
 */

import type {
  EvidenceRecord,
  EvidenceOwnerKind,
  EvidenceGenerator,
} from '@/lib/types/research'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'

// ── ID 생성 ──

function generateEvidenceId(): string {
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ── 팩토리 함수 ──

/** AI 결과 해석 evidence (통계 분석, 향후 다른 모듈) */
export function createInterpretationEvidence(opts: {
  ownerId: string
  ownerKind: EvidenceOwnerKind
  model?: string
  provider?: string
  inputSummary?: string
}): EvidenceRecord {
  const generator: EvidenceGenerator = {
    type: 'llm',
    ...(opts.provider ? { provider: opts.provider } : {}),
    ...(opts.model ? { model: opts.model } : {}),
  }

  return {
    id: generateEvidenceId(),
    ownerKind: opts.ownerKind,
    ownerId: opts.ownerId,
    kind: 'ai-interpretation',
    generator,
    inputs: opts.inputSummary
      ? [{ kind: 'analysis', id: opts.ownerId, label: opts.inputSummary }]
      : undefined,
    generatedAt: new Date().toISOString(),
  }
}

/** 메서드 추천 근거 evidence (통계 분석) */
export function createMethodRationaleEvidence(opts: {
  ownerId: string
  recommendation: AiRecommendationContext
  methodName?: string
}): EvidenceRecord {
  return {
    id: generateEvidenceId(),
    ownerKind: 'analysis',
    ownerId: opts.ownerId,
    kind: 'method-rationale',
    title: opts.methodName ? `${opts.methodName} 추천 근거` : undefined,
    summary: opts.recommendation.reasoning.join('; '),
    generator: {
      type: 'llm',
      provider: opts.recommendation.provider,
    },
    inputs: [
      { kind: 'user-input', label: opts.recommendation.userQuery },
    ],
    generatedAt: new Date().toISOString(),
    metadata: {
      confidence: opts.recommendation.confidence,
    },
  }
}

/** 규칙 기반 판정 evidence (유전 분석 등) */
export function createRuleDecisionEvidence(opts: {
  ownerId: string
  ownerKind: EvidenceOwnerKind
  ruleVersion: string
  summary: string
  metadata?: Record<string, unknown>
}): EvidenceRecord {
  return {
    id: generateEvidenceId(),
    ownerKind: opts.ownerKind,
    ownerId: opts.ownerId,
    kind: 'rule-decision',
    summary: opts.summary,
    generator: {
      type: 'rule',
      version: opts.ruleVersion,
    },
    generatedAt: new Date().toISOString(),
    metadata: opts.metadata,
  }
}

/** AI 편집 evidence (Graph Studio 등) */
export function createAiEditEvidence(opts: {
  ownerId: string
  ownerKind: EvidenceOwnerKind
  userMessage: string
  provider?: string
  model?: string
  patchCount?: number
}): EvidenceRecord {
  return {
    id: generateEvidenceId(),
    ownerKind: opts.ownerKind,
    ownerId: opts.ownerId,
    kind: 'ai-edit',
    title: `AI 편집: "${opts.userMessage.slice(0, 50)}"`,
    generator: {
      type: 'llm',
      ...(opts.provider ? { provider: opts.provider } : {}),
      ...(opts.model ? { model: opts.model } : {}),
    },
    inputs: [
      { kind: 'user-input', label: opts.userMessage },
    ],
    generatedAt: new Date().toISOString(),
    metadata: opts.patchCount != null ? { patchCount: opts.patchCount } : undefined,
  }
}

// ── 유틸 ──

/**
 * 분석 저장 시 evidence 배열 조립.
 * saveToHistory()에서 호출.
 */
export function buildAnalysisEvidence(opts: {
  historyId: string
  methodName?: string
  aiRecommendation?: AiRecommendationContext | null
  aiInterpretation?: string | null
  interpretationModel?: string | null
}): EvidenceRecord[] {
  const records: EvidenceRecord[] = []

  if (opts.aiRecommendation) {
    records.push(createMethodRationaleEvidence({
      ownerId: opts.historyId,
      recommendation: opts.aiRecommendation,
      methodName: opts.methodName,
    }))
  }

  if (opts.aiInterpretation) {
    records.push(createInterpretationEvidence({
      ownerId: opts.historyId,
      ownerKind: 'analysis',
      model: opts.interpretationModel ?? undefined,
    }))
  }

  return records
}
