# 📊 변수 선택 시스템 구현 계획

**작성일**: 2025-09-22
**목표**: 41개 통계 메서드별 지능형 변수 선택 시스템 구축
**우선순위**: ⭐⭐⭐⭐⭐ (핵심 기능)

---

## 🎯 현재 문제점

### 1. 변수 역할 구분 불가
- 현재: 단순히 "column" 선택만 가능
- 문제: 독립변수(X)와 종속변수(Y) 구분 없음
- 예시: 회귀분석에서 무엇을 예측하려는지 불명확

### 2. 다중 변수 선택 제한적
- 현재: `multi-column-select`로 단순 다중 선택
- 문제: 변수 역할별 그룹핑 불가능
- 예시: `multipleRegression`에서 여러 X와 하나의 Y 구분 필요

### 3. 변수 타입 검증 부재
- 현재: 모든 변수를 동일하게 취급
- 문제: 범주형/연속형 구분 없음
- 예시: `logisticRegression`의 Y는 반드시 이진변수여야 함

---

## 💡 해결 방안: 지능형 변수 선택 시스템

### 🏗️ 시스템 아키텍처

```typescript
// 1. 변수 타입 정의
enum VariableType {
  CONTINUOUS = 'continuous',    // 연속형 (숫자)
  CATEGORICAL = 'categorical',  // 범주형 (문자열, 카테고리)
  BINARY = 'binary',            // 이진형 (0/1, Yes/No, True/False)
  ORDINAL = 'ordinal',          // 순서형 (Low/Medium/High)
  DATETIME = 'datetime',        // 날짜/시간
  ID = 'id'                     // 식별자 (분석 제외)
}

// 2. 변수 역할 정의
enum VariableRole {
  INDEPENDENT = 'independent',   // 독립변수 (X, 예측변수)
  DEPENDENT = 'dependent',       // 종속변수 (Y, 결과변수)
  GROUP = 'group',              // 그룹 변수 (ANOVA 등)
  TIME = 'time',                // 시간 변수 (시계열)
  EVENT = 'event',              // 사건 변수 (생존분석)
  PAIRING = 'pairing',          // 짝 변수 (대응 검정)
  STRATIFY = 'stratify',        // 층화 변수
  WEIGHT = 'weight'             // 가중치 변수
}

// 3. 메서드별 변수 요구사항
interface MethodVariableRequirements {
  [methodId: string]: {
    roles: {
      [role in VariableRole]?: {
        required: boolean
        min: number
        max: number
        types: VariableType[]
        description: string
      }
    }
  }
}
```

---

## 📋 41개 메서드별 변수 요구사항

### 1. 기초통계 (5개)

| 메서드 | 필요 변수 | 역할 | 타입 | 개수 |
|--------|----------|------|------|------|
| calculateDescriptiveStats | 분석 대상 | - | continuous | 1+ |
| normalityTest | 검정 대상 | - | continuous | 1 |
| homogeneityTest | 값, 그룹 | dependent, group | continuous, categorical | 1, 1 |
| outlierDetection | 분석 대상 | - | continuous | 1+ |
| powerAnalysis | 효과크기 입력 | - | - | 파라미터 입력 |

### 2. 가설검정 (8개)

| 메서드 | 독립변수 | 종속변수 | 기타 |
|--------|---------|---------|------|
| oneSampleTTest | - | continuous (1) | 모평균 입력 |
| twoSampleTTest | categorical (1) | continuous (1) | 그룹 2개 |
| pairedTTest | - | continuous (2) | 짝지은 데이터 |
| welchTTest | categorical (1) | continuous (1) | 등분산 가정 X |
| correlationAnalysis | continuous (2+) | - | 상관행렬 |
| partialCorrelation | continuous (3+) | - | 통제변수 지정 |
| effectSize | - | - | 검정 결과 입력 |
| oneSampleProportionTest | - | binary (1) | 기준 비율 입력 |

### 3. 분산분석 (8개)

