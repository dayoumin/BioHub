# 스마트 분석 추천 기능 검토 보고서

## 요약

`SmartAnalysisEngine.recommendAnalyses()` 메서드의 통계 방법 추천 로직을 검토한 보고서입니다. **추천 로직은 전반적으로 우수하나, 일부 개선 가능한 부분이 발견되었습니다.**

---

## 1. 추천 엔진 구조 분석

### 1.1 전체 플로우

```typescript
recommendAnalyses(columns: DataColumn[], researchQuestion?: string)
  ↓
1. 데이터 유효성 체크
2. 데이터 품질 체크 (결측치, 이상치)
3. 변수 타입별 분류 (numeric, categorical)
4. 통계 방법 자동 매칭 (11가지)
5. 연구질문 분석 (키워드 기반)
6. 중복 제거 및 병합
7. 신뢰도 순 정렬
  ↓
AnalysisRecommendation[] 반환
```

### 1.2 핵심 로직

#### 1.2.1 정규성 체크 (`quickNormalityCheck`)

**코드** (line 45-62):
```typescript
private static quickNormalityCheck(values: unknown[]): boolean {
  const numericValues = values.filter(v => typeof v === 'number') as number[]
  if (numericValues.length < 3) return true // 샘플 부족 시 정규분포 가정
  
  // 왜도 계산
  const skewness = numericValues.reduce((sum, val) => 
    sum + Math.pow((val - mean) / std, 3), 0) / n
  
  // |skewness| > 1.5 → 비정규로 간주
  return Math.abs(skewness) < 1.5
}
```

**평가**:
- ✅ **왜도 기준 1.5**: 적절함 (기존 2.0은 너무 관대)
- ⚠️ **샘플 부족 시 정규분포 가정**: 위험할 수 있음
- ❌ **첨도(kurtosis) 미검사**: 정규성 평가 불완전

**문제점**:
1. `n < 3`일 때 무조건 `true` 반환
   - 샘플 2개로 t-test 추천 가능 → 부적절
   - **권장**: 최소 샘플 크기 체크 (n ≥ 5)

2. 첨도 미검사
   - 왜도는 정규분포 대칭성만 체크
   - 첨도는 꼬리 두께 체크 (이상치 민감도)
   - **권장**: `|kurtosis - 3| < 4` 추가

**개선안**:
```typescript
private static quickNormalityCheck(values: unknown[]): boolean {
  const numericValues = values.filter(v => typeof v === 'number') as number[]
  
  // 최소 샘플 크기 체크
  if (numericValues.length < 5) {
    return null // 판단 불가 (비모수 검정 권장)
  }
  
  // 왜도 + 첨도 체크
  const skewness = calculateSkewness(numericValues)
  const kurtosis = calculateKurtosis(numericValues)
  
  return Math.abs(skewness) < 1.5 && Math.abs(kurtosis - 3) < 4
}
```

---

#### 1.2.2 데이터 품질 체크 (`checkDataQuality`)

**코드** (line 67-139):

##### 1) 결측치 검사

```typescript
const missingRate = column.missingCount / totalCount
if (missingRate > 0.2) {
  warnings.push(`⚠️ ${column.name}: 결측치가 ${(missingRate * 100).toFixed(0)}%로 높습니다.`)
}
```

**평가**:
- ✅ **20% 기준**: 일반적으로 적절
- ✅ **경고 메시지**: 명확하고 사용자 친화적
- ⚠️ **단계별 경고 없음**: 10%, 30%, 50% 등 단계별 구분 필요

**개선안**:
```typescript
if (missingRate > 0.5) {
  warnings.push(`🔴 ${column.name}: 결측치 ${(missingRate * 100).toFixed(0)}% - 심각! 분석 불가능`)
} else if (missingRate > 0.3) {
  warnings.push(`🟠 ${column.name}: 결측치 ${(missingRate * 100).toFixed(0)}% - 높음, 데이터 보강 필요`)
} else if (missingRate > 0.1) {
  warnings.push(`🟡 ${column.name}: 결측치 ${(missingRate * 100).toFixed(0)}% - 주의`)
}
```

---

##### 2) 이상치 탐지 (IQR 방법)

```typescript
const lowerBound = q1 - 1.5 * iqr
const upperBound = q3 + 1.5 * iqr
const outlierCount = numericValues.filter(v => v < lowerBound || v > upperBound).length
```

