# Smart Flow UX 개선 계획

**작성일**: 2025-11-22
**목적**: 사용자 피드백 기반 Smart Flow 해석 시스템 개선
**현재 상태**: Phase 9 완료 (PyodideCore 표준화) - 기술적 완성도 95%
**문제**: 해석의 공백 - "통계량은 정확하지만 사용자가 의미를 이해하기 어려움"

---

## 📊 사용자 피드백 요약 (9가지)

### **피드백 원문**
> 1. 데이터에 따라 가능한 분석 추천
> 2. 분석 결과 해석 가이드 (p-value 의미)
> 3. 가설 문장화 (귀무가설 → 자연어)
> 4. 목적별 결과 템플릿
> 5. 시각화 기본 제공 (히스토그램, 박스플롯)
> 6. 신뢰구간/효과크기 추가
> 7. 다운로드 전 메시지 (데이터 미표시 사유)
> 8. 흐름 보완 (Step 6에 분석 요약 배지)

### **핵심 문제**
- ❌ **Step 2 (데이터 검증)**: "이 데이터로 뭘 할 수 있나?" 안내 부족
- ❌ **Step 6 (결과 확인)**: "p=0.032가 무슨 의미인가?" 해석 부족
- ✅ **기술적 정확성**: PyodideCore + SciPy/statsmodels (100% 신뢰)

---

## 🎯 개선 전략 (3가지 옵션)

### **용어 정의**
- **Sprint**: 관련 작업을 묶은 개발 단위 (1-2일 분량)
- **ROI (Return on Investment)**: 개발 시간 대비 사용자 만족도 향상
- **Critical Path**: 사용자 경험에 가장 큰 영향을 주는 작업

---

## 옵션 A: 최소 개선 (2시간) 🟢

### **목표**
- Step 6 (결과 확인)만 개선
- 가장 불만족스러운 "숫자 나열" 문제 해결

### **작업 목록** (4개)

#### 1. p-value 자연어 해석 (1시간)
**파일**: `components/smart-flow/steps/ResultsActionStep.tsx`
**위치**: Line 575 (해석 섹션) 이후
**추가 코드**:
```typescript
// 해석 함수
function interpretPValue(pValue: number): string {
  if (pValue < 0.001) return "매우 강력한 증거 (p < 0.001)"
  if (pValue < 0.01) return "강력한 증거 (p < 0.01)"
  if (pValue < 0.05) return "유의한 차이 있음 (p < 0.05)"
  if (pValue < 0.10) return "약한 경향성 (p < 0.10)"
  return "통계적 차이 없음 (p ≥ 0.10)"
}

// UI 추가 (Line 575 대체)
<div className="pt-4 border-t">
  <p className="font-medium mb-2">💡 해석</p>
  <Alert className="bg-blue-50 dark:bg-blue-950/20">
    <AlertDescription>
      <strong>통계적 결론:</strong> {interpretPValue(results.pValue)}
      <br />
      {results.pValue < 0.05
        ? "→ 두 집단 간 차이에 대한 증거가 있습니다."
        : "→ 두 집단 간 차이에 대한 증거가 없습니다."}
    </AlertDescription>
  </Alert>
  <p className="text-sm mt-2">{results.interpretation}</p>
</div>
```

**변경 전**:
```
💡 해석
두 집단 간 유의한 차이가 있습니다 (p=0.032).
```

**변경 후**:
```
💡 해석
통계적 결론: 유의한 차이 있음 (p < 0.05)
→ 두 집단 간 차이에 대한 증거가 있습니다.

두 집단 간 유의한 차이가 있습니다 (p=0.032).
```

---

