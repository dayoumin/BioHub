/**
 * 통계 상담 서비스
 *
 * 사용자의 자연어 질문에서 키워드를 추출하여
 * purpose-categories.ts의 카테고리를 매칭하고,
 * statistical-methods.ts에서 추천 메서드를 반환.
 *
 * 매칭 2단계:
 * 1차: 카테고리 키워드 + 소속 메서드 키워드 → 후보 카테고리 선정
 * 2차: 메서드별 키워드 → 카테고리 내 메서드 우선순위 결정
 * 3차: 동점 감지 → 카테고리 간 + 카테고리 내 모두 clarification 생성
 *
 * 데이터 소스:
 * - PURPOSE_CATEGORIES (purpose-categories.ts) — 카테고리 + 키워드
 * - STATISTICAL_METHODS (statistical-methods.ts) — canonical 메서드 정보
 * - METHOD_KEYWORDS (이 파일) — 메서드별 2차 매칭 키워드
 *
 * 새 ID 매핑을 만들지 않음 → 드리프트 방지
 */

import { PURPOSE_CATEGORIES } from '@/lib/constants/purpose-categories'
import { STATISTICAL_METHODS, getKoreanDescription } from '@/lib/constants/statistical-methods'
import type { MethodRecommendation, ConsultantResponse, ClarificationQuestion, ClarificationOption } from '@/types/analysis'

interface CategoryScore {
  categoryId: string
  score: number
  matchedKeywords: string[]
}

interface MethodScore {
  methodId: string
  score: number
  matchedKeywords: string[]
  originalIndex: number
}

/**
 * 메서드별 2차 매칭 키워드
 *
 * 카테고리 매칭 후 카테고리 내에서 메서드 우선순위를 결정.
 * 키워드가 없는 메서드는 원래 순서(methodIds 배열 순서) 유지.
 *
 * 키워드 설계 원칙:
 * - 2글자 이상 (1글자 한글 오탐 위험)
 * - 다른 맥락에서 흔히 쓰이는 일반 단어 회피 ("하나", "통제", "반응" 등)
 * - 복합어 우선 ("단일표본", "공변량 통제" 등)
 */
