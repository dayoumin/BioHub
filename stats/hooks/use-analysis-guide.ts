import { useMemo } from 'react'
import {
  STATISTICAL_METHOD_REQUIREMENTS,
  type StatisticalMethodRequirements
} from '@/lib/statistics/variable-requirements'
import { createAssumptionItems, type AssumptionItem } from '@/components/statistics/common/AssumptionChecklist'

/**
 * 통계 가정에 대한 확인 방법 및 위반 시 대안 매핑
 *
 * 모든 통계 메서드에서 공통으로 사용되는 가정들에 대한 설명을 중앙 관리
 */
const ASSUMPTION_HOW_TO_CHECK: Record<string, string> = {
  // 정규성 관련
  '정규성': 'Shapiro-Wilk 검정 또는 Q-Q plot으로 확인 (p > 0.05이면 정규성 가정 충족)',
  '차이값의 정규성': '차이값(before - after)에 대해 Shapiro-Wilk 검정 수행',
  '잔차의 정규성': '잔차에 대한 Q-Q plot 또는 Shapiro-Wilk 검정',
  '다변량 정규성': 'Mardia 검정 또는 각 변수별 정규성 검정',

  // 등분산성 관련
  '등분산성': "Levene's 검정으로 확인 (p > 0.05이면 등분산 가정 충족)",
  '분산의 동질성': "Levene's 또는 Bartlett 검정으로 확인",
  '구형성': "Mauchly's 구형성 검정 (p > 0.05이면 구형성 가정 충족)",

  // 독립성 관련
  '독립성': '데이터 수집 과정 확인 - 각 관측치가 독립적으로 수집되었는지',
  '관측값 독립성': '시간적, 공간적 자기상관 없는지 확인',
  '독립 시행': '각 시행이 서로 영향을 주지 않는지 확인',
  '그룹 간 독립성': '각 그룹의 데이터가 서로 독립적인지 확인',

  // 선형성 관련
  '선형성': '산점도로 변수 간 선형 관계 확인',
  '선형 관계': '산점도 및 잔차 플롯으로 확인',

  // 기타
  '이진 결과 (성공/실패)': '결과가 정확히 두 가지 범주로 구분되는지 확인',
  '일정한 성공 확률': '모든 시행에서 성공 확률이 동일한지 확인',
  '순서형 데이터': '데이터가 순서를 가진 범주형인지 확인',
  '연속형 데이터': '데이터가 연속형(비율/등간 척도)인지 확인',
  '최소 기대빈도': '각 셀의 기대빈도가 5 이상인지 확인',
  '단조 관계': '산점도로 단조 증가/감소 관계 확인',
  '이상치 없음': '박스플롯 또는 IQR 방법으로 이상치 탐지',
  '다중공선성 없음': 'VIF(분산팽창인자) 확인 - VIF < 10 권장',
  '자기상관 없음': 'Durbin-Watson 검정 (값이 2에 가까우면 자기상관 없음)',
  '충분한 표본 크기': '검정력 분석으로 필요 표본 크기 확인',
}

const ASSUMPTION_IF_VIOLATED: Record<string, string> = {
  // 정규성 관련
  '정규성': '비모수 검정 사용 (Mann-Whitney U, Wilcoxon, Kruskal-Wallis 등)',
  '차이값의 정규성': 'Wilcoxon 부호순위 검정 사용',
  '잔차의 정규성': '일반화 선형 모형(GLM) 또는 변환(로그, 제곱근) 고려',
  '다변량 정규성': '표본 크기 증가 또는 비모수 방법 사용',

  // 등분산성 관련
  '등분산성': 'Welch t-검정 또는 Welch ANOVA 사용 (등분산 가정 불필요)',
  '분산의 동질성': 'Welch 보정 또는 비모수 검정 사용',
  '구형성': 'Greenhouse-Geisser 또는 Huynh-Feldt 보정 적용',

  // 독립성 관련
  '독립성': '반복측정 설계, 혼합 모형, 또는 군집 분석 고려',
  '관측값 독립성': '시계열 분석 또는 공간 분석 모형 사용',
  '독립 시행': '군집 데이터의 경우 다른 검정 방법 고려',
  '그룹 간 독립성': '대응표본 검정 또는 혼합효과 모형 사용',

  // 선형성 관련
  '선형성': '비선형 회귀 또는 다항회귀 고려',
  '선형 관계': '변수 변환 또는 비선형 모형 사용',

  // 기타
  '이진 결과 (성공/실패)': '다항 결과의 경우 카이제곱 검정 또는 다항 로지스틱 회귀 사용',
  '일정한 성공 확률': '확률이 변하는 경우 시계열 분석 또는 혼합 모형 고려',
  '순서형 데이터': '순서형 로지스틱 회귀 또는 비모수 검정 사용',
  '연속형 데이터': '범주화 후 카이제곱 검정 또는 순위 기반 검정',
  '최소 기대빈도': 'Fisher 정확 검정 사용 (소표본에 적합)',
  '단조 관계': 'Pearson 상관 대신 Spearman 순위상관 사용',
  '이상치 없음': '강건 회귀(Robust regression) 또는 이상치 제거 후 분석',
  '다중공선성 없음': '변수 제거, 주성분 회귀, 또는 Ridge/Lasso 회귀 사용',
  '자기상관 없음': '일반화 최소제곱(GLS) 또는 ARIMA 모형 사용',
  '충분한 표본 크기': '더 많은 데이터 수집 또는 효과크기 재검토',
}

