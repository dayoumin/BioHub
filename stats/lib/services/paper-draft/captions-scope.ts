export type CaptionsAutomationFactId =
  | 'table-number'
  | 'figure-number'
  | 'chart-type'
  | 'variable-labels'
  | 'units'
  | 'group-labels'
  | 'table-statistics'
  | 'source-provenance'

export type CaptionsUserInputId =
  | 'caption-message'
  | 'panel-description'
  | 'image-processing'
  | 'equipment-conditions'
  | 'journal-style'

export type CaptionsProhibitedClaimId =
  | 'unsupported-pattern'
  | 'invented-panel-label'
  | 'equipment-inference'
  | 'magnification-inference'
  | 'unlinked-figure-result'
  | 'unlinked-table-result'

export type CaptionsGateRuleId =
  | 'missing-source-provenance'
  | 'missing-caption-source'
  | 'missing-variable-metadata'
  | 'missing-caption-message'
  | 'missing-panel-description'

interface LocalizedScopeText {
  ko: string
  en: string
}

interface CaptionsScopeItem<TId extends string> {
  id: TId
  label: LocalizedScopeText
  description: LocalizedScopeText
}

export interface ResolvedCaptionsScopeItem<TId extends string> {
  id: TId
  label: string
  description: string
}

export interface CaptionsAutomationScopeDefinition {
  autoFacts: Array<CaptionsScopeItem<CaptionsAutomationFactId>>
  userInputs: Array<CaptionsScopeItem<CaptionsUserInputId>>
  prohibitedClaims: Array<CaptionsScopeItem<CaptionsProhibitedClaimId>>
  blockedWhen: CaptionsGateRuleId[]
  reviewWhen: CaptionsGateRuleId[]
}

export interface ResolvedCaptionsAutomationScope {
  autoFacts: Array<ResolvedCaptionsScopeItem<CaptionsAutomationFactId>>
  userInputs: Array<ResolvedCaptionsScopeItem<CaptionsUserInputId>>
  prohibitedClaims: Array<ResolvedCaptionsScopeItem<CaptionsProhibitedClaimId>>
  blockedWhen: CaptionsGateRuleId[]
  reviewWhen: CaptionsGateRuleId[]
}

function item<TId extends string>(
  id: TId,
  ko: string,
  en: string,
  koDescription: string,
  enDescription: string,
): CaptionsScopeItem<TId> {
  return {
    id,
    label: { ko, en },
    description: { ko: koDescription, en: enDescription },
  }
}