export const METHOD_KEYWORDS: Record<string, string[]> = {
  // --- 그룹 비교 (compare) ---
  'two-sample-t': ['독립표본', '두 그룹', '두 집단', '실험군', '대조군', 'independent sample', 'two group'],
  'welch-t': ['등분산', '분산 다른', 'welch', 'unequal variance'],
  'one-sample-t': ['단일표본', '모집단 평균', 'one sample', 'population mean'],
  'paired-t': ['전후', '전/후', '사전사후', '사전/사후', '대응표본', 'paired', 'before after', 'pre post', 'matched'],
  'one-way-anova': ['세 그룹', '3개 그룹', '세 집단', '여러 그룹', 'three group', 'multiple group', '등분산 없', 'welch anova'],
  'repeated-measures-anova': ['반복측정', '반복 측정', '여러 시점', 'repeated measure', 'within subject'],
  'ancova': ['공변량', '공분산분석', 'covariate', 'ancova'],
  'manova': ['다변량 분산', '여러 종속', 'manova', 'multiple dependent'],
  'mixed-model': ['혼합효과', '랜덤효과', '고정효과', 'mixed effect', 'random effect', 'hierarchical'],
  'mann-whitney': ['비모수 독립', '비모수 두', '비모수', '비정규', '정규분포 아닌', 'nonparametric', 'non-normal', 'mann-whitney'],
  'wilcoxon-signed-rank': ['비모수 대응', '비모수 전후', '비모수 사전', '비모수 사후', '비모수', '부호순위', 'wilcoxon', 'signed rank'],
  'kruskal-wallis': ['비모수 세 그룹', '비모수 여러', 'kruskal'],
  'friedman': ['비모수 반복', 'friedman'],
  'sign-test': ['부호검정', 'sign test'],
  'mood-median': ['중앙값 검정', 'mood', 'median test'],
  'means-plot': ['평균 도표', '평균 그래프', '평균 플롯', 'means plot'],

  // --- 관계/연관성 (relationship) ---
  'pearson-correlation': ['상관', '피어슨', '스피어만', 'pearson', 'spearman'],
  'partial-correlation': ['편상관', '통제 상관', 'partial correlation', 'controlling for'],
  'chi-square-independence': ['카이제곱', '독립성', '교차표', '빈도표', 'chi-square', 'cross tab', 'contingency'],
  'mcnemar': ['맥니마', '이분 대응', 'mcnemar'],
  'cochran-q': ['코크란', 'cochran'],

  // --- 예측 모델링 (prediction) ---
  'simple-regression': ['선형 회귀', '단순 회귀', '다중 회귀', 'linear regression', 'multiple regression'],
  'logistic-regression': ['로지스틱', '이분 분류', '이항 분류', 'logistic', 'binary classification'],
  'poisson-regression': ['포아송', '빈도 데이터', '건수 데이터', 'poisson', 'count data'],
  'ordinal-regression': ['순서형 회귀', '서열 회귀', 'ordinal regression'],
  'stepwise-regression': ['단계적 회귀', '변수 선택', 'stepwise', 'variable selection'],
  'dose-response': ['용량 반응', 'dose response', 'dose-response'],
  'response-surface': ['반응 표면', 'response surface', 'rsm'],

  // --- 분포/기술통계 (descriptive) ---
  'descriptive-stats': ['기술통계', '요약 통계', 'descriptive', 'summary statistics'],
  'normality-test': ['정규성', '정규분포', '샤피로', 'normality', 'shapiro', 'normal distribution'],
  'explore-data': ['탐색적', '데이터 탐색', 'explore', 'eda'],
  'binomial-test': ['이항검정', '성공 확률', 'binomial test'],
  'runs-test': ['런 검정', '무작위성', 'runs test', 'randomness test'],
  'kolmogorov-smirnov': ['분포 적합', 'kolmogorov', 'ks test'],
  'chi-square-goodness': ['적합도 검정', '기대빈도', 'goodness of fit'],
  'one-sample-proportion': ['비율 검정', 'proportion test'],

  // --- 시계열 (timeseries) ---
  'arima': ['arima', '자기회귀', '이동평균 모형', 'autoregressive'],
  'seasonal-decompose': ['계절 분해', '계절성', 'seasonal decompose'],
  'stationarity-test': ['정상성', '단위근', 'stationarity', 'unit root', 'adf'],
  'mann-kendall-test': ['추세 검정', 'mann-kendall', 'trend test'],

  // --- 생존 분석 (survival) ---
  'kaplan-meier': ['카플란', '생존 곡선', 'kaplan', 'survival curve'],
  'cox-regression': ['콕스', '위험비', 'cox', 'hazard ratio'],
  'roc-curve': ['roc', 'auc', '민감도 특이도', 'sensitivity specificity'],

  // --- 다변량 (multivariate) ---
  'pca': ['주성분', '차원 축소', 'pca', 'principal component'],
  'factor-analysis': ['요인 분석', '잠재 변수', 'factor analysis', 'latent'],
  'cluster': ['군집 분석', '클러스터', '그룹핑', 'cluster', 'k-means'],
  'discriminant-analysis': ['판별 분석', '판별 함수', 'discriminant', 'lda'],

  // --- 측정/설계 (tools) ---
  'power-analysis': ['검정력', '표본 크기', '표본수', 'power analysis', 'sample size'],
  'reliability-analysis': ['신뢰도', '크론바흐', '알파 계수', 'reliability', 'cronbach'],
}

/**
 * 사용자 메시지에서 목적 카테고리를 매칭하고 추천 메서드를 반환
 *
 * @param message 사용자 입력 텍스트
 * @param maxRecommendations 최대 추천 수 (기본 3)
 */
