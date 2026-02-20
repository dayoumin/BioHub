/**
 * 도메인별 예시 변수 중앙 관리 (Domain Examples Central Repository)
 *
 * @description
 * 통계 플랫폼 전체에서 사용하는 예시 변수명과 설명을 중앙화하여 관리합니다.
 * 수산과학을 기본 도메인으로 하되, 일반 도메인 fallback을 제공합니다.
 *
 * @version 1.0
 * @since 2025-11-24
 *
 * @usage
 * ```typescript
 * import { getExample, STATISTICS_EXAMPLES } from '@/lib/constants/domain-examples'
 *
 * // 단일 예시
 * const example = getExample('continuous', 'physical', 1) // → "체중_g"
 *
 * // 통계 방법별 예시
 * const { dependent, factor } = STATISTICS_EXAMPLES.oneWayAnova
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

export type DomainType = 'fisheries' | 'medical' | 'education' | 'general';

// ─────────────────────────────────────────────────────────────────────────────
// 도메인별 예시 상수
// ─────────────────────────────────────────────────────────────────────────────

export const DOMAIN_EXAMPLES = {
  // 🐟 수산과학 (기본 도메인)
  fisheries: {
    // 연속형 변수
    continuous: {
      // 생리 측정
      physical: ['체중_g', '체장_cm', '전장_cm', '비만도'],

      // 환경 변수
      environment: ['수온_C', '염분도_ppt', 'pH', '용존산소_mg_L', '탁도_NTU', '암모니아_mg_L'],

      // 사료 및 영양
      nutrition: ['사료섭취량_g', '단백질함량_%', '지질함량_%', '회분함량_%'],

      // 생산성 지표
      production: ['생산량_kg', '생존율_%', '사료효율_FCR', '증육률_%', '생장률_%_day'],

      // 생화학 지표
      biochemical: ['간중량지수_HSI', '생식소중량지수_GSI', '혈당_mg_dL', '총단백질_g_dL'],
    },

    // 범주형 변수
    categorical: {
      // 어종
      species: ['넙치', '조피볼락', '전복', '참돔', '방어', '돌돔', '감성돔'],

      // 처리구/실험군
      treatment: ['사료종류_A', '사료종류_B', '사료종류_C', '대조구', '실험구'],

      // 장소
      location: ['양식장_1', '양식장_2', '양식장_3', '수조_A', '수조_B', '해역_동해', '해역_서해'],

      // 품질 등급
      quality: ['품질등급_상', '품질등급_중', '품질등급_하', '선도_A', '선도_B'],

      // 성별/연령
      bio: ['성별_암', '성별_수', '연령_1년생', '연령_2년생'],
    },

    // ID/식별자
    id: ['개체번호', '수조번호', '측정일자', 'Fish_ID', 'Tank_ID'],
  },

  // 🏥 의료 (보조 도메인)
  medical: {
    continuous: {
      vital: ['혈압_mmHg', '체온_C', '맥박_bpm', '혈당_mg_dL'],
      outcome: ['회복시간_일', '효과점수', '부작용점수', '만족도'],
    },
    categorical: {
      treatment: ['치료법_A', '치료법_B', '약물', '물리치료', '수술'],
      status: ['중증도_경증', '중증도_중증', '중증도_위중', '완치', '호전', '악화'],
    },
    id: ['환자ID', '진료일자', 'Patient_ID'],
  },

  // 📚 교육 (보조 도메인)
  education: {
    continuous: {
      performance: ['점수', '성적', '학습시간_분', '출석률_%'],
    },
    categorical: {
      group: ['학년_1', '학년_2', '학년_3', '반_A', '반_B', '반_C'],
      level: ['학력_초졸', '학력_중졸', '학력_고졸', '학력_대졸'],
    },
    id: ['학생ID', 'Student_ID'],
  },

  // 🌐 일반 (추상적 - 도메인 중립)
  general: {
    continuous: {
      generic: ['측정값_1', '측정값_2', '수치_X', '수치_Y', '변수_A', '변수_B'],
    },
    categorical: {
      generic: ['그룹_A', '그룹_B', '그룹_C', '범주_1', '범주_2', '유형_X', '유형_Y'],
    },
    id: ['ID', '관측번호', 'Observation_ID'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 도메인별 예시 변수 가져오기 (우선순위 fallback 지원)
 *
 * @param category - 변수 카테고리 ('continuous', 'categorical', 'id')
 * @param subtype - 하위 타입 (예: 'physical', 'environment', 'treatment')
 * @param count - 가져올 예시 개수 (기본값: 1)
 * @param preferredDomain - 우선 도메인 (기본값: 'fisheries')
 * @returns 쉼표로 구분된 예시 문자열
 *
 * @example
 * getExample('continuous', 'physical', 2) // → "체중_g, 체장_cm"
 * getExample('categorical', 'treatment', 1) // → "사료종류_A"
 */
