# 통계적 가정 가이드 (정규성/등분산성/독립성)

## 무엇을 확인하나요?

- 정규성(Normality): 표본(또는 잔차)이 정규분포를 따른다는 가정
  - 사용처: t-검정, ANOVA, 회귀의 잔차 가정 등
  - 대표 검정: Shapiro–Wilk, D’Agostino, Kolmogorov–Smirnov(KS, Lilliefors 상황은 참고용)

- 등분산성(Homoscedasticity): 그룹 간 분산이 같다는 가정
  - 사용처: 독립표본 t-검정(equal var), 일원 ANOVA 등
  - 대표 검정: Levene(권장, 강건), Bartlett(정규성 만족 시 보조), F-test(참고용)

- 독립성(Independence): 관측치(또는 잔차) 간 상관이 없다는 가정
  - 사용처: 회귀, 시계열이 아닌 일반 분석 전반
  - 대표 지표: Durbin–Watson(DW) (잔차 기준 1.5~2.5 권장 구간)

## 우리 앱의 판정 정책(앱 레벨 해석 규칙)

- alpha(유의수준): 기본 0.05. pValue와 비교해 충족 여부를 해석
- normalityRule: 여러 정규성 검정 결과를 통합하는 규칙
  - any(기본): SW/KS/D’Agostino 중 하나라도 p>alpha면 정규성 만족
  - majority: 2/3 이상 통과 시 만족
  - strict: 모두 통과 시 만족
- 등분산성: Levene 결과 중심으로 판단. Bartlett는 보조, F-test는 “참고용”으로만 표기
- 이상치: Grubbs는 정규성 만족 시에만 수행(IQR/Z-score는 항상 가능)

이 규칙은 SciPy/Statsmodels의 내부 계산을 바꾸는 게 아니라, 계산된 p값들을 “제품 관점에서 일관되게” 해석하기 위한 상위 정책입니다.

## 가정 위반 시 자동 대체 추천

- 정규성 위반/소표본: Mann–Whitney U(2그룹), Kruskal–Wallis(다그룹), Permutation Test 고려
- 이분산: Welch t-test/ANOVA, 사후에는 Games–Howell
- 회귀: 비선형/이분산/비정규 잔차가 강하면 강건회귀/변환/부트스트랩 고려

## UI/옵션 노출 계획

- 옵션: alpha(기본 0.05), normalityRule(기본 any)
- 표시: 각 검정 카드에 “의미/해석/주의(KS=참고용)” 안내 툴팁 제공
- 추천: 가정 결과를 기반으로 대체 방법을 자동 추천하고 신뢰도 점수와 함께 표기

## 참고

- SciPy: stats.shapiro, stats.normaltest, stats.kstest, stats.levene, stats.bartlett, stats.f
- Statsmodels: 사후검정/Games–Howell, Welch ANOVA(예: pingouin, scikit-posthocs 대체 가능)
