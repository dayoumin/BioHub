# 수산과학 용어 매핑

**목적**: 통계 플랫폼의 범용 통계 용어를 수산과학 도메인에 특화된 용어로 매핑

**적용 대상**: 43개 통계 페이지 + 6개 변수 선택기 컴포넌트

---

## 📊 변수 타입 용어

| 통계 용어 | 수산과학 용어 | 예시 |
|----------|-------------|------|
| Dependent variable | 측정값 | 어체 중량, 성장률, 생존율 |
| Independent variable | 요인 변수 | 수온, 염분도, 사료 종류 |
| Group variable | 실험구 변수 | 양식장, 처리구, 실험군 |
| Factor | 처리 조건 | 사료 타입, 수온 수준, 밀도 |
| Covariate | 공변량 | 초기 체중, 초기 전장 |
| Time variable | 시간 변수 | 사육일수, 측정 주차 |
| Event variable | 사건 변수 | 폐사 여부, 성숙 도달 |
| Continuous variable | 연속형 변수 | 체중, 전장, 수온 |
| Categorical variable | 범주형 변수 | 성별, 품종, 사료 종류 |
| Paired data | 대응 데이터 | 동일 개체의 전/후 측정 |

---

## 🐟 수산과학 측정값 예시

### 성장 지표
- **어체 중량** (g) - Body weight
- **전장** (cm) - Total length
- **체장** (cm) - Body length
- **성장률** (%) - Growth rate
- **일일 성장률** (%/day) - Daily growth rate
- **증체량** (g) - Weight gain
- **비만도** - Condition factor

### 생리 지표
- **생존율** (%) - Survival rate
- **폐사율** (%) - Mortality rate
- **사료 효율** - Feed conversion ratio (FCR)
- **사료 섭이율** (%/day) - Feeding rate
- **단백질 효율** - Protein efficiency ratio (PER)
- **혈액 글루코스** (mg/dL) - Blood glucose

### 수질 지표
- **수온** (°C) - Water temperature
- **염분도** (ppt) - Salinity
- **용존산소량** (mg/L) - Dissolved oxygen (DO)
- **pH** - pH
- **암모니아 농도** (mg/L) - Ammonia concentration
- **아질산 농도** (mg/L) - Nitrite concentration

### 생산 지표
- **생산량** (kg/m³) - Production
- **밀도** (마리/m³) - Stocking density
- **수확량** (kg) - Harvest weight

---

## 🧪 실험 설계 용어

### 처리 조건 (Factor)
- **사료 종류**: 사료A, 사료B, 사료C
- **수온 수준**: 저온구(15°C), 중온구(20°C), 고온구(25°C)
- **밀도**: 저밀도(20마리/m³), 고밀도(40마리/m³)
- **염분도**: 담수(0ppt), 기수(15ppt), 해수(30ppt)

### 실험구 (Group)
- **양식장**: 양식장A, 양식장B, 양식장C
- **수조**: 수조1, 수조2, 수조3
- **처리구**: 대조구, 처리구1, 처리구2
- **품종**: 품종A, 품종B

### 시간 변수 (Time)
- **사육일수**: 1일, 30일, 60일, 90일
- **측정 주차**: 1주차, 2주차, 4주차, 8주차
- **성장 단계**: 치어기, 미성어기, 성어기

---

## 📝 UI 텍스트 매핑

### 변수 선택 설명
| 원문 | 수산과학 버전 |
|------|-------------|
| Select a group variable | 실험구 변수를 선택하세요 (예: 양식장, 처리구) |
| Select a dependent variable | 측정값을 선택하세요 (예: 어체 중량, 성장률) |
| Select independent variables | 요인 변수를 선택하세요 (예: 수온, 사료 종류) |
| Select numeric variables for correlation | 상관분석할 연속형 변수를 선택하세요 (예: 체중, 전장, 수온) |
| Select time variable | 시간 변수를 선택하세요 (예: 사육일수, 측정 주차) |
| Select event variable | 사건 변수를 선택하세요 (예: 폐사 여부) |

### 입력 필드 placeholder
| 원문 | 수산과학 버전 |
|------|-------------|
| 예: 0 | 예: 평균 어체 중량 100g |
| 예: 500 | 예: 대조구 평균 생존율 85% |
| 예: 0.5 | 예: 상관계수 0.7 |
| 예: 30 | 예: 실험구당 30마리 |

### 에러 메시지
| 원문 | 수산과학 버전 |
|------|-------------|
| Group variable is required | 실험구 변수를 선택해야 합니다 |
| Dependent variable is required | 측정값을 선택해야 합니다 |
| At least 2 numeric variables required | 최소 2개의 연속형 변수가 필요합니다 (예: 체중, 전장) |

---

## 🎯 통계 방법별 특화 예시

### T-Test
- **비교 대상**: 사료A vs 사료B의 평균 어체 중량 비교
- **측정값**: 60일령 어체 중량 (g)
- **그룹**: 사료A 처리구, 사료B 처리구

### ANOVA
- **비교 대상**: 3가지 수온(15°C, 20°C, 25°C)에서 성장률 비교
- **측정값**: 일일 성장률 (%/day)
- **요인**: 수온 수준 (저/중/고)

### Regression
- **예측 대상**: 수온과 염분도로 성장률 예측
- **종속변수**: 일일 성장률 (%/day)
- **독립변수**: 수온(°C), 염분도(ppt)

### Correlation
- **분석 대상**: 체중과 전장의 상관관계
- **변수**: 어체 중량(g), 전장(cm), 체장(cm)

### Survival Analysis
- **분석 대상**: 질병 발생 후 생존 시간
- **시간 변수**: 발병 후 경과일수
- **사건 변수**: 폐사 여부

### Time Series
- **분석 대상**: 양식장 수온의 계절적 변동
- **시계열 데이터**: 일별 수온(°C) 측정값

---

## 📌 적용 원칙

1. **일관성**: 동일한 개념은 항상 동일한 용어 사용
2. **명확성**: 예시를 병기하여 이해도 향상
3. **전문성**: 수산과학 분야에서 실제 사용하는 용어 우선
4. **접근성**: 초보 연구자도 이해할 수 있는 수준 유지

---

**작성일**: 2026-02-09
**버전**: 1.0
**상태**: 43개 통계 페이지 + 6개 Selector 적용 예정