export function getExample(
  category: 'continuous' | 'categorical' | 'id',
  subtype: string,
  count: number = 1,
  preferredDomain: DomainType = 'fisheries'
): string {
  const domain = DOMAIN_EXAMPLES[preferredDomain];

  // 1차: 선호 도메인에서 찾기
  if (category === 'id') {
    const examples = domain.id || [];
    if (examples.length > 0) {
      return examples.slice(0, count).join(', ');
    }
  } else {
    const categoryData = domain[category] as Record<string, string[]> | undefined;
    const examples = categoryData?.[subtype];
    if (examples && examples.length > 0) {
      return examples.slice(0, count).join(', ');
    }
  }

  // 2차: general 도메인으로 fallback
  const generalDomain = DOMAIN_EXAMPLES.general;
  if (category === 'id') {
    return generalDomain.id.slice(0, count).join(', ');
  } else {
    const categoryData = generalDomain[category] as Record<string, string[]> | undefined;
    const examples = categoryData?.generic || ['변수'];
    return examples.slice(0, count).join(', ');
  }
}

/**
 * 여러 예시를 배열로 가져오기
 *
 * @param category - 변수 카테고리
 * @param subtype - 하위 타입
 * @param count - 가져올 예시 개수
 * @param preferredDomain - 우선 도메인
 * @returns 예시 문자열 배열
 *
 * @example
 * getExamplesArray('continuous', 'physical', 3) // → ["체중_g", "체장_cm", "전장_cm"]
 */
