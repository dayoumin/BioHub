import type { ProjectEntityKind } from '@biohub/types'
import type { BioToolId } from '@/lib/bio-tools/bio-tool-registry'

export type SupplementaryWriterStage =
  | 'dedicated'
  | 'next'
  | 'candidate'
  | 'generic-only'

export interface SupplementaryWriterPolicy {
  entityKind: ProjectEntityKind
  stage: SupplementaryWriterStage
  priority: number
  rationale: string
  promotionRequirement: string
  genericBoundary: string
}

export interface BioToolSupplementaryWriterPolicy {
  toolId: BioToolId
  stage: SupplementaryWriterStage
  priority: number
  rationale: string
  promotionRequirement: string
}

type BioToolSupplementaryWriterPolicyDetails = Omit<BioToolSupplementaryWriterPolicy, 'toolId'>

export const SUPPLEMENTARY_GENERIC_FALLBACK_CONSTRAINTS = [
  '원본 entity label과 검증된 수치 요약만 사용한다.',
  '분석 방법 선택 이유, 생물학적 의미, novelty, causal language는 생성하지 않는다.',
  'figure/table/citation이 없는 상태에서 해당 참조를 새로 만들지 않는다.',
  '전용 writer 승격 전에는 결과 구조를 타입 가드와 회귀 테스트로 먼저 고정한다.',
] as const

export const SUPPLEMENTARY_ENTITY_WRITER_POLICIES = [
  {
    entityKind: 'blast-result',
    stage: 'dedicated',
    priority: 0,
    rationale: 'species/status/identity/top hits가 구조화되어 있고 이미 보수적 전용 writer가 있다.',
    promotionRequirement: '이미 충족. top hit와 status가 없으면 label fallback만 허용한다.',
    genericBoundary: '종 동정 확정 표현은 저장된 status와 top hit에 한정한다.',
  },
  {
    entityKind: 'protein-result',
    stage: 'dedicated',
    priority: 0,
    rationale: '분자량, pI, 안정성, 단백질 report snapshot이 구조화되어 있고 이미 전용 writer가 있다.',
    promotionRequirement: '이미 충족. reportMarkdown 또는 resultData가 없으면 최소 물성 요약만 허용한다.',
    genericBoundary: '기능, 도메인, 생물학적 역할은 자동 추론하지 않는다.',
  },
  {
    entityKind: 'bold-result',
    stage: 'dedicated',
    priority: 0,
    rationale: 'top species, similarity, BIN, hit count가 있어 BLAST/barcoding 계열과 유사한 보수적 전용 writer가 있다.',
    promotionRequirement: '이미 충족. similarity null, species unresolved, BIN missing 케이스는 fallback 테스트를 확장한다.',
    genericBoundary: 'BOLD 결과는 후보 동정으로만 표현하고 확정 동정은 자동 주장하지 않는다.',
  },
  {
    entityKind: 'seq-stats-result',
    stage: 'dedicated',
    priority: 0,
    rationale: 'sequence count, mean length, GC content가 결정론적이고 해석 없는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. count/length/GC 포맷과 source map 누락 fallback 테스트를 유지한다.',
    genericBoundary: '서열 품질, 유전자 기능, 종 동정은 언급하지 않는다.',
  },
  {
    entityKind: 'translation-result',
    stage: 'dedicated',
    priority: 0,
    rationale: 'genetic code, mode, sequence length, ORF count를 처리 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. ORF/codon/translation mode별 누락값 테스트는 후속으로 확장한다.',
    genericBoundary: '단백질 기능, coding potential, ORF 생물학적 의미는 자동 해석하지 않는다.',
  },
  {
    entityKind: 'similarity-result',
    stage: 'dedicated',
    priority: 0,
    rationale: 'distance model, sequence count, alignment length, mean distance를 거리 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 누락값 방어 테스트는 source map fallback 중심으로 유지한다.',
    genericBoundary: '종 경계, clustering, 계통 해석은 자동 생성하지 않는다.',
  },
  {
    entityKind: 'phylogeny-result',
    stage: 'dedicated',
    priority: 0,
    rationale: 'tree method/model/alignment metadata만 방법·입력 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. topology/clade/bootstrap 해석은 별도 source contract 전까지 확장하지 않는다.',
    genericBoundary: '분기군, 진화 관계, 지지도 해석은 source 없이 생성하지 않는다.',
  },
  {
    entityKind: 'bio-tool-result',
    stage: 'generic-only',
    priority: 99,
    rationale: 'Bio-Tools history의 results가 unknown이라 도구별 결과 구조를 전역에서 안전하게 보장할 수 없다.',
    promotionRequirement: 'BioToolId별 타입 가드와 writer 테스트를 추가한 도구만 개별 승격한다.',
    genericBoundary: '도구명, 입력 파일, 검증된 export table 요약 외의 통계 해석은 생성하지 않는다.',
  },
] as const satisfies readonly SupplementaryWriterPolicy[]