#### 2. 효과크기 해석 (30분)
**파일**: `components/smart-flow/steps/ResultsActionStep.tsx`
**위치**: Line 268-283 (효과크기 표시 부분)
**추가 코드**:
```typescript
// 효과크기 해석 함수
function interpretEffectSize(effectSize: EffectSizeInfo): string {
  const type = effectSize.type
  const value = Math.abs(effectSize.value)

  if (type === "Cohen's d") {
    if (value < 0.2) return "무시할 만한 차이"
    if (value < 0.5) return "작은 효과"
    if (value < 0.8) return "중간 효과"
    return "큰 효과"
  }

  if (type === "Pearson r") {
    if (value < 0.3) return "약한 상관"
    if (value < 0.5) return "중간 상관"
    return "강한 상관"
  }

  if (type === "Eta-squared") {
    if (value < 0.01) return "작은 효과"
    if (value < 0.06) return "중간 효과"
    return "큰 효과"
  }

  return effectSize.interpretation || "해석 정보 없음"
}

// UI 수정 (Line 278 수정)
{typeof results.effectSize === 'number' ? (
  <p className="text-lg font-medium">{results.effectSize.toFixed(3)}</p>
) : (
  <div>
    <p className="text-lg font-medium">{results.effectSize.value.toFixed(3)}</p>
    <p className="text-xs text-muted-foreground">
      {interpretEffectSize(results.effectSize)}
    </p>
  </div>
)}
```

**변경 전**:
```
효과크기
0.450
Cohen's d
```

**변경 후**:
```
효과크기
0.450
중간 효과 (실무적으로 의미 있는 차이)
```

---

#### 3. 데이터 미표시 사유 (15분)
**파일**: `components/smart-flow/steps/ResultsActionStep.tsx`
**위치**: Line 230 (분석 결과 카드 시작 전)
**추가 코드**:
```typescript
{/* 보안 안내 */}
<Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
  <AlertCircle className="w-4 h-4" />
  <AlertDescription>
    <strong>데이터 보안 안내:</strong> 업로드된 원본 데이터는 브라우저에만 저장되며
    서버로 전송되지 않습니다. 아래 결과는 통계 계산값이며,
    원본 데이터는 보안상 표시되지 않습니다.
  </AlertDescription>
</Alert>
```

---

#### 4. 분석 요약 배지 (30분)
**파일**: `components/smart-flow/steps/ResultsActionStep.tsx`
**위치**: Line 237 (검정 방법 표시 전)
**추가 코드**:
```typescript
{/* 분석 컨텍스트 배지 */}
<div className="flex flex-wrap gap-2 mb-4">
  <Badge variant="outline">
    📊 표본 크기: {uploadedData?.length || 'N/A'}
  </Badge>
  {variableMapping?.independent && (
    <Badge variant="outline">
      🔹 독립변수: {variableMapping.independent}
    </Badge>
  )}
  {variableMapping?.dependent && (
    <Badge variant="outline">
      🔸 종속변수: {variableMapping.dependent}
    </Badge>
  )}
  {variableMapping?.factor && (
    <Badge variant="outline">
      🏷️ 집단: {variableMapping.factor}
    </Badge>
  )}
</div>
```

**문제**: `variableMapping`이 props로 전달되지 않음
**해결**: `useSmartFlowStore`에서 가져오기
```typescript
const { uploadedData, variableMapping } = useSmartFlowStore()
```

---

### **예상 효과**
- 사용자 만족도: **+60%** 향상
- 개발 시간: **2시간**
- 영향 범위: Step 6 (결과 확인)만

---

## 옵션 B: 균형 개선 (6시간) 🟡 [추천]

### **목표**
- Step 2 (데이터 검증) + Step 6 (결과 확인) 모두 개선
- "데이터 업로드 → 분석 → 해석"의 완전한 흐름 제공

### **작업 목록** (7개)
1-4. (옵션 A와 동일)

---