export function getRecommendations(
  message: string,
  maxRecommendations = 3,
): ConsultantResponse {
  const normalizedMessage = message.toLowerCase().trim()

  if (!normalizedMessage) {
    return { recommendations: [], summary: undefined }
  }

  // 1. 각 카테고리의 키워드 매칭 점수 계산
  //    카테고리 자체 키워드 + 소속 메서드의 METHOD_KEYWORDS 매칭을 합산
  const scores: CategoryScore[] = PURPOSE_CATEGORIES
    .filter(cat => !cat.disabled && cat.methodIds.length > 0)
    .map(cat => {
      const matchedKeywords = cat.keywords.filter(kw =>
        normalizedMessage.includes(kw.toLowerCase())
      )

      // 소속 메서드의 METHOD_KEYWORDS에서 매칭되는 것이 있으면 카테고리 점수에 가산
      let methodKeywordBonus = 0
      for (const methodId of cat.methodIds) {
        const kws = METHOD_KEYWORDS[methodId]
        if (!kws) continue
        if (kws.some(kw => normalizedMessage.includes(kw.toLowerCase()))) {
          methodKeywordBonus = 1
          break
        }
      }

      return {
        categoryId: cat.id,
        score: matchedKeywords.length + methodKeywordBonus,
        matchedKeywords,
      }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    return { recommendations: [], summary: undefined }
  }

  // 2. 각 카테고리의 메서드 점수를 미리 계산 (추천 + 동점 감지 양쪽에서 재사용)
  const methodScoresPerCategory = new Map<string, MethodScore[]>()
  for (const { categoryId } of scores) {
    const category = PURPOSE_CATEGORIES.find(c => c.id === categoryId)
    if (!category) continue

    const dedupedMethodScores = new Map<string, MethodScore>()

    category.methodIds.forEach((rawMethodId, idx) => {
      const methodId = canonicalizeMethodIdForMessage(rawMethodId, normalizedMessage)
      const keywords = METHOD_KEYWORDS[rawMethodId]
      if (!keywords) {
        if (!dedupedMethodScores.has(methodId)) {
          dedupedMethodScores.set(methodId, { methodId, score: 0, matchedKeywords: [], originalIndex: idx })
        }
        return
      }

      const matched = keywords.filter(kw =>
        normalizedMessage.includes(kw.toLowerCase())
      )

      const existing = dedupedMethodScores.get(methodId)
      if (!existing || matched.length > existing.score) {
        dedupedMethodScores.set(methodId, {
          methodId,
          score: matched.length,
          matchedKeywords: matched,
          originalIndex: idx,
        })
      }
    })

    const methodScores: MethodScore[] = Array.from(dedupedMethodScores.values())
      .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)

    methodScoresPerCategory.set(categoryId, methodScores)
  }

  // 2.5 카테고리 동점 시 최고 메서드 점수로 재정렬
  //     "교차표 비교" → compare(cat 1, method 0) vs relationship(cat 1, method 1)
  //     → relationship이 먼저 와야 chi-square-independence가 추천됨
  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const bestA = methodScoresPerCategory.get(a.categoryId)?.[0]?.score ?? 0
    const bestB = methodScoresPerCategory.get(b.categoryId)?.[0]?.score ?? 0
    return bestB - bestA
  })

  // 3. 추천 메서드 추출
  const recommendations: MethodRecommendation[] = []
  const usedMethodIds = new Set<string>()

  for (const { categoryId } of scores) {
    if (recommendations.length >= maxRecommendations) break

    const category = PURPOSE_CATEGORIES.find(c => c.id === categoryId)
    if (!category) continue

    const methodScores = methodScoresPerCategory.get(categoryId)
    if (!methodScores) continue

    for (const { methodId } of methodScores) {
      if (recommendations.length >= maxRecommendations) break
      if (usedMethodIds.has(methodId)) continue

      const method = STATISTICAL_METHODS[methodId]
      if (!method) continue

      usedMethodIds.add(methodId)

      const welchContext = isWelchAnovaContext(normalizedMessage, methodId)
      const desc = getKoreanDescription(methodId)
      const reason = welchContext
        ? `등분산 가정 위반에 강건한 일원분산분석 — ${category.label}`
        : desc
          ? `${desc} — ${category.label}`
          : `${category.label} 분야의 분석 방법입니다.`

      recommendations.push({
        methodId,
        methodName: method.name,
        koreanName: welchContext ? 'Welch ANOVA' : method.koreanName ?? method.name,
        reason,
        badge: recommendations.length === 0 ? 'recommended' : 'alternative',
      })
    }
  }

  // 4. 동점 감지 → clarification 생성
  const clarification = detectAmbiguity(scores, methodScoresPerCategory)

  const topCategory = PURPOSE_CATEGORIES.find(c => c.id === scores[0].categoryId)
  const summary = topCategory
    ? buildSummary(topCategory, recommendations)
    : undefined

  return { recommendations, summary, clarification }
}

function isWelchAnovaContext(message: string, methodId: string): boolean {
  if (methodId !== 'one-way-anova') return false

  const welchKeywords = [
    'welch',
    'welch anova',
    '등분산 없',
    '등분산 위반',
    '분산 다른',
    '분산이 다른',
    'unequal variance',
  ]

  return welchKeywords.some(keyword => message.includes(keyword))
}

function canonicalizeMethodIdForMessage(methodId: string, message: string): string {
  if (methodId === 'welch-t' && isMultiGroupComparisonContext(message)) {
    return 'one-way-anova'
  }

  return methodId
}