const GENERIC_BIO_TOOL_POLICY = {
  stage: 'generic-only',
  priority: 99,
  rationale: '아직 BioToolId별 결과 타입 가드와 전용 writer 테스트가 없다.',
  promotionRequirement: '도구별 result schema/type guard와 source-backed 출력 테스트를 먼저 추가한다.',
} as const satisfies BioToolSupplementaryWriterPolicyDetails

export const BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL = {
  'alpha-diversity': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'site count, species count, Shannon/Simpson 등 지수 요약을 타입 가드 후 수치 표로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 다양성의 높고 낮음, 생태학적 의미, 군집 차이는 자동 해석하지 않는다.',
  },
  rarefaction: {
    stage: 'dedicated',
    priority: 0,
    rationale: 'curve site names, sampling steps, expected species arrays를 타입 가드 후 최종 곡선 값 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 표본 충분성, 포화 여부, 군집 richness 해석은 자동 writer에서 사용하지 않는다.',
  },
  'beta-diversity': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'distance matrix, site labels, distance metric을 타입 가드 후 쌍별 거리 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. clustering, group separation, ecological distance interpretation은 자동 writer에서 사용하지 않는다.',
  },
  nmds: {
    stage: 'dedicated',
    priority: 0,
    rationale: 'NMDS coordinates, stress, dimensions, site labels, optional groups를 타입 가드 후 좌표 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. stressInterpretation 문자열, 군집 분리, gradient, 생태학적 의미 해석은 자동 writer에서 사용하지 않는다.',
  },
  permanova: {
    stage: 'dedicated',
    priority: 0,
    rationale: 'pseudo-F, p-value, R2, permutations, SS 항목을 타입 가드 후 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 집단 차이 유의성, effect interpretation, group factor 의미 해석은 자동 writer에서 사용하지 않는다.',
  },
  'mantel-test': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'Mantel r, p-value, permutations, method를 타입 가드 후 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 상관 강도, 유의성, 거리 행렬 간 생물학적 의미 또는 인과 해석은 자동 writer에서 사용하지 않는다.',
  },
  vbgf: {
    stage: 'dedicated',
    priority: 0,
    rationale: 'L∞, K, t0, parameter table, R2/AIC, predicted/residual counts, N을 타입 가드 후 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 성장 양상 평가, 생물학적 의미, 모델 적합성 좋고 나쁨 해석은 자동 writer에서 사용하지 않는다.',
  },
  'length-weight': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'a, b, R2, b SE, isometric t/p, N을 타입 가드 후 회귀 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. growthType 판정, 등성장 유의성 판단, 축/단위 해석은 자동 writer에서 사용하지 않는다.',
  },
  'condition-factor': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'individual K, mean/SD/median/range/N, optional group stats/comparison test를 타입 가드 후 기술통계 수치로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. condition의 좋고 나쁨, 생리 상태, 그룹 차이 유의성 해석은 자동 writer에서 사용하지 않는다.',
  },
  'hardy-weinberg': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'allele frequency, observed/expected genotype counts, chi-square/exact p-value를 타입 가드 후 요약하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. interpretation 문자열과 평형/이탈 판정 문구는 자동 writer에서 사용하지 않는다.',
  },
  'species-validation': {
    stage: 'generic-only',
    priority: 99,
    rationale: '현재 registry 상태가 coming-soon이고 구현 컴포넌트, worker/API adapter, 중앙 result schema가 없어 source-backed 전용 writer를 만들 수 없다.',
    promotionRequirement: '실제 API result schema, status enum, match confidence, database provenance, protected-species fields를 타입으로 고정하고 fallback/금지 표현 테스트를 추가한 뒤 승격한다.',
  },
  fst: {
    stage: 'dedicated',
    priority: 0,
    rationale: 'Global Fst, pairwise Fst matrix, population labels, optional permutation/bootstrap fields를 타입 가드 후 요약하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. interpretation 문자열은 자동 writer에서 사용하지 않는다.',
  },
  'meta-analysis': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'pooled effect, CI, z/p, Q/Q p, I2/tau2, study-level effect/CI/weight를 타입 가드 후 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 효과의 의미, 유의성, 이질성 높고 낮음, 모델 선택 해석은 자동 writer에서 사용하지 않는다.',
  },
  'roc-auc': {
    stage: 'dedicated',
    priority: 0,
    rationale: 'AUC, AUC CI, threshold, sensitivity, specificity, ROC point count를 타입 가드 후 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 진단 성능 우수/불량, 임상적 유용성, 최적 cut-off 해석은 자동 writer에서 사용하지 않는다.',
  },
  icc: {
    stage: 'dedicated',
    priority: 0,
    rationale: 'ICC type, ICC, CI, F/df/p, mean squares, 대상 수/평가자 수를 타입 가드 후 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. interpretation 문자열과 신뢰도 품질 판정은 자동 writer에서 사용하지 않는다.',
  },
  survival: {
    stage: 'dedicated',
    priority: 0,
    rationale: 'Kaplan-Meier 곡선, 생존확률/CI, at-risk, event/censor counts, median survival, log-rank p를 타입 가드 후 수치 요약으로 제한하는 전용 writer가 있다.',
    promotionRequirement: '이미 충족. 그룹 간 차이 유의성, 생존 우수/불량, 치료 효과 또는 위험 해석은 자동 writer에서 사용하지 않는다.',
  },
} as const satisfies Record<BioToolId, BioToolSupplementaryWriterPolicyDetails>

export const BIO_TOOL_SUPPLEMENTARY_WRITER_POLICIES = (
  Object.entries(BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL) as Array<[BioToolId, BioToolSupplementaryWriterPolicyDetails]>
)
  .map(([toolId, policy]) => ({ toolId, ...policy }))
  .sort((left, right) => left.priority - right.priority || left.toolId.localeCompare(right.toolId))

export function getSupplementaryWriterPolicy(
  entityKind: ProjectEntityKind,
): SupplementaryWriterPolicy | null {
  return SUPPLEMENTARY_ENTITY_WRITER_POLICIES.find((policy) => policy.entityKind === entityKind) ?? null
}

export function getBioToolSupplementaryWriterPolicy(
  toolId: BioToolId,
): BioToolSupplementaryWriterPolicy | null {
  return {
    toolId,
    ...BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL[toolId],
  }
}

export function getSupplementaryWriterPromotionQueue(): SupplementaryWriterPolicy[] {
  const policies: readonly SupplementaryWriterPolicy[] = SUPPLEMENTARY_ENTITY_WRITER_POLICIES
  return policies
    .filter((policy) => policy.stage === 'next' || policy.stage === 'candidate')
    .sort((left, right) => left.priority - right.priority)
}