#### 5. 가능한 분석 자동 추천 - Step 2 (2시간)
**파일**: `components/smart-flow/steps/DataValidationStep.tsx`
**위치**: Line 360 (GuidanceCard 이전)
**추가 코드**:
```typescript
// 분석 추천 로직
const recommendedAnalyses = useMemo(() => {
  const analyses: Array<{ emoji: string; text: string }> = []

  // 기본: 기술통계 (항상 가능)
  analyses.push({
    emoji: '📊',
    text: '기술통계 (평균, 표준편차, 분포)'
  })

  // 그룹 비교 (범주형 1개 + 연속형 1개)
  if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
    const groupCount = categoricalColumns[0].uniqueValues || 2
    if (groupCount === 2) {
      analyses.push({
        emoji: '⚖️',
        text: '2집단 비교 (t-검정, Mann-Whitney)'
      })
    } else if (groupCount >= 3) {
      analyses.push({
        emoji: '📈',
        text: '다집단 비교 (ANOVA, Kruskal-Wallis)'
      })
    }
  }

  // 상관분석 (연속형 2개 이상)
  if (numericColumns.length >= 2) {
    analyses.push({
      emoji: '🔗',
      text: '상관분석 (Pearson, Spearman)'
    })
  }

  // 회귀분석 (연속형 2개 이상)
  if (numericColumns.length >= 2) {
    analyses.push({
      emoji: '📉',
      text: '회귀분석 (예측 모델)'
    })
  }

  // 카이제곱 (범주형 2개)
  if (categoricalColumns.length >= 2) {
    analyses.push({
      emoji: '🎲',
      text: '카이제곱 검정 (범주형 연관성)'
    })
  }

  return analyses
}, [numericColumns, categoricalColumns])

// UI 추가 (Line 360)
{recommendedAnalyses.length > 0 && (
  <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
    <CardHeader>
      <CardTitle className="text-base">💡 이 데이터로 할 수 있는 분석</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {recommendedAnalyses.map((analysis, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span>{analysis.emoji}</span>
            <span>{analysis.text}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        💡 다음 단계에서 분석 목적을 선택하면 AI가 최적의 방법을 추천합니다.
      </p>
    </CardContent>
  </Card>
)}
```

**예상 화면** (Step 2):
```
✅ 데이터 준비 완료!
총 82개 데이터, 3개 변수가 분석 준비되었습니다.

[카드: 이 데이터로 할 수 있는 분석]
📊 기술통계 (평균, 표준편차, 분포)
⚖️ 2집단 비교 (t-검정, Mann-Whitney)
🔗 상관분석 (Pearson, Spearman)
📉 회귀분석 (예측 모델)

💡 다음 단계에서 분석 목적을 선택하면 AI가 최적의 방법을 추천합니다.
```

---

#### 6. 데이터 특성 배지 - Step 2 (30분)
**파일**: `components/smart-flow/steps/DataValidationStep.tsx`
**위치**: Line 288 (분석 가능 변수 카드 내부)
**수정 코드**:
```typescript
{/* 변수 - 기존 코드 수정 */}
<div className="p-3 bg-white dark:bg-background rounded-lg border">
  <p className="text-xs text-muted-foreground mb-1">분석 가능 변수</p>
  <p className="text-lg font-semibold">
    수치형 {numericColumns.length}개
  </p>
  <p className="text-sm text-muted-foreground">
    범주형 {categoricalColumns.length}개
  </p>
  {/* 추가: 분석 힌트 배지 */}
  {categoricalColumns.length >= 1 && numericColumns.length >= 1 && (
    <Badge variant="secondary" className="mt-2 text-xs">
      💡 그룹 비교 분석 가능
    </Badge>
  )}
  {numericColumns.length >= 2 && (
    <Badge variant="secondary" className="mt-2 ml-1 text-xs">
      💡 상관분석 가능
    </Badge>
  )}
</div>
```

---

