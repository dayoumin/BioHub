# Batch 2: currentStep 인덱싱 불일치 분석 및 수정

**날짜**: 2025-11-16
**문제**: Batch 2의 10개 페이지 중 일부가 다른 인덱싱 방식을 사용
**영향**: 유지보수성 저하, 혼란 가능성

---

## 🔍 발견된 불일치

### 현재 상태

| 페이지 | 인덱싱 방식 | TwoPanelLayout currentStep | useStatisticsPage initialStep |
|--------|------------|----------------------------|------------------------------|
| means-plot | 1-based | `currentStep={currentStep}` | `initialStep: 1` (추정) |
| stepwise | 1-based | `currentStep={currentStep}` | 명시 없음 (기본값 1?) |
| mann-kendall | 1-based | `currentStep={currentStep}` | 명시 없음 |
| wilcoxon | 0-based | `currentStep={currentStep + 1}` | 기본값 0 |
| mann-whitney | 0-based | `currentStep={currentStep + 1}` | 기본값 0 |
| friedman | 0-based | `currentStep={currentStep + 1}` | 기본값 0 |
| kruskal-wallis | 0-based | `currentStep={currentStep + 1}` | 기본값 0 |
| one-sample-t | 0-based | `currentStep={currentStep + 1}` (추정) | 기본값 0 |
| partial-correlation | 0-based | `currentStep={currentStep + 1}` (추정) | 기본값 0 |
| ks-test | 0-based | `currentStep={currentStep + 1}` (추정) | 기본값 0 |

### 통계
- **0-based**: 7개 페이지 (70%)
- **1-based**: 3개 페이지 (30%)

---

## 📋 표준화 결정

### 선택: 0-based 인덱싱 (Batch 1 패턴 따름)

**이유**:
1. **다수결**: 7/10 페이지가 이미 0-based 사용
2. **JavaScript 관습**: 배열 인덱스는 0부터 시작
3. **Batch 1 일관성**: descriptive, correlation, anova, t-test 모두 0-based
4. **코드 명확성**: `currentStep + 1`로 변환 의도가 명확

### 표준 패턴

```typescript
// ✅ 표준 패턴 (0-based)
const { state, actions } = useStatisticsPage<ResultType, VariablesType>({
  withUploadedData: true,
  withError: true
  // initialStep 생략 (기본값 0)
})

const steps = useMemo(() => {
  const baseSteps = [
    { id: 1, label: '방법 소개' },      // index 0
    { id: 2, label: '데이터 업로드' },   // index 1
    { id: 3, label: '변수 선택' },       // index 2
    { id: 4, label: '분석 결과' }        // index 3
  ]

  return baseSteps.map((step, index) => ({
    ...step,
    completed: currentStep > index || (currentStep === 3 && results !== null)
  }))
}, [currentStep, results])

return (
  <TwoPanelLayout
    currentStep={currentStep + 1}  // ✅ 0-based → 1-based 변환
    steps={steps}
    onStepChange={(step: number) => actions.setCurrentStep(step - 1)}  // ✅ 1-based → 0-based
    ...
  >
    {currentStep === 0 && renderMethodIntroduction()}
    {currentStep === 1 && <DataUploadStep ... />}
    {currentStep === 2 && renderVariableSelection()}
    {currentStep === 3 && renderResults()}
  </TwoPanelLayout>
)
```

---

## 🔧 수정 대상 페이지

### 1. means-plot
- **현재**: `currentStep={currentStep}` + `initialStep: 1`
- **수정**: `currentStep={currentStep + 1}` + initialStep 제거

### 2. stepwise
- **현재**: `currentStep={currentStep}`
- **수정**: `currentStep={currentStep + 1}`

### 3. mann-kendall
- **현재**: `currentStep={currentStep}`
- **수정**: `currentStep={currentStep + 1}`

---

## ✅ 수정 후 검증 체크리스트

- [ ] TypeScript 컴파일 0 에러
- [ ] 각 페이지의 Step 렌더링 조건 확인:
  - [ ] `currentStep === 0` → 방법 소개
  - [ ] `currentStep === 1` → 데이터 업로드
  - [ ] `currentStep === 2` → 변수 선택
  - [ ] `currentStep === 3` → 결과
- [ ] Breadcrumb 클릭 시 정상 네비게이션
- [ ] "다음 단계" 버튼 클릭 시 정상 진행
- [ ] 수동 테스트: npm run dev로 각 페이지 확인

---

**작성**: 2025-11-16
**상태**: 🚧 수정 예정