| 메서드 | 독립변수 | 종속변수 | 특이사항 |
|--------|---------|---------|---------|
| oneWayANOVA | categorical (1) | continuous (1) | 3+ 그룹 |
| twoWayANOVA | categorical (2) | continuous (1) | 상호작용 |
| tukeyHSD | ANOVA 결과 필요 | | 사후검정 |
| bonferroniPostHoc | ANOVA 결과 필요 | | 사후검정 |
| gamesHowellPostHoc | ANOVA 결과 필요 | | 등분산 X |
| repeatedMeasuresANOVA | categorical (1) | continuous (여러 시점) | 시간변수 |
| manova | categorical (1) | continuous (2+) | 다변량 |
| mixedEffectsModel | categorical (여러) | continuous (1) | 고정/무선 |

### 4. 회귀분석 (4개)

| 메서드 | 독립변수 | 종속변수 |
|--------|---------|---------|
| simpleLinearRegression | continuous (1) | continuous (1) |
| multipleRegression | any (2+) | continuous (1) |
| logisticRegression | any (1+) | binary (1) |
| polynomialRegression | continuous (1) | continuous (1) |

### 5. 비모수검정 (6개)

| 메서드 | 변수 요구사항 |
|--------|-------------|
| mannWhitneyU | categorical (1) + continuous (1) |
| wilcoxonSignedRank | continuous (2개 짝) |
| kruskalWallis | categorical (1) + continuous (1) |
| dunnTest | K-W 결과 필요 |
| chiSquareTest | categorical (2) |
| friedman | categorical (1) + continuous (반복) |

### 6. 시계열분석 (4개)

| 메서드 | 시간변수 | 값변수 | 기타 |
|--------|---------|--------|------|
| timeSeriesDecomposition | datetime (1) | continuous (1) | - |
| arimaForecast | datetime (1) | continuous (1) | p,d,q |
| sarimaForecast | datetime (1) | continuous (1) | 계절성 |
| varModel | datetime (1) | continuous (2+) | 다변량 |

### 7. 생존분석 (2개)

| 메서드 | 시간변수 | 사건변수 | 공변량 |
|--------|---------|---------|--------|
| kaplanMeierSurvival | continuous (1) | binary (1) | - |
| coxRegression | continuous (1) | binary (1) | any (1+) |

### 8. 다변량/기타 (4개)

| 메서드 | 변수 요구사항 |
|--------|-------------|
| principalComponentAnalysis | continuous (3+) |
| kMeansClustering | continuous (2+) + 클러스터수 |
| hierarchicalClustering | continuous (2+) |
| factorAnalysis | continuous (3+) |

---

## 🎨 UI/UX 설계

### 1. 변수 선택 인터페이스

```tsx
// 컴포넌트 구조
<VariableSelector
  data={uploadedData}
  method={selectedMethod}
  requirements={methodRequirements}
  onVariablesSelected={handleVariablesSelected}
/>

// UI 레이아웃
┌─────────────────────────────────────────────────┐
│  📊 변수 선택                                    │
├─────────────────────────────────────────────────┤
│  사용 가능한 변수           선택된 변수          │
│  ┌──────────────┐         ┌──────────────────┐ │
│  │ □ Age        │   ───>  │ 독립변수 (X)     │ │
│  │ □ Gender     │         │ • Age            │ │
│  │ □ Income     │   ───>  │ • Gender         │ │
│  │ □ Score      │         ├──────────────────┤ │
│  │ □ Category   │   ───>  │ 종속변수 (Y)     │ │
│  └──────────────┘         │ • Score          │ │
│                            └──────────────────┘ │
│                                                  │
│  [자동 추천] [초기화] [다음 단계]               │
└─────────────────────────────────────────────────┘
```

### 2. 드래그 앤 드롭 기능

```typescript
// 드래그 앤 드롭 구현
const handleDragStart = (variable: Variable) => {
  setDraggedVariable(variable)
}

const handleDrop = (role: VariableRole) => {
  if (validateVariable(draggedVariable, role)) {
    assignVariable(draggedVariable, role)
  } else {
    showError('이 변수는 해당 역할에 적합하지 않습니다')
  }
}
```

### 3. 변수 타입 자동 감지