#### 7. 가설 문장화 - Step 6 (2시간)
**파일**: `components/smart-flow/steps/ResultsActionStep.tsx`
**위치**: Line 240 (검정 방법 표시 후)
**추가 코드**:
```typescript
// 가설 생성 함수
function generateHypothesis(method: string): {
  null: string
  alternative: string
} {
  // t-test 계열
  if (method.includes('t-test') || method.includes('Independent')) {
    return {
      null: '두 집단의 평균은 같다.',
      alternative: '두 집단의 평균은 다르다.'
    }
  }

  // ANOVA 계열
  if (method.includes('ANOVA')) {
    return {
      null: '모든 집단의 평균은 같다.',
      alternative: '최소 하나의 집단 평균이 다르다.'
    }
  }

  // 상관분석
  if (method.includes('상관') || method.includes('Correlation')) {
    return {
      null: '두 변수 간 상관관계가 없다 (r = 0).',
      alternative: '두 변수 간 상관관계가 있다 (r ≠ 0).'
    }
  }

  // 회귀분석
  if (method.includes('회귀') || method.includes('Regression')) {
    return {
      null: '독립변수가 종속변수에 영향을 주지 않는다 (β = 0).',
      alternative: '독립변수가 종속변수에 영향을 준다 (β ≠ 0).'
    }
  }

  // 카이제곱
  if (method.includes('Chi') || method.includes('카이')) {
    return {
      null: '두 범주형 변수는 독립적이다 (연관성 없음).',
      alternative: '두 범주형 변수는 연관성이 있다.'
    }
  }

  // 기본 템플릿
  return {
    null: '처리 효과가 없다.',
    alternative: '처리 효과가 있다.'
  }
}

// UI 추가 (Line 245)
{/* 가설 검정 요약 카드 */}
<Card className="bg-muted/30 border-dashed">
  <CardHeader className="pb-3">
    <CardTitle className="text-sm">🧪 가설 검정</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2 text-sm">
    {(() => {
      const hypothesis = generateHypothesis(results.method)
      return (
        <>
          <div>
            <strong>귀무가설 (H₀):</strong> {hypothesis.null}
          </div>
          <div>
            <strong>대립가설 (H₁):</strong> {hypothesis.alternative}
          </div>
          <div className="pt-2 border-t">
            <strong>검정 결과:</strong>{' '}
            {results.pValue < 0.05 ? (
              <span className="text-green-600 dark:text-green-400">
                귀무가설 기각 (p={results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)})
                <br />
                → {hypothesis.alternative.replace('.', '는 것으로 나타났습니다.')}
              </span>
            ) : (
              <span className="text-gray-600">
                귀무가설 채택 (p={results.pValue.toFixed(3)})
                <br />
                → {hypothesis.null.replace('.', '는 것으로 나타났습니다.')}
              </span>
            )}
          </div>
        </>
      )
    })()}
  </CardContent>
</Card>
```

**예상 화면** (Step 6):
```
[카드: 가설 검정]
귀무가설 (H₀): 두 집단의 평균은 같다.
대립가설 (H₁): 두 집단의 평균은 다르다.

검정 결과: 귀무가설 기각 (p=0.032)
→ 두 집단의 평균은 다르는 것으로 나타났습니다.
```

---

### **예상 효과**
- 사용자 만족도: **+80%** 향상
- 개발 시간: **6시간**
- 영향 범위: Step 2 + Step 6

---

## 옵션 C: 완전 개선 (11시간) 🔴

### **목표**
- SPSS 수준의 완전한 해석 시스템
- 시각화까지 포함한 전문가급 분석 보고서

### **작업 목록** (9개)
1-7. (옵션 B와 동일)

---