export function getExamplesArray(
  category: 'continuous' | 'categorical' | 'id',
  subtype: string,
  count: number = 1,
  preferredDomain: DomainType = 'fisheries'
): string[] {
  const exampleString = getExample(category, subtype, count, preferredDomain);
  return exampleString.split(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// 통계 방법별 예시 프리셋
// ─────────────────────────────────────────────────────────────────────────────

export const STATISTICS_EXAMPLES = {
  // 기술통계
  descriptiveStats: {
    continuous: getExample('continuous', 'physical', 3),
    categorical: getExample('categorical', 'treatment', 1),
    description: '넙치의 체중, 체장, 비만도에 대한 기술통계량을 계산합니다.',
  },

  // 빈도분석
  frequencyTable: {
    categorical: getExample('categorical', 'quality', 2),
    description: '품질등급별 빈도와 비율을 계산합니다.',
  },

  // 교차표
  crossTabulation: {
    row: getExamplesArray('categorical', 'bio', 1)[0], // "성별_암"
    column: getExamplesArray('categorical', 'quality', 1)[0], // "품질등급_상"
    description: '성별과 품질등급 간의 교차분석을 수행합니다.',
  },

  // 독립표본 t-검정
  independentTTest: {
    dependent: getExample('continuous', 'physical', 1), // "체중_g"
    factor: getExamplesArray('categorical', 'bio', 1)[0], // "성별_암"
    description: '암컷과 수컷 넙치의 평균 체중 차이를 검정합니다.',
  },

  // 대응표본 t-검정
  pairedTTest: {
    variables: ['사전체중_g', '사후체중_g'],
    description: '동일 개체의 사료 급이 전후 체중 변화를 분석합니다.',
  },

  // 일원분산분석
  oneWayAnova: {
    dependent: getExample('continuous', 'physical', 1), // "체중_g"
    factor: getExample('categorical', 'treatment', 1), // "사료종류_A"
    description: '사료 종류(A, B, C)가 넙치 체중에 미치는 영향을 분석합니다.',
  },

  // 이원분산분석
  twoWayAnova: {
    dependent: getExample('continuous', 'physical', 1), // "체중_g"
    factors: [
      getExamplesArray('categorical', 'treatment', 1)[0], // "사료종류_A"
      getExamplesArray('categorical', 'bio', 1)[0], // "성별_암"
    ],
    description: '사료 종류와 성별이 넙치 체중에 미치는 영향을 분석합니다.',
  },

  // 공분산분석
  ancova: {
    dependent: getExample('continuous', 'physical', 1), // "체중_g"
    factor: getExample('categorical', 'treatment', 1), // "사료종류_A"
    covariate: '초기체중_g',
    description: '초기 체중을 통제한 상태에서 사료 종류가 최종 체중에 미치는 영향을 분석합니다.',
  },

  // 상관분석
  correlation: {
    variables: getExample('continuous', 'environment', 3), // "수온_C, 염분도_ppt, pH"
    description: '수온, 염분도, pH 간의 선형 관계를 분석합니다.',
  },

  // 단순회귀분석
  simpleRegression: {
    dependent: getExample('continuous', 'production', 1), // "생산량_kg"
    independent: getExamplesArray('continuous', 'nutrition', 1)[0], // "사료섭취량_g"
    description: '사료 섭취량으로 생산량을 예측합니다.',
  },

  // 다중회귀분석
  multipleRegression: {
    dependent: getExample('continuous', 'production', 1), // "생산량_kg"
    independent: getExample('continuous', 'nutrition', 2), // "사료섭취량_g, 단백질함량_%"
    description: '사료 섭취량과 단백질 함량으로 생산량을 예측합니다.',
  },

  // 로지스틱 회귀분석
  logisticRegression: {
    dependent: '생존여부',
    independent: getExample('continuous', 'environment', 2), // "수온_C, 염분도_ppt"
    description: '수온과 염분도로 넙치 생존 여부를 예측합니다.',
  },

  // Mann-Whitney U 검정
  mannWhitneyU: {
    dependent: getExample('continuous', 'physical', 1), // "체중_g"
    factor: getExamplesArray('categorical', 'bio', 1)[0], // "성별_암"
    description: '정규성을 가정하지 않고 암수 간 체중 차이를 검정합니다.',
  },

  // Kruskal-Wallis 검정
  kruskalWallis: {
    dependent: getExample('continuous', 'physical', 1), // "체중_g"
    factor: getExample('categorical', 'treatment', 1), // "사료종류_A"
    description: '정규성을 가정하지 않고 사료 종류 간 체중 차이를 검정합니다.',
  },

  // 카이제곱 독립성 검정
  chiSquareIndependence: {
    row: getExamplesArray('categorical', 'bio', 1)[0], // "성별_암"
    column: getExamplesArray('categorical', 'quality', 1)[0], // "품질등급_상"
    description: '성별과 품질등급 간의 독립성을 검정합니다.',
  },

  // 반복측정 ANOVA
  repeatedMeasuresAnova: {
    dependent: getExample('continuous', 'physical', 1), // "체중_g"
    within: ['측정일_1일', '측정일_7일', '측정일_14일', '측정일_21일'],
    description: '4주간 측정 시점별 넙치 체중 변화를 분석합니다.',
  },

  // MANOVA
  manova: {
    dependent: getExample('continuous', 'physical', 2), // "체중_g, 체장_cm"
    factor: getExample('categorical', 'treatment', 1), // "사료종류_A"
    description: '사료 종류가 체중과 체장에 동시에 미치는 영향을 분석합니다.',
  },

  // 판별분석
  discriminantAnalysis: {
    factor: getExample('categorical', 'quality', 1), // "품질등급_상"
    predictors: getExample('continuous', 'physical', 3), // "체중_g, 체장_cm, 비만도"
    description: '체중, 체장, 비만도로 품질등급을 예측합니다.',
  },

  // 군집분석
  clustering: {
    variables: getExample('continuous', 'physical', 3), // "체중_g, 체장_cm, 비만도"
    description: '체중, 체장, 비만도를 기준으로 넙치를 군집화합니다.',
  },

  // 주성분분석
  pca: {
    variables: getExample('continuous', 'environment', 4), // "수온_C, 염분도_ppt, pH, 용존산소_mg_L"
    description: '환경 변수들의 주요 패턴을 추출합니다.',
  },

  // 신뢰도 분석
  reliabilityAnalysis: {
    items: ['만족도_1', '만족도_2', '만족도_3', '만족도_4'],
    description: '만족도 척도의 내적 일관성(Cronbach\'s α)을 검증합니다.',
  },

  // 시계열 분석
  timeSeries: {
    variable: getExample('continuous', 'production', 1), // "생산량_kg"
    time: '측정월',
    description: '월별 생산량의 시계열 패턴을 분석합니다.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default STATISTICS_EXAMPLES;