```typescript
function detectVariableType(data: any[], column: string): VariableType {
  const values = data.map(row => row[column]).filter(v => v != null)
  const uniqueValues = new Set(values)

  // 이진 변수 체크
  if (uniqueValues.size === 2) {
    const vals = Array.from(uniqueValues)
    if (vals.every(v => [0, 1, '0', '1', 'Yes', 'No', 'True', 'False'].includes(v))) {
      return VariableType.BINARY
    }
  }

  // 날짜/시간 체크
  if (values.some(v => !isNaN(Date.parse(v)))) {
    return VariableType.DATETIME
  }

  // 연속형 체크
  if (values.every(v => !isNaN(Number(v)))) {
    if (uniqueValues.size > 10) {
      return VariableType.CONTINUOUS
    } else {
      return VariableType.ORDINAL
    }
  }

  // 범주형
  return VariableType.CATEGORICAL
}
```

### 4. 변수 추천 시스템

```typescript
function recommendVariables(
  data: any[],
  method: string,
  columnNames: string[]
): VariableAssignment {
  const recommendations: VariableAssignment = {}
  const requirements = methodRequirements[method]

  // 1. 변수명 기반 추천
  const namePatterns = {
    dependent: /price|score|result|outcome|target|y$/i,
    independent: /age|height|weight|size|amount|x\d*/i,
    group: /group|category|class|type|gender/i,
    time: /date|time|year|month|day|timestamp/i,
    event: /event|status|death|failure/i
  }

  // 2. 타입 기반 추천
  columnNames.forEach(column => {
    const type = detectVariableType(data, column)
    const role = inferRoleFromNameAndType(column, type, requirements)
    if (role) {
      recommendations[role] = recommendations[role] || []
      recommendations[role].push(column)
    }
  })

  return recommendations
}
```

---

## 🚀 구현 계획

### Day 1: 기반 시스템 구축 (9/23)
1. [ ] 변수 타입 감지 시스템 구현
2. [ ] 41개 메서드별 요구사항 정의 파일 생성
3. [ ] 타입 정의 및 인터페이스 작성

### Day 2: UI 컴포넌트 개발 (9/24)
1. [ ] VariableSelector 컴포넌트 구현
2. [ ] 드래그 앤 드롭 기능 구현
3. [ ] 변수 검증 로직 구현

### Day 3: 추천 시스템 및 통합 (9/25)
1. [ ] 변수 추천 알고리즘 구현
2. [ ] StatisticalAnalysisTemplate 통합
3. [ ] 테스트 및 디버깅

---

## 📝 구현 파일 구조

```
lib/statistics/
├── variable-detection.ts      # 변수 타입 감지
├── variable-requirements.ts   # 41개 메서드 요구사항
├── variable-recommendation.ts # 추천 시스템
└── variable-validation.ts     # 검증 로직

components/statistics/
├── VariableSelector.tsx        # 메인 선택 컴포넌트
├── VariableCard.tsx           # 개별 변수 카드
├── VariableDropZone.tsx       # 드롭 영역
└── VariableRecommendation.tsx # 추천 UI
```

---

## ✅ 체크리스트

### 필수 기능
- [ ] 41개 모든 메서드에 대한 변수 요구사항 정의
- [ ] 독립/종속 변수 구분 가능
- [ ] 다중 변수 선택 지원
- [ ] 변수 타입 자동 감지
- [ ] 변수 역할별 검증

### 추가 기능
- [ ] 드래그 앤 드롭 UI
- [ ] 자동 추천 시스템
- [ ] 변수 설명 툴팁
- [ ] 잘못된 선택 경고
- [ ] 선택 히스토리 저장

### 테스트
- [ ] 각 메서드별 변수 선택 테스트
- [ ] 타입 감지 정확도 테스트
- [ ] 추천 시스템 효과성 테스트
- [ ] UI/UX 사용성 테스트

---

## 📚 참고 자료

### 통계 메서드별 변수 역할
- [R Documentation](https://www.rdocumentation.org/)
- [SPSS Variable Types](https://www.ibm.com/docs/en/spss-statistics)
- [scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)

### UI/UX 참고
- [Tableau Variable Selection](https://www.tableau.com/)
- [Power BI Field Well](https://powerbi.microsoft.com/)
- [Google Sheets Explore](https://support.google.com/docs/answer/9144615)

---

*작성자: Statistical Platform Development Team*
*최종 수정: 2025-09-22*
*다음 업데이트: 2025-09-23 (구현 시작)*