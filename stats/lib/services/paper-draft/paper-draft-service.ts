/**
 * 논문 초안 생성 서비스 (템플릿 기반 즉시 생성)
 *
 * Methods/Results/Captions: 한글 + 영문 템플릿 (APA 7th 형식)
 * Discussion: null (외부 AI 영역 — BioHub에서 생성하지 않음)
 */

import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { ExportContext } from '@/lib/services/export/export-types'
import { flattenAssumptions, groupAssumptions } from '@/lib/services/export/assumption-utils'
import { getTemplate } from './paper-templates'
import type {
  PaperDraft,
  PaperDraftOptions,
  DraftContext,
} from './paper-types'
import { generatePaperTables } from './paper-tables'

/**
 * 논문 초안 생성 (Methods + Results + Captions 즉시 생성, Discussion = null)
 *
 * @param exportCtx  - 분석 결과 번들 (ResultsActionStep에서 전달)
 * @param draftCtx   - 사용자 확인 컨텍스트 (변수명/단위/집단명 등)
 * @param methodId   - 선택된 분석 메서드 ID (selectedMethod.id)
 * @param options    - 언어, 섹션, 사후검정 표시 옵션
 */
export function generatePaperDraft(
  exportCtx: ExportContext,
  draftCtx: DraftContext,
  methodId: string,
  options: PaperDraftOptions
): PaperDraft {
  const { analysisResult: r } = exportCtx
  const lang = options.language
  const generatedAt = new Date().toISOString()

  // 통계 결과 표 생성 (한글/영문 모두)
  const tables = generatePaperTables(
    r,
    draftCtx,
    lang,
    options.postHocDisplay ?? 'significant-only',
  )

  // 카테고리 조회
  const category = STATISTICAL_METHODS[methodId]?.category ?? 'other'

  // 가정검정 flat화 + 카테고리별 그룹핑 (템플릿에서 반복 filter 제거)
  const assumptions = flattenAssumptions(r.assumptions)
  const grouped = groupAssumptions(assumptions)

  // 템플릿 선택
  const template = getTemplate(methodId, category)
  const input = { r, assumptions, grouped, ctx: draftCtx, lang, methodId, options }

  return {
    methods: template.methods(input),
    results: template.results(input),
    captions: template.captions(input),
    discussion: null,  // Phase B: LLM 생성
    tables,
    language: lang,
    postHocDisplay: options.postHocDisplay ?? 'significant-only',
    generatedAt,
    model: null,
    context: draftCtx,
  }
}
