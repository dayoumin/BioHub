/**
 * Bio-Tools 확장 메타데이터
 *
 * 각 도구의 상세 설명, 기대 결과, 필수 컬럼 가이드, 예제 데이터 경로.
 * 코어 레지스트리(bio-tool-registry.ts)와 분리하여 유지보수 용이.
 */

import type { BioToolExtendedMeta } from './bio-tool-registry'

const META: Record<string, BioToolExtendedMeta> = {
  // ═══ 군집생태 ═══════════════════════════════════

  'alpha-diversity': {
    descriptionLong:
      '지점별 종 다양성 지수를 계산합니다. Shannon, Simpson, Margalef, Pielou 등 대표적인 알파 다양성 지수를 한 번에 산출하여 군집 구조를 요약합니다.',
    outputHighlights: [
      '지점별 Shannon H\', Simpson 1-D, Margalef, Pielou J\' 지수',
      '종 수(S) 및 개체수(N) 요약',
      '지수 비교 테이블',
    ],
    columns: [
      { label: '지점명 (site)', required: true, example: 'St1, St2, ...' },
      { label: '종 풍도 열 (species)', required: true, example: '0, 5, 12, ...' },
    ],
    exampleDataPath: '/example-data/ecology-sample.csv',
    relatedTools: ['rarefaction', 'beta-diversity'],
  },

  rarefaction: {
    descriptionLong:
      '표본 크기에 따른 기대 종 수를 추정하는 희박화 곡선을 생성합니다. 샘플링 노력이 충분했는지 평가하고, 지점 간 종 풍부도를 공정하게 비교할 수 있습니다.',
    outputHighlights: [
      '지점별 희박화 곡선 (개체수 vs 기대 종 수)',
      '샘플링 충분성 평가',
      '지점 간 종 풍부도 비교',
    ],
    columns: [
      { label: '지점명 (site)', required: true, example: 'St1, St2, ...' },
      { label: '종 풍도 열 (species)', required: true, example: '0, 5, 12, ...' },
    ],
    exampleDataPath: '/example-data/ecology-sample.csv',
    relatedTools: ['alpha-diversity'],
  },

  'beta-diversity': {
    descriptionLong:
      '지점 간 군집 조성 차이를 거리행렬로 정량화합니다. Bray-Curtis, Jaccard, Sorensen 등 거리 지표를 선택할 수 있으며, 후속 분석(NMDS, PERMANOVA)의 입력으로 활용됩니다.',
    outputHighlights: [
      'N x N 거리행렬 (Bray-Curtis / Jaccard / Sorensen)',
      '지점 간 유사도 비교',
      'NMDS, PERMANOVA 후속 분석 연계',
    ],
    columns: [
      { label: '지점명 (site)', required: true, example: 'St1, St2, ...' },
      { label: '종 풍도 열 (species)', required: true, example: '0, 5, 12, ...' },
    ],
    exampleDataPath: '/example-data/ecology-sample.csv',
    relatedTools: ['nmds', 'permanova'],
  },

  nmds: {
    descriptionLong:
      '거리행렬을 2차원 공간에 투영하여 군집 구조를 시각화합니다. Stress 값으로 표현 적합도를 평가하고, 그룹 간 군집 분포 패턴을 직관적으로 파악할 수 있습니다.',
    outputHighlights: [
      '2D NMDS 산점도 (그룹별 색상 구분)',
      'Stress 값 + 적합도 판정',
      '지점 라벨 표시',
    ],
    columns: [
      { label: '지점명 (site)', required: true, example: 'St1, St2, ...' },
      { label: '그룹 (group)', required: false, example: '처리, 대조, ...' },
      { label: '종 풍도 열 (species)', required: true, example: '0, 5, 12, ...' },
    ],
    exampleDataPath: '/example-data/ecology-sample.csv',
    relatedTools: ['beta-diversity', 'permanova'],
  },

  permanova: {
    descriptionLong:
      '순열 검정으로 그룹 간 군집 조성 차이를 통계적으로 검정합니다. ANOVA의 비모수 다변량 버전으로, 정규성 가정 없이 거리행렬 기반으로 분석합니다.',
    outputHighlights: [
      'Pseudo-F 통계량 + p-value',
      'R² (설명 분산 비율)',
      'SS (제곱합) 분해 테이블',
    ],
    columns: [
      { label: '지점명 (site)', required: true, example: 'St1, St2, ...' },
      { label: '그룹 (group)', required: true, example: '처리, 대조, ...' },
      { label: '종 풍도 열 (species)', required: true, example: '0, 5, 12, ...' },
    ],
    exampleDataPath: '/example-data/ecology-sample.csv',
    relatedTools: ['beta-diversity', 'nmds'],
  },

  'mantel-test': {
    descriptionLong:
      '두 거리행렬 간 상관관계를 순열 검정으로 평가합니다. 환경 변수와 군집 조성 간 관련성, 또는 지리적 거리와 유전적 거리 간 관계 등을 검정할 수 있습니다.',
    outputHighlights: [
      'Mantel 상관계수 (r)',
      '순열 검정 p-value',
      '상관 방법 (Pearson / Spearman)',
    ],
    columns: [
      { label: '지점명 (site) — 데이터셋 1', required: true, example: 'St1, St2, ...' },
      { label: '변수 열 — 데이터셋 1', required: true, example: '종 풍도 또는 환경 값' },
      { label: '지점명 (site) — 데이터셋 2', required: true, example: 'St1, St2, ...' },
      { label: '변수 열 — 데이터셋 2', required: true, example: '환경 값 또는 종 풍도' },
    ],
    // Mantel은 듀얼 CSV — 페이지에서 별도 경로 전달
    relatedTools: ['beta-diversity'],
  },

  // ═══ 수산학 ═════════════════════════════════════

  vbgf: {
    descriptionLong:
      'von Bertalanffy 성장 함수를 비선형 최소제곱법으로 추정합니다. 연령-체장 데이터에서 L∞(이론적 최대 체장), K(성장 계수), t₀(이론적 초기 연령)를 산출합니다.',
    outputHighlights: [
      '성장 곡선 (관측값 + 적합 곡선)',
      '파라미터 추정치 (L∞, K, t₀)',
      'R², RMSE 적합도 지표',
    ],
    columns: [
      { label: '연령 (age)', required: true, example: '1, 2, 3, 4, ...' },
      { label: '체장 (length)', required: true, example: '12.5, 18.3, 23.1, ...' },
    ],
    exampleDataPath: '/example-data/vbgf.csv',
    relatedTools: ['length-weight'],
  },

  'length-weight': {
    descriptionLong:
      '체장-체중 관계식(W = aL^b)을 로그 변환 선형회귀로 추정합니다. b값으로 성장 유형(등성장/이성장)을 판정하고, log-log 산점도로 관계를 시각화합니다.',
    outputHighlights: [
      'log-log 산점도 + 회귀선',
      '파라미터 추정치 (a, b) + 95% CI',
      '성장 유형 판정 (등성장/양의 이성장/음의 이성장)',
      'R² 적합도',
    ],
    columns: [
      { label: '체장 (length)', required: true, example: '12.5, 18.3, 23.1, ...' },
      { label: '체중 (weight)', required: true, example: '18.3, 65.2, 125.6, ...' },
    ],
    exampleDataPath: '/example-data/length-weight.csv',
    relatedTools: ['condition-factor', 'vbgf'],
  },

  'condition-factor': {
    descriptionLong:
      '체장과 체중 데이터로 Fulton\'s K 비만도 지수를 계산합니다. 종 내 개체 간 건강 상태를 비교하고, 그룹별 차이를 통계적으로 검정합니다.',
    outputHighlights: [
      '개체별 K 지수 분포 히스토그램',
      '기술통계 (평균, SD, 중앙값, 범위)',
      '그룹별 비교 + t-test/ANOVA',
    ],
    columns: [
      { label: '체장 (length)', required: true, example: '12.5, 18.3, 23.1, ...' },
      { label: '체중 (weight)', required: true, example: '18.3, 65.2, 125.6, ...' },
      { label: '그룹 (group)', required: false, example: '수컷, 암컷, ...' },
    ],
    exampleDataPath: '/example-data/condition-factor.csv',
    relatedTools: ['length-weight'],
  },

  // ═══ 유전학 ═════════════════════════════════════

  'hardy-weinberg': {
    descriptionLong:
      'Hardy-Weinberg 평형 검정을 수행합니다. 관측된 유전자형 빈도가 기대 빈도와 유의하게 다른지 chi-square 및 exact test로 검정하여 집단의 진화적 평형 상태를 평가합니다.',
    outputHighlights: [
      '대립유전자 빈도 (p, q)',
      '관측 vs 기대 유전자형 빈도 비교',
      'chi-square + exact test p-value',
      '유전자좌별 상세 결과 (다중 좌위)',
    ],
    columns: [
      { label: '유전자좌 (locus)', required: true, example: 'Locus1, Locus2, ...' },
      { label: 'AA 빈도', required: true, example: '45, 32, ...' },
      { label: 'Aa 빈도', required: true, example: '40, 48, ...' },
      { label: 'aa 빈도', required: true, example: '15, 20, ...' },
    ],
    exampleDataPath: '/example-data/hardy-weinberg.csv',
    relatedTools: ['fst'],
  },

  'species-validation': {
    descriptionLong:
      '학명의 유효성을 외부 분류 데이터베이스와 대조하여 검증합니다. 국명 매핑, 법적 보호종 확인, 분류 체계 정리를 자동화합니다.',
    outputHighlights: [
      '학명 유효성 판정',
      '국명 자동 매핑',
      '법적 보호종 여부 확인',
    ],
    columns: [
      { label: '학명 (species)', required: true, example: 'Pagrus major, ...' },
    ],
  },

  fst: {
    descriptionLong:
      'Wright\'s Fixation Index(Fst)를 계산하여 집단 간 유전적 분화 정도를 정량화합니다. 대립유전자 빈도 또는 개체별 유전자형 데이터로 분석할 수 있습니다.',
    outputHighlights: [
      '전체 Fst 값 + 분화 수준 판정 (Wright 1978)',
      '쌍별(pairwise) Fst 행렬',
      '유전자좌별 Fst (다중 좌위)',
    ],
    columns: [
      { label: '개체 ID (individual)', required: true, example: 'ind01, ind02, ...' },
      { label: '집단 (population)', required: true, example: 'PopA, PopB, ...' },
      { label: '유전자좌 (locus)', required: true, example: 'A/B, A/A, B/B, ...' },
    ],
    exampleDataPath: '/example-data/fst-genotypes.csv',
    relatedTools: ['hardy-weinberg'],
  },

  // ═══ 방법론 ═════════════════════════════════════

  'meta-analysis': {
    descriptionLong:
      '여러 연구의 효과크기를 통합하여 전체 효과를 추정합니다. 고정효과/랜덤효과 모형을 지원하며, Forest Plot과 이질성 지표(I², Q, tau²)를 제공합니다.',
    outputHighlights: [
      'Forest Plot (개별 + 통합 효과크기)',
      '통합 효과크기 + 95% CI',
      '이질성 지표 (I², Q-test, tau²)',
    ],
    columns: [
      { label: '연구명 (study)', required: true, example: 'Kim 2020, Lee 2021, ...' },
      { label: '효과크기 (effect_size)', required: true, example: '0.45, 0.32, ...' },
      { label: '표준오차 (se)', required: true, example: '0.12, 0.08, ...' },
    ],
    exampleDataPath: '/example-data/meta-analysis.csv',
  },

  'roc-auc': {
    descriptionLong:
      '이진 분류 모형의 진단 성능을 ROC 곡선과 AUC로 평가합니다. 최적 임계값(Youden\'s J)을 자동 산출하고, 민감도-특이도 균형을 시각화합니다.',
    outputHighlights: [
      'ROC 곡선 (AUC 면적 표시)',
      'AUC 값 + 95% CI',
      '최적 임계값 + 민감도/특이도',
      '성능 판정 (Poor/Fair/Good/Excellent)',
    ],
    columns: [
      { label: '실제 라벨 (actual)', required: true, example: '0, 1, 1, 0, ...' },
      { label: '예측 확률 (predicted)', required: true, example: '0.12, 0.87, 0.65, ...' },
    ],
    exampleDataPath: '/example-data/roc-auc.csv',
  },

  icc: {
    descriptionLong:
      '급내상관계수(ICC)를 계산하여 평가자 간 또는 측정 반복 간 일치도를 정량화합니다. ICC(1,1), ICC(2,1), ICC(3,1) 유형을 지원하며, 신뢰구간과 해석 기준을 함께 제공합니다.',
    outputHighlights: [
      'ICC 값 + 95% CI',
      '일치도 판정 (poor/fair/good/excellent)',
      '시각적 게이지 차트',
    ],
    columns: [
      { label: '대상 (subject)', required: true, example: 'S1, S2, S3, ...' },
      { label: '평가자 측정값 (rater)', required: true, example: '3.5, 4.0, 3.8, ...' },
    ],
    exampleDataPath: '/example-data/icc.csv',
  },

  survival: {
    descriptionLong:
      'Kaplan-Meier 생존 곡선을 추정하고 Log-rank 검정으로 그룹 간 생존율 차이를 검정합니다. 중도절단 데이터를 처리하며, 중앙 생존 시간과 95% 신뢰구간을 제공합니다.',
    outputHighlights: [
      'Kaplan-Meier 생존 곡선 (CI 밴드 포함)',
      'Log-rank 검정 p-value',
      '그룹별 중앙 생존 시간',
      '사건/중도절단 수 요약',
    ],
    columns: [
      { label: '시간 (time)', required: true, example: '5, 12, 23, ...' },
      { label: '사건 (event)', required: true, example: '1=사건, 0=중도절단' },
      { label: '그룹 (group)', required: false, example: '처리, 대조, ...' },
    ],
    exampleDataPath: '/example-data/survival.csv',
  },
}

// ─── 접근 함수 ────────────────────────────────────

export function getBioToolMeta(id: string): BioToolExtendedMeta | undefined {
  return META[id]
}