const CAPTIONS_SCOPE: CaptionsAutomationScopeDefinition = {
  autoFacts: [
    item(
      'table-number',
      '표 번호 후보',
      'Table number candidate',
      '생성된 표 순서에 따른 번호 후보만 작성합니다.',
      'Only number candidates based on generated table order are stated.',
    ),
    item(
      'figure-number',
      '그림 번호 후보',
      'Figure number candidate',
      'source가 연결된 figure가 있을 때만 번호 후보를 작성합니다.',
      'Figure number candidates are stated only when a source-linked figure exists.',
    ),
    item(
      'chart-type',
      '그래프 유형',
      'Chart type',
      '분석 결과의 visualizationData.type에 저장된 그래프 유형만 사용합니다.',
      'Only the chart type stored in visualizationData.type is used.',
    ),
    item(
      'variable-labels',
      '변수 라벨',
      'Variable labels',
      'DraftContext/StudySchema에 있는 변수 라벨만 사용합니다.',
      'Only variable labels available in DraftContext or StudySchema are used.',
    ),
    item(
      'units',
      '단위',
      'Units',
      '사용자가 확인한 단위 metadata만 caption에 포함합니다.',
      'Only user-confirmed unit metadata is included in captions.',
    ),
    item(
      'group-labels',
      '집단 라벨',
      'Group labels',
      '저장된 집단 라벨 또는 결과의 집단 key만 사용합니다.',
      'Only stored group labels or group keys from results are used.',
    ),
    item(
      'table-statistics',
      '표 통계량 설명',
      'Table statistic description',
      '생성된 표에 실제 포함된 통계량 설명만 작성합니다.',
      'Only statistics actually included in generated tables are described.',
    ),
    item(
      'source-provenance',
      'source provenance',
      'Source provenance',
      '분석 source fingerprint와 figure/table source가 있는 경우만 자동 caption 기준으로 사용합니다.',
      'Analysis source fingerprint and figure/table sources are required for automatic captions.',
    ),
  ],
  userInputs: [
    item(
      'caption-message',
      '핵심 메시지',
      'Caption message',
      'figure가 말하고자 하는 핵심 메시지는 사용자가 확인해야 합니다.',
      'The key message of a figure must be user-confirmed.',
    ),
    item(
      'panel-description',
      'panel 설명',
      'Panel description',
      '다중 panel 구성과 label은 실제 이미지/source가 있을 때만 작성합니다.',
      'Multi-panel composition and labels are stated only when present in the image/source.',
    ),
    item(
      'image-processing',
      '이미지 처리',
      'Image processing',
      '이미지 보정, crop, scale bar 등은 자동 추론하지 않습니다.',
      'Image adjustment, cropping, scale bars, and similar details are not inferred.',
    ),
    item(
      'equipment-conditions',
      '장비/조건',
      'Equipment and conditions',
      '현미경, 배율, 염색법, 장비 조건은 명시 입력이 있을 때만 작성합니다.',
      'Microscope, magnification, staining, and equipment conditions are stated only when explicitly provided.',
    ),
    item(
      'journal-style',
      '저널별 스타일',
      'Journal style',
      '저널별 caption 문체와 순서는 후속 export/style 단계에서 확정합니다.',
      'Journal-specific caption style and ordering are finalized in a later export/style step.',
    ),
  ],
  prohibitedClaims: [
    item(
      'unsupported-pattern',
      '없는 패턴 설명',
      'Unsupported pattern description',
      'figure source가 제공하지 않는 추세, 군집, 이상 패턴을 설명하지 않습니다.',
      'Trends, clusters, or abnormal patterns absent from the figure source are not described.',
    ),
    item(
      'invented-panel-label',
      'panel label 생성',
      'Invented panel label',
      '실제 panel source 없이 A/B/C label을 만들지 않습니다.',
      'A/B/C labels are not created without actual panel source.',
    ),
    item(
      'equipment-inference',
      '장비 추론',
      'Equipment inference',
      '이미지나 통계 결과만으로 장비명을 추론하지 않습니다.',
      'Equipment names are not inferred from images or statistical results alone.',
    ),
    item(
      'magnification-inference',
      '배율 추론',
      'Magnification inference',
      '배율, scale bar, 현미경 조건은 source 없이 작성하지 않습니다.',
      'Magnification, scale bars, and microscopy conditions are not stated without source.',
    ),
    item(
      'unlinked-figure-result',
      '연결 없는 figure 결과',
      'Unlinked figure result',
      'source binding이 없는 figure 결과를 caption에 만들지 않습니다.',
      'Figure results without source binding are not created in captions.',
    ),
    item(
      'unlinked-table-result',
      '연결 없는 table 결과',
      'Unlinked table result',
      '생성된 표에 없는 통계량을 table caption에 추가하지 않습니다.',
      'Statistics absent from the generated table are not added to table captions.',
    ),
  ],
  blockedWhen: ['missing-source-provenance', 'missing-caption-source'],
  reviewWhen: ['missing-variable-metadata', 'missing-caption-message', 'missing-panel-description'],
}

function resolveItem<TId extends string>(
  itemToResolve: CaptionsScopeItem<TId>,
  language: 'ko' | 'en',
): ResolvedCaptionsScopeItem<TId> {
  return {
    id: itemToResolve.id,
    label: itemToResolve.label[language],
    description: itemToResolve.description[language],
  }
}

export function getCaptionsAutomationScope(language: 'ko' | 'en'): ResolvedCaptionsAutomationScope {
  return {
    autoFacts: CAPTIONS_SCOPE.autoFacts.map((entry) => resolveItem(entry, language)),
    userInputs: CAPTIONS_SCOPE.userInputs.map((entry) => resolveItem(entry, language)),
    prohibitedClaims: CAPTIONS_SCOPE.prohibitedClaims.map((entry) => resolveItem(entry, language)),
    blockedWhen: CAPTIONS_SCOPE.blockedWhen,
    reviewWhen: CAPTIONS_SCOPE.reviewWhen,
  }
}