function isMultiGroupComparisonContext(message: string): boolean {
  const multiGroupKeywords = [
    '세 그룹',
    '3개 그룹',
    '세 집단',
    '여러 그룹',
    '여러 집단',
    'three group',
    'multiple group',
  ]

  return multiGroupKeywords.some(keyword => message.includes(keyword))
}

/**
 * 동점 감지: 카테고리 간 + 카테고리 내 모두 확인
 *
 * 카테고리 간: 상위 2개 카테고리 점수가 같고 각각 1위 메서드가 다르면 모호
 * 카테고리 내: 1위 카테고리 안에서 동점 메서드가 2개 이상이면 모호
 */
function detectAmbiguity(
  categoryScores: CategoryScore[],
  methodScoresPerCategory: Map<string, MethodScore[]>
): ClarificationQuestion | undefined {
  // A. 카테고리 간 동점 감지
  if (categoryScores.length >= 2) {
    const [cat1, cat2] = categoryScores
    if (cat1.score === cat2.score && cat1.score > 0) {
      const scores1 = methodScoresPerCategory.get(cat1.categoryId)
      const scores2 = methodScoresPerCategory.get(cat2.categoryId)
      const top1 = scores1?.find(m => m.score > 0)
      const top2 = scores2?.find(m => m.score > 0)

      if (top1 && top2 && top1.methodId !== top2.methodId) {
        const label1 = PURPOSE_CATEGORIES.find(c => c.id === cat1.categoryId)?.label
        const label2 = PURPOSE_CATEGORIES.find(c => c.id === cat2.categoryId)?.label
        return buildClarificationFromMethods([
          { ...top1, categoryLabel: label1 },
          { ...top2, categoryLabel: label2 },
        ])
      }
    }
  }

  // B. 카테고리 내 동점 감지 (1위 카테고리에서)
  if (categoryScores.length > 0) {
    const topCatId = categoryScores[0].categoryId
    const topCat = PURPOSE_CATEGORIES.find(c => c.id === topCatId)
    const methodScores = methodScoresPerCategory.get(topCatId)
    if (!topCat || !methodScores) return undefined

    if (methodScores.length >= 2 && methodScores[0].score > 0) {
      const topScore = methodScores[0].score
      const tiedMethods = methodScores.filter(m => m.score === topScore)
      if (tiedMethods.length >= 2) {
        return buildClarificationFromMethods(
          tiedMethods.map(m => ({ ...m, categoryLabel: topCat.label }))
        )
      }
    }
  }

  return undefined
}

/** 한국어 조사 선택: 받침 유무에 따라 을/를 반환 */
function eulReul(word: string): '을' | '를' {
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xAC00 || last > 0xD7A3) return '를' // 한글 범위 밖 (영문 등)
  return (last - 0xAC00) % 28 !== 0 ? '을' : '를'
}

/** 카테고리 + 추천 메서드 기반 요약 문구 생성 */
function buildSummary(
  category: { label: string; description: string },
  recommendations: MethodRecommendation[],
): string {
  const topMethod = recommendations[0]
  if (!topMethod) return `"${category.label}" 분야의 분석 방법을 추천합니다.`

  const name = topMethod.koreanName
  const methodList = recommendations.length > 1
    ? `${name}${eulReul(name)} 포함한 ${recommendations.length}가지 방법`
    : name

  return `"${category.label}" 분야에서 ${methodList}${eulReul(methodList)} 추천합니다.\n${category.description}에 적합한 분석 방법입니다. 데이터를 업로드하면 더 정확한 추천을 받을 수 있습니다.`
}

/** 동점 메서드 목록에서 clarification 질문 생성 */
function buildClarificationFromMethods(
  tiedMethods: Array<MethodScore & { categoryLabel?: string }>
): ClarificationQuestion {
  const options: ClarificationOption[] = []

  for (const m of tiedMethods) {
    const method = STATISTICAL_METHODS[m.methodId]
    if (!method) continue

    const name = method.koreanName ?? method.name
    const desc = method.koreanDescription ?? method.description

    options.push({
      label: m.categoryLabel ? `[${m.categoryLabel}] ${name} — ${desc}` : `${name} — ${desc}`,
      methodId: m.methodId,
    })
  }

  if (options.length === 0) {
    return { question: '비슷한 점수의 메서드입니다.', options: [] }
  }

  return {
    question: '비슷한 점수의 메서드입니다.',
    options,
  }
}
