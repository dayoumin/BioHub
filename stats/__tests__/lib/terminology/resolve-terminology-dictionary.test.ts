import { describe, expect, it } from 'vitest'
import { resolveTerminologyDictionary } from '@/lib/terminology/resolve-terminology-dictionary'

describe('resolveTerminologyDictionary', () => {
  it('composes English UI sections with aquaculture-specific terminology for en+aquaculture', () => {
    const dictionary = resolveTerminologyDictionary('en', 'aquaculture')

    expect(dictionary.language).toBe('en')
    expect(dictionary.domain).toBe('aquaculture')
    expect(dictionary.analysis.stepTitles.variableSelection).toBe('Variable Selection')
    expect(dictionary.variables.dependent.title).toBe('Measurement Variable (Y)')
    expect(dictionary.displayName).toBe('Aquaculture')
    expect(dictionary.purposeInput.purposes.compare.examples).toContain('farms')
    expect(dictionary.hub.aiSearch.placeholder).toContain('flounder')
    expect(dictionary.guidedQuestions.buttons.modify).toBe('Modify')
    expect(dictionary.guidedQuestionData.compare[0]?.question).toBe('What do you want to compare?')
    expect(dictionary.progressiveCategoryData[0]?.title).toBe('Comparison Analysis')
    expect(dictionary.analysisInfo.cardTitle).toBe('Analysis Info')
    expect(dictionary.variableMapping.editButton).toBe('Edit Mapping')
  })

  it('composes Korean UI sections with generic terminology overrides for ko+generic', () => {
    const dictionary = resolveTerminologyDictionary('ko', 'generic')

    expect(dictionary.language).toBe('ko')
    expect(dictionary.domain).toBe('generic')
    expect(dictionary.analysis.stepTitles.variableSelection).toBe('변수 선택')
    expect(dictionary.variables.group.title).toBe('그룹 변수')
    expect(dictionary.displayName).toBe('범용 통계')
    expect(dictionary.purposeInput.purposes.compare.examples).toContain('반별 시험 점수')
    expect(dictionary.hub.aiSearch.placeholder).toContain('평균 차이')
    expect(dictionary.guidedQuestions.buttons.modify).toBe('수정하기')
    expect(dictionary.guidedQuestionData.compare[0]?.question).toBe('무엇을 비교하려고 하나요?')
    expect(dictionary.progressiveCategoryData[0]?.title).toBe('차이/비교 분석')
    expect(dictionary.analysisInfo.cardTitle).toBe('분석 정보')
    expect(dictionary.variableMapping.editButton).toBe('변수 매핑 편집')
  })

  it('preserves exact domain-owned sections for built-in exact combinations', () => {
    const genericEn = resolveTerminologyDictionary('en', 'generic')
    const aquacultureKo = resolveTerminologyDictionary('ko', 'aquaculture')

    expect(genericEn.purposeInput.purposes.compare.title).toBe('Group Comparison')
    expect(aquacultureKo.purposeInput.purposes.compare.title).toBe('그룹 간 차이 비교')
    expect(genericEn.guidedQuestionData.compare[0]?.question).toBe('What do you want to compare?')
    expect(aquacultureKo.guidedQuestionData.compare[0]?.question).toBe('무엇을 비교하려고 하나요?')
    expect(genericEn.progressiveCategoryData[0]?.title).toBe('Comparison Analysis')
    expect(aquacultureKo.progressiveCategoryData[0]?.title).toBe('차이/비교 분석')
  })
})