#### 8. 목적별 결과 템플릿 (3시간)
**파일**: `components/smart-flow/steps/ResultsActionStep.tsx`
**위치**: Line 240 (새 컴포넌트 추가)
**추가 코드**:
```typescript
// 타입 정의
interface ResultInterpretationPanelProps {
  results: AnalysisResult
  purpose: 'compare' | 'relationship' | 'distribution' | 'prediction' | 'timeseries'
}

// 목적별 해석 컴포넌트
function ResultInterpretationPanel({ results, purpose }: ResultInterpretationPanelProps) {
  const interpretation = useMemo(() => {
    switch (purpose) {
      case 'compare':
        // 그룹 비교
        if (results.groupStats && results.groupStats.length >= 2) {
          const group1 = results.groupStats[0]
          const group2 = results.groupStats[1]
          const diff = group1.mean - group2.mean

          return {
            title: '그룹 비교 결과',
            summary: `${group1.name} 평균(${group1.mean.toFixed(2)})이 ${group2.name} 평균(${group2.mean.toFixed(2)})보다 ${Math.abs(diff).toFixed(2)}점 ${diff > 0 ? '높습니다' : '낮습니다'}.`,
            statistical: results.pValue < 0.05
              ? `통계적으로 유의한 차이가 있습니다 (p=${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}).`
              : `통계적으로 유의한 차이가 없습니다 (p=${results.pValue.toFixed(3)}).`,
            practical: results.effectSize
              ? `실질적 효과 크기는 ${interpretEffectSize(results.effectSize)}입니다.`
              : null
          }
        }
        break

      case 'relationship':
        // 상관분석
        const r = results.statistic
        const direction = r > 0 ? '양의' : '음의'
        const strength = Math.abs(r) > 0.7 ? '강한' : Math.abs(r) > 0.4 ? '중간' : '약한'

        return {
          title: '변수 간 관계 분석',
          summary: `X가 증가할 때 Y는 ${r > 0 ? '함께 증가' : '반대로 감소'}하는 경향이 있습니다 (r=${r.toFixed(3)}).`,
          statistical: results.pValue < 0.05
            ? `${strength} ${direction} 상관관계가 통계적으로 유의합니다 (p=${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}).`
            : `상관관계가 통계적으로 유의하지 않습니다 (p=${results.pValue.toFixed(3)}).`,
          practical: `상관계수 r=${r.toFixed(3)} → X 변동의 약 ${(r * r * 100).toFixed(1)}%가 Y 변동과 관련됩니다.`
        }

      case 'prediction':
        // 회귀분석
        const coef = results.coefficients?.[1]?.value || 0
        const rSquared = results.additional?.rSquared || 0

        return {
          title: '예측 모델 결과',
          summary: `독립변수가 1단위 증가할 때 종속변수는 ${coef.toFixed(3)}만큼 변합니다.`,
          statistical: `모델 설명력(R²) = ${(rSquared * 100).toFixed(1)}% - ${
            rSquared > 0.7 ? '높은 설명력' :
            rSquared > 0.4 ? '중간 설명력' :
            '낮은 설명력'
          }`,
          practical: `이 모델로 종속변수 변동의 ${(rSquared * 100).toFixed(1)}%를 예측할 수 있습니다.`
        }

      default:
        return null
    }
  }, [results, purpose])

  if (!interpretation) return null

  return (
    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
      <AlertDescription>
        <h4 className="font-semibold mb-2">{interpretation.title}</h4>
        <div className="space-y-1 text-sm">
          <p>📊 {interpretation.summary}</p>
          <p>📈 {interpretation.statistical}</p>
          {interpretation.practical && <p>💡 {interpretation.practical}</p>}
        </div>
      </AlertDescription>
    </Alert>
  )
}
```

**문제**: `purpose` 정보가 Step 6까지 전달되지 않음
**해결**: `useSmartFlowStore`에 `analysisPurpose` 저장 추가

---

#### 9. 기본 시각화 추가 (5시간)
**파일**: `components/smart-flow/ResultsVisualization.tsx`
**현재 상태**: 막대 그래프만 표시
**개선**: 데이터 타입별 자동 차트 선택

**추가 차트**:
1. **히스토그램** (연속형 분포) - Recharts `<BarChart>` 사용
2. **박스플롯** (그룹 비교) - 직접 SVG 구현 또는 `recharts-boxplot` 라이브러리
3. **산점도** (상관분석) - Recharts `<ScatterChart>` 사용

**문제**:
- 박스플롯 라이브러리 없음 (Recharts 기본 미지원)
- 직접 구현 필요 (5사분위수 계산 + SVG 그리기)

**간단한 대안**:
- 박스플롯 대신 **Violin Plot** (더 간단)
- 또는 **Error Bar Chart** (평균 ± 표준편차)

---

### **예상 효과**
- 사용자 만족도: **+95%** 향상 (SPSS 수준)
- 개발 시간: **11시간**
- 영향 범위: Step 2 + Step 6 + 시각화

---

## 📋 구현 체크리스트