export interface UseAnalysisGuideOptions {
  /** 정적 메서드 ID (단일 메서드 페이지) */
  methodId?: string
  /** 동적 메서드 ID getter (통합 페이지에서 선택된 유형에 따라) */
  getMethodId?: () => string | null
  /** 추가 howToCheck 매핑 (페이지별 커스텀) */
  customHowToCheck?: Record<string, string>
  /** 추가 ifViolated 매핑 (페이지별 커스텀) */
  customIfViolated?: Record<string, string>
}

export interface UseAnalysisGuideResult {
  /** 메서드 메타데이터 (없으면 null) */
  methodMetadata: StatisticalMethodRequirements | null
  /** 가정 체크리스트 아이템 */
  assumptionItems: AssumptionItem[]
  /** 메서드가 존재하는지 */
  hasMethod: boolean
  /** 확장 메타데이터(dataFormat, settings, sampleData) 존재 여부 */
  hasExtendedMetadata: boolean
}

/**
 * useAnalysisGuide - 분석 가이드 컴포넌트용 통합 hook
 *
 * 모든 통계 페이지에서 일관된 방식으로 가이드 데이터를 로드합니다.
 *
 * @example
 * // 단일 메서드 페이지 (binomial-test)
 * const { methodMetadata, assumptionItems } = useAnalysisGuide({
 *   methodId: 'binomial-test'
 * })
 *
 * @example
 * // 통합 페이지 (t-test) - 동적 메서드 ID
 * const [testType, setTestType] = useState<'one-sample' | 'two-sample' | 'paired'>('')
 * const { methodMetadata, assumptionItems } = useAnalysisGuide({
 *   getMethodId: () => {
 *     const map = { 'one-sample': 'one-sample-t', 'two-sample': 'two-sample-t', 'paired': 'paired-t' }
 *     return testType ? map[testType] : null
 *   }
 * })
 */
export function useAnalysisGuide(options: UseAnalysisGuideOptions): UseAnalysisGuideResult {
  const { methodId, getMethodId, customHowToCheck, customIfViolated } = options

  // 메서드 ID 결정 (정적 또는 동적)
  const resolvedMethodId = useMemo(() => {
    if (methodId) return methodId
    if (getMethodId) return getMethodId()
    return null
  }, [methodId, getMethodId])

  // 메서드 메타데이터 조회
  const methodMetadata = useMemo(() => {
    if (!resolvedMethodId) return null
    return STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === resolvedMethodId) || null
  }, [resolvedMethodId])

  // 가정 체크리스트 아이템 생성
  const assumptionItems = useMemo(() => {
    if (!methodMetadata || !methodMetadata.assumptions.length) return []

    // 전역 매핑과 커스텀 매핑 병합
    const howToCheckMap = { ...ASSUMPTION_HOW_TO_CHECK, ...customHowToCheck }
    const ifViolatedMap = { ...ASSUMPTION_IF_VIOLATED, ...customIfViolated }

    return createAssumptionItems(methodMetadata.assumptions, {
      importance: 'important',
      howToCheckMap,
      ifViolatedMap
    })
  }, [methodMetadata, customHowToCheck, customIfViolated])

  // 확장 메타데이터 존재 여부
  const hasExtendedMetadata = useMemo(() => {
    if (!methodMetadata) return false
    return !!(methodMetadata.dataFormat || methodMetadata.settings || methodMetadata.sampleData)
  }, [methodMetadata])

  return {
    methodMetadata,
    assumptionItems,
    hasMethod: !!methodMetadata,
    hasExtendedMetadata
  }
}

/**
 * 통합 페이지용 메서드 ID 매핑
 *
 * 페이지에서 선택된 분석 유형을 메서드 ID로 변환
 */
export const INTEGRATED_PAGE_METHOD_MAPS = {
  // t-test 페이지
  tTest: {
    'one-sample': 'one-sample-t',
    'two-sample': 'two-sample-t',
    'paired': 'paired-t'
  } as Record<string, string>,

  // regression 페이지
  regression: {
    'simple': 'simple-regression',
    'multiple': 'multiple-regression',
    'logistic': 'logistic-regression'
  } as Record<string, string>,

  // anova 페이지
  anova: {
    'one-way': 'one-way-anova',
    'two-way': 'two-way-anova',
    'three-way': 'three-way-anova'
  } as Record<string, string>,

  // correlation 페이지
  correlation: {
    'pearson': 'pearson-correlation',
    'spearman': 'spearman-correlation',
    'kendall': 'kendall-correlation'
  } as Record<string, string>,

  // chi-square 페이지
  chiSquare: {
    'independence': 'chi-square-independence',
    'goodness': 'chi-square-goodness'
  } as Record<string, string>
}