**평가**:
- ✅ **IQR 방법**: 표준적이고 견고함
- ✅ **1.5 IQR**: 적절한 기준 (Tukey's fences)
- ⚠️ **비율 정보 없음**: 이상치 개수만 제공
- ❌ **극단적 이상치 미구분**: 3 IQR 밖 극단값 별도 처리 필요

**개선안**:
```typescript
const outlierCount = numericValues.filter(v => v < lowerBound || v > upperBound).length
const extremeOutlierCount = numericValues.filter(v => 
  v < q1 - 3 * iqr || v > q3 + 3 * iqr
).length

const outlierRate = outlierCount / numericValues.length

if (extremeOutlierCount > 0) {
  warnings.push(`🔴 ${column.name}: 극단적 이상치 ${extremeOutlierCount}개 발견 - 즉시 확인 필요`)
} else if (outlierRate > 0.1) {
  warnings.push(`⚠️ ${column.name}: 이상치 ${outlierCount}개 (${(outlierRate * 100).toFixed(1)}%)`)
}
```

---

##### 3) 수치형 → 범주형 경고

```typescript
if (column.uniqueCount > 0 && column.uniqueCount < 10 && numericValues.length >= 10) {
  warnings.push(`⚠️ ${column.name}: 고유값이 ${column.uniqueCount}개로 적습니다. 범주형 변수로 처리하는 것을 고려하세요.`)
}
```

**평가**:
- ✅ **고유값 < 10 기준**: 리커트 척도(1-5) 등 탐지 가능
- ✅ **실용적 조언**: 범주형 전환 제안
- ⚠️ **비율 미고려**: 전체 대비 고유값 비율 필요
- ❌ **자동 전환 없음**: 사용자가 수동으로 처리해야 함

**예시**:
- 데이터 1000개, 고유값 5개 → 범주형일 가능성 높음
- 데이터 10개, 고유값 5개 → 범주형 아닐 수 있음

**개선안**:
```typescript
const uniqueRate = column.uniqueCount / numericValues.length

if (column.uniqueCount < 10 && numericValues.length >= 10) {
  if (uniqueRate < 0.1) {
    warnings.push(`💡 ${column.name}: 고유값 ${column.uniqueCount}개 (${(uniqueRate * 100).toFixed(1)}%) - 범주형 변수로 자동 전환을 고려하세요`)
  }
}
```

---

##### 4) 음수/0값 체크

```typescript
const negativeCount = numericValues.filter(v => v < 0).length
const zeroCount = numericValues.filter(v => v === 0).length
warnings.push(`ℹ️ ${column.name}: 음수(${negativeCount}개) 또는 0(${zeroCount}개)을 포함합니다. 로그변환 시 주의하세요.`)
```

**평가**:
- ✅ **로그변환 불가 경고**: 유용함
- ✅ **개수 구분**: 음수 vs 0 분리
- ⚠️ **심각도 낮음**: `ℹ️` 아이콘 (정보성)
- ❌ **대안 제시 없음**: 로그변환 대신 sqrt() 등 제안 필요

**개선안**:
```typescript
if (negativeCount > 0 || zeroCount > 0) {
  let alternative = ''
  if (negativeCount > 0) {
    alternative = '절댓값 변환 후 로그 또는 Box-Cox 변환 고려'
  } else if (zeroCount > 0) {
    alternative = 'log(x+1) 또는 sqrt(x) 변환 고려'
  }
  
  warnings.push(`ℹ️ ${column.name}: 음수 ${negativeCount}개, 0값 ${zeroCount}개 포함. ${alternative}`)
}
```

---

##### 5) 분산 0 체크

```typescript
if (variance === 0 && numericValues.length > 1) {
  warnings.push(`⚠️ ${column.name}: 모든 값이 동일합니다 (분산=0). 통계 분석이 불가능합니다.`)
}
```

**평가**:
- ✅ **치명적 문제 탐지**: 분석 불가 상태 명확히 경고
- ✅ **우선순위 적절**: ⚠️ 사용
- ✅ **조치사항 명확**: "분석 불가능"

**개선 불필요** - 이미 완벽함

---

## 2. 통계 방법 추천 로직 평가

### 2.1 기술통계 (항상 추천)

**코드** (line 165-186):
```typescript
if (numericCols.length > 0) {
  recommendations.push({
    id: 'descriptive',
    title: '기술통계 분석',
    confidence: 'high',
    // ...
  })
}
```

**평가**:
- ✅ **항상 추천**: 모든 분석의 시작점
- ✅ **High confidence**: 적절
- ✅ **Next steps 제공**: 그래프, 이상값 체크, 그룹 비교

**개선 불필요**

---

### 2.2 두 그룹 비교 (t-test vs Mann-Whitney)

**코드** (line 188-230):
```typescript
if (numericCols.length >= 1 && categoricalCols.length >= 1) {
  const binaryCategories = categoricalCols.filter(col => col.uniqueCount === 2)
  
  if (binaryCategories.length > 0) {
    const sampleSize = numericCols[0].sampleValues.length
    const minSampleSize = 5
    
    if (sampleSize >= minSampleSize) {
      const isNormal = this.quickNormalityCheck(numericCols[0].sampleValues)
      
      if (isNormal) {
        // 모수 검정: t-test
      } else {
        // 비모수 검정: Mann-Whitney U
      }
    }
  }
}
```

**평가**:
- ✅ **정규성 기반 자동 선택**: t-test ↔ Mann-Whitney
- ✅ **최소 샘플 크기 체크**: n ≥ 5
- ⚠️ **등분산성 미검사**: t-test 가정 중 하나 누락
- ❌ **Welch's t-test 미제공**: 등분산 위반 시 대안 없음

**문제점**:
1. 등분산성 검정 누락
   - t-test는 두 그룹 분산이 같다고 가정
   - Levene's test 필요
   
2. Welch's t-test 옵션 없음
   - 등분산 위반 시 사용
   - 더 견고한 방법

**개선안**:
```typescript
if (isNormal) {
  // 등분산성 체크 추가
  const isEqualVar = this.checkEqualVariance(group1, group2)
  
  if (isEqualVar) {
    recommendations.push({
      method: '독립표본 t-검정',
      assumptions: ['정규분포', '등분산성', '독립성']
    })
  } else {
    recommendations.push({
      method: "Welch's t-검정",
      description: '등분산성 가정이 필요 없는 t-검정',
      assumptions: ['정규분포', '독립성']
    })
  }
}
```

---

### 2.3 여러 그룹 비교 (ANOVA vs Kruskal-Wallis)

**코드** (line 233-268):
```typescript
const multiCategories = categoricalCols.filter(col => 
  col.uniqueCount >= 3 && col.uniqueCount <= 10
)

if (multiCategories.length > 0) {
  const isNormal = this.quickNormalityCheck(numericCols[0].sampleValues)
  
  if (isNormal) {
    // ANOVA
  } else {
    // Kruskal-Wallis
  }
}
```

**평가**:
- ✅ **3 ≤ 그룹 ≤ 10**: 합리적 범위
- ✅ **정규성 기반 선택**: ANOVA ↔ Kruskal-Wallis
- ⚠️ **그룹별 정규성 미검사**: 전체 데이터만 체크
- ❌ **Brown-Forsythe 미제공**: 등분산 위반 대안 없음

**문제점**:
1. 전체 정규성만 체크
   - ANOVA는 **각 그룹**이 정규분포여야 함
   - 그룹별 검정 필요

2. 등분산성 미검사
   - Levene's test 또는 Bartlett's test 필요

**개선안**:
```typescript
if (isNormal) {
  // 그룹별 정규성 체크
  const groupNormality = this.checkGroupNormality(numericCol, categoricalCol)
  
  if (groupNormality.allNormal) {
    // 등분산성 체크
    const isEqualVar = this.checkEqualVarianceMultiGroup(...)
    
    if (isEqualVar) {
      recommendations.push({ method: '일원분산분석' })
    } else {
      recommendations.push({ method: 'Welch ANOVA' })
    }
  } else {
    recommendations.push({ method: 'Kruskal-Wallis test' })
  }
}
```

---

### 2.4 상관분석 (항상 High Confidence?)

**코드** (line 271-284):
```typescript
if (numericCols.length >= 2) {
  recommendations.push({
    id: 'correlation',
    title: '상관분석',
    confidence: 'high', // ⚠️ 항상 high?
    assumptions: ['선형관계', '정규분포(선택적)']
  })
}
```

**평가**:
- ✅ **기본 조건 적절**: 2개+ 수치형 변수
- ⚠️ **항상 high**: 정규성 무시
- ❌ **Spearman 자동 추천 없음**: 비정규 시 대안 필요
- ❌ **선형관계 미검사**: 산점도 자동 체크 없음

**문제점**:
1. Pearson vs Spearman 선택 없음
   - Pearson: 정규분포 + 선형관계
   - Spearman: 단조관계 (비정규 OK)

2. 신뢰도 조정 없음
   - 정규분포 만족 → high
   - 비정규 → medium (Spearman 권장)

**개선안**:
```typescript
if (numericCols.length >= 2) {
  const isNormal = this.quickNormalityCheck(numericCols[0].sampleValues) &&
                   this.quickNormalityCheck(numericCols[1].sampleValues)
  
  if (isNormal) {
    recommendations.push({
      method: 'Pearson 상관분석',
      confidence: 'high',
      assumptions: ['선형관계', '정규분포']
    })
  } else {
    recommendations.push({
      method: 'Spearman 상관분석',
      confidence: 'high',
      description: '정규분포 가정이 필요 없는 순위 기반 상관분석'
    })
  }
}
```

---

### 2.5 회귀분석 (예측 키워드로 신뢰도 조정)

**코드** (line 286-302):
```typescript
const isPredictionTask = researchQuestion?.toLowerCase().includes('예측') ||
                          researchQuestion?.toLowerCase().includes('predict')

recommendations.push({
  id: 'regression',
  confidence: isPredictionTask ? 'high' : 'medium'
})
```

**평가**:
- ✅ **연구질문 반영**: 키워드 기반 신뢰도 조정
- ✅ **예측 의도 감지**: '예측', 'predict' 인식
- ⚠️ **다른 키워드 부족**: '관계', '영향', 'effect' 등 누락
- ❌ **정규성 미검사**: 회귀분석 잔차 정규성 필요

**개선안**:
```typescript
const isRegressionTask = 
  researchQuestion?.match(/예측|predict|영향|effect|관계|relationship/i)

const confidence = isRegressionTask ? 'high' : 'medium'

// 정규성 체크 추가
const assumptions = ['선형관계', '정규분포', '등분산성', '독립성']
if (!isNormal) {
  assumptions.push('⚠️ 정규성 위반 가능성 - 비선형 회귀 고려')
}
```

---

### 2.6 시계열 분석 (Medium Confidence)

**코드** (line 344-386):
```typescript
const timeColumns = columns.filter(col => {
  const name = col.name.toLowerCase()
  
  const hasTimeKeyword = 
    name.includes('날짜') || 
    name.includes('년') || 
    name.includes('월') ||
    name.includes('date') ||
    name.includes('year')
  
  const hasStandaloneTimeKeyword = 
    name === '시간' || name === 'time' || ...
  
  const isLikelyTimestamp = (hasTimeKeyword || hasStandaloneTimeKeyword) &&
                             col.type !== 'numeric'
  
  return isLikelyTimestamp
})

if (timeColumns.length > 0 && numericCols.length >= 1) {
  recommendations.push({
    method: '시계열 분석',
    confidence: 'medium' // ⚠️ 왜 medium?
  })
}
```

**평가**:
- ✅ **키워드 기반 감지**: '날짜', '년', '월', 'date', 'year'
- ✅ **"공부시간" 제외**: 단독 "시간"만 인정 (영리함!)
- ✅ **Numeric 타입 제외**: response_time 등 오탐 방지
- ⚠️ **Medium confidence**: 너무 보수적?
- ❌ **시간 간격 미검사**: 일정한 간격 필요

**문제점**:
1. Medium 신뢰도 이유 불분명
   - 시간 컬럼 존재 → 시계열 분석 적합
   - High로 상향 가능

2. 시간 간격 검증 없음
   - 불규칙 간격 → 시계열 부적합
   - 간격 체크 필요

**개선안**:
```typescript
if (timeColumns.length > 0 && numericCols.length >= 1) {
  // 시간 간격 규칙성 체크
  const isRegularInterval = this.checkTimeInterval(timeColumn)
  
  recommendations.push({
    method: '시계열 분석',
    confidence: isRegularInterval ? 'high' : 'medium',
    assumptions: [
      '시간 순서 데이터', 
      isRegularInterval ? '일정한 시간 간격' : '⚠️ 불규칙 간격 - 처리 필요'
    ]
  })
}
```

---

### 2.7 카이제곱 검정

**코드** (line 388-407):
```typescript
if (categoricalCols.length >= 2) {
  const sampleSize = categoricalCols[0].sampleValues.length
  const minSampleSize = 5
  
  if (sampleSize >= minSampleSize) {
    recommendations.push({
      method: '카이제곱 검정',
      confidence: 'high',
      assumptions: ['독립성', '기대빈도 ≥ 5']
    })
  }
}
```

**평가**:
- ✅ **최소 샘플 크기**: n ≥ 5
- ⚠️ **기대빈도 미검사**: 실제로 체크 안 함
- ❌ **Fisher's exact test 미제공**: 기대빈도 < 5 대안 없음

**문제점**:
1. 기대빈도 체크 부재
   - 가정에 "기대빈도 ≥ 5" 명시
   - 실제 계산 안 함

2. 대안 미제공
   - 기대빈도 < 5 → Fisher's exact test
   - 자동 추천 없음

**개선안**:
```typescript
if (categoricalCols.length >= 2) {
  const expectedFreq = this.calculateExpectedFrequency(cat1, cat2)
  
  if (expectedFreq >= 5) {
    recommendations.push({
      method: '카이제곱 검정',
      confidence: 'high'
    })
  } else {
    recommendations.push({
      method: "Fisher's exact test",
      description: '기대빈도가 낮을 때 사용하는 정확 검정',
      confidence: 'high'
    })
  }
}
```

---

## 3. 연구질문 분석 로직

**코드** (line 457-526):
```typescript
private static analyzeResearchQuestion(question: string, columns: DataColumn[]) {
  const keywords = {
    difference: ['차이', '다른', '비교', 'difference', 'compare', 'different'],
    relationship: ['관계', '관련', 'relationship', 'correlation', 'related'],
    prediction: ['예측', '영향', 'predict', 'effect', 'influence']
  }
  
  if (keywords.difference.some(keyword => lowerQuestion.includes(keyword))) {
    // 그룹 비교 추천
  }
}
```

**평가**:
- ✅ **3가지 카테고리**: 차이, 관계, 예측
- ✅ **다국어 지원**: 한국어 + 영어
- ⚠️ **키워드 부족**: 더 많은 동의어 필요
- ❌ **부정어 미처리**: "차이가 없나요?" → 차이 분석 추천 (오류)

**개선안**:
```typescript
const keywords = {
  difference: ['차이', '다른', '비교', 'difference', 'compare', 'different', 
               '다르', '구별', 'distinguish', 'versus', 'vs'],
  relationship: ['관계', '관련', 'relationship', 'correlation', 'related',
                 '연관', '상관', 'association', 'connected'],
  prediction: ['예측', '영향', 'predict', 'effect', 'influence',
               '추정', '모델', 'forecast', 'estimate', 'impact']
}

// 부정어 체크
const hasNegation = lowerQuestion.match(/없|not|no/)
```

---

## 4. 중복 제거 및 병합 로직

**코드** (line 415-433):
```typescript
const merged: Record<string, AnalysisRecommendation> = {}
for (const rec of recommendations) {
  const key = rec.method
  if (!merged[key]) {
    merged[key] = rec
  } else {
    const keep = recRank >= mergedRank ? rec : merged[key]
    merged[key] = {
      ...keep,
      assumptions: Array.from(new Set([...merged[key].assumptions, ...rec.assumptions])),
      nextSteps: Array.from(new Set([...merged[key].nextSteps, ...rec.nextSteps]))
    }
  }
}
```

**평가**:
- ✅ **중복 제거**: 동일 method 하나로 병합
- ✅ **높은 신뢰도 유지**: recRank >= mergedRank
- ✅ **가정/단계 합집합**: 정보 손실 방지
- ✅ **Set 사용**: 중복 자동 제거

**개선 불필요** - 완벽한 로직

---

## 5. 신뢰도 순 정렬

**코드** (line 446-451):
```typescript
return normalized.sort((a, b) => {
  const aRank = confidenceRank[a.confidence] ?? 0
  const bRank = confidenceRank[b.confidence] ?? 0
  return bRank - aRank
})
```

**평가**:
- ✅ **High → Medium → Low**: 적절한 순서
- ✅ **Null-safe**: `?? 0` 사용
- ⚠️ **동률 처리 없음**: 동일 신뢰도 시 순서 무작위

**개선안**:
```typescript
return normalized.sort((a, b) => {
  const aRank = confidenceRank[a.confidence] ?? 0
  const bRank = confidenceRank[b.confidence] ?? 0
  
  if (bRank !== aRank) {
    return bRank - aRank
  }
  
  // 동률 시 메서드 이름 알파벳 순
  return a.method.localeCompare(b.method)
})
```

---

## 6. 종합 평가

### 6.1 강점 ✅

| 항목 | 평가 | 설명 |
|------|------|------|
| **자동 메서드 선택** | 🟢 우수 | 정규성 기반 모수/비모수 자동 전환 |
| **데이터 품질 체크** | 🟢 우수 | 결측치, 이상치, 분산 0 등 포괄적 검사 |
| **연구질문 반영** | 🟢 우수 | 키워드 기반 신뢰도 조정 |
| **중복 제거** | 🟢 완벽 | 동일 메서드 병합, 정보 손실 없음 |
| **사용자 친화적** | 🟢 우수 | 쉬운 설명, emoji 활용 |

### 6.2 약점 ⚠️

| 항목 | 심각도 | 설명 |
|------|--------|------|
| **등분산성 미검사** | 🟡 중간 | t-test, ANOVA 가정 누락 |
| **Welch 검정 없음** | 🟡 중간 | 등분산 위반 대안 부재 |
| **첨도 미검사** | 🟡 중간 | 정규성 평가 불완전 |
| **그룹별 정규성** | 🟠 낮음 | ANOVA 그룹별 체크 없음 |
| **기대빈도 미검사** | 🟠 낮음 | 카이제곱 가정 검증 부재 |
| **부정어 미처리** | 🟠 낮음 | "차이 없나요?" 오인식 |

### 6.3 점수표

| 기준 | 점수 | 세부사항 |
|------|------|----------|
| **추천 정확도** | 8/10 | 대부분 적절, 일부 가정 검증 누락 |
| **데이터 품질** | 9/10 | 포괄적 체크, 단계별 경고 개선 여지 |
| **사용자 경험** | 9/10 | 쉬운 설명, 명확한 next steps |
| **견고성** | 7/10 | 엣지케이스 일부 미처리 |
| **확장성** | 8/10 | 11개 메서드 지원, 추가 용이 |

**전체 평균**: **8.2/10** ⭐⭐⭐⭐

---

## 7. 개선 우선순위

### Priority 1 (High) - 즉시 수정 권장

1. **등분산성 검정 추가**
   - t-test, ANOVA에 Levene's test 통합
   - Welch's t-test, Welch ANOVA 옵션 제공

2. **정규성 체크 강화**
   - 첨도(kurtosis) 검사 추가
   - 최소 샘플 크기 n ≥ 5 강제

3. **기대빈도 검증**
   - 카이제곱 검정 전 기대빈도 계산
   - Fisher's exact test 자동 대체

### Priority 2 (Medium) - 중기 개선

4. **상관분석 자동 선택**
   - Pearson vs Spearman 정규성 기반 자동 전환

5. **데이터 품질 경고 단계화**
   - 결측치: 10%, 30%, 50% 단계별 심각도
   - 이상치: 비율 표시 + 극단값 별도 처리

6. **연구질문 키워드 확장**
   - 더 많은 동의어 추가
   - 부정어 처리 logic

### Priority 3 (Low) - 장기 개선

7. **그룹별 정규성 검사**
   - ANOVA 각 그룹별 정규성 체크

8. **시계열 간격 검증**
   - 일정한 시간 간격 확인

9. **동률 정렬 규칙**
   - 동일 신뢰도 시 알파벳 순

---

## 8. 결론

### 8.1 최종 평가

> ✅ **추천 기능은 전반적으로 우수하며, 실무 사용에 적합합니다.**

**근거**:
- 11개 통계 방법을 데이터 구조에 맞게 자동 추천
- 정규성 기반 모수/비모수 자동 전환
- 데이터 품질 문제 사전 탐지
- 연구질문 키워드 반영으로 신뢰도 조정

**다만**:
- 등분산성 검정 등 일부 가정 검증 누락
- Welch 검정 등 대안 메서드 부족
- 개선 시 **9/10 수준** 도달 가능

### 8.2 권장 조치

#### 즉시 조치
1. ✅ 등분산성 검정 추가 (Levene's test)
2. ✅ Welch's t-test, Welch ANOVA 옵션
3. ✅ 첨도 검사 추가

#### 중기 조치
4. ⚠️ Pearson/Spearman 자동 선택
5. ⚠️ 데이터 품질 경고 단계화
6. ⚠️ 카이제곱 기대빈도 검증

---

**문서 작성일**: 2025-11-21  
**검토 대상**: `SmartAnalysisEngine.recommendAnalyses()` (line 144-451)  
**전체 평가**: 8.2/10 ⭐⭐⭐⭐