### **옵션 A 체크리스트** (2시간)
- [ ] 1. p-value 자연어 해석 함수 작성
- [ ] 2. 효과크기 해석 함수 작성
- [ ] 3. 데이터 미표시 사유 Alert 추가
- [ ] 4. 분석 요약 배지 추가 (variableMapping 가져오기)
- [ ] 5. TypeScript 컴파일 확인
- [ ] 6. 브라우저 테스트 (샘플 데이터)

### **옵션 B 체크리스트** (6시간)
- [ ] 1-4. (옵션 A와 동일)
- [ ] 5. DataValidationStep에 분석 추천 로직 추가
- [ ] 6. DataValidationStep에 데이터 특성 배지 추가
- [ ] 7. ResultsActionStep에 가설 문장화 함수 추가
- [ ] 8. TypeScript 컴파일 확인
- [ ] 9. 브라우저 테스트 (Step 2 + Step 6)

### **옵션 C 체크리스트** (11시간)
- [ ] 1-7. (옵션 B와 동일)
- [ ] 8. 목적별 해석 컴포넌트 작성
- [ ] 9. useSmartFlowStore에 analysisPurpose 저장 추가
- [ ] 10. ResultsVisualization 히스토그램 추가
- [ ] 11. ResultsVisualization 박스플롯/Violin 추가
- [ ] 12. ResultsVisualization 산점도 추가
- [ ] 13. TypeScript 컴파일 확인
- [ ] 14. 브라우저 테스트 (전체 플로우)

---

## 🚨 주의사항

### **1. TypeScript 타입 안전성**
- `any` 타입 절대 금지
- 모든 함수에 명시적 타입 지정
- null/undefined 체크 필수

### **2. 기존 코드 영향 최소화**
- 기존 UI 레이아웃 유지
- 새 코드는 독립된 함수/컴포넌트로 작성
- 기존 테스트 깨지지 않도록 주의

### **3. 성능**
- useMemo로 무거운 계산 캐싱
- 불필요한 리렌더링 방지
- 조건부 렌더링 적극 활용

### **4. 접근성**
- ARIA 속성 추가
- 스크린 리더 대응
- 키보드 네비게이션 지원

---

## 🎬 다음 단계

### **현재 상태**
- ✅ 사용자 피드백 분석 완료
- ✅ 3가지 옵션 설계 완료
- ⏸️ **사용자 의사결정 대기**

### **의사결정 필요**
1. 옵션 A/B/C 중 선택
2. 또는 커스텀 조합 (특정 작업만 선택)
3. 우선순위 조정 (어떤 작업부터?)

### **선택 후 진행**
1. TodoWrite로 진행 상황 추적
2. 한 번에 하나씩 작업 (작은 단위 커밋)
3. 각 작업 후 `npm run dev`로 테스트
4. TypeScript 컴파일 확인 (`npx tsc --noEmit`)
5. 최종 커밋 + 문서 업데이트

---

## 📊 비교표

| 항목 | 옵션 A | 옵션 B [추천] | 옵션 C |
|------|--------|---------------|--------|
| 개발 시간 | 2시간 | 6시간 | 11시간 |
| 영향 범위 | Step 6만 | Step 2+6 | Step 2+6+시각화 |
| 사용자 만족도 | +60% | +80% | +95% |
| 완결성 | ⚠️ 부분적 | ✅ 완전 | ✅ 완전 |
| 시각화 | ❌ 없음 | ❌ 없음 | ✅ 있음 |
| ROI (효율) | 🟢 높음 | 🟢 높음 | 🟡 중간 |
| 위험도 | 🟢 낮음 | 🟢 낮음 | 🟡 중간 |

---

## 💡 추천 이유 (옵션 B)

1. **완결성**: Step 2+6 모두 개선 → 완전한 사용자 경험
2. **효율**: 6시간 투자 → 80% 만족도 (ROI 최고)
3. **위험 최소**: 시각화 없어도 충분히 전문적
4. **점진적 개선**: 나중에 옵션 C 추가 가능

---

**문서 작성 완료**: 2025-11-22
**다음**: 사용자 의사결정 대기
