# 통계 분석 데이터 형태 가이드 (Data Format Guide)

## 🎯 목적
통계 분석 플랫폼에서 요구하는 데이터 형태를 명확히 정의하고, SPSS/R과의 비교를 통해 표준을 제시합니다.

---

## 📊 데이터 형태 개요

통계 분석에는 크게 **2가지 데이터 형태**가 있습니다:

### 1. **Wide Format** (넓은 형태)
- **특징**: 각 피험자/케이스가 1행, 측정값들이 여러 컬럼에 분산
- **주 사용처**: 반복측정, 대응표본 비교
- **예시**: SPSS 기본 형태

```csv
Subject,Time1,Time2,Time3
S001,10,12,15
S002,8,11,13
S003,9,10,14
```

### 2. **Long Format** (긴 형태)
- **특징**: 각 관측값이 1행, 변수들이 컬럼에 정리
- **주 사용처**: 그룹 비교, 회귀분석, ANOVA
- **예시**: R tidyverse 기본 형태

```csv
Subject,Time,Value
S001,Time1,10
S001,Time2,12
S001,Time3,15
S002,Time1,8
S002,Time2,11
S002,Time3,13
```

---

## 🔍 현재 구현 상태 (2026-02-09 기준)

### ✅ **Wide Format 요구 통계** (SPSS 스타일)

| 통계 방법 | 필수 컬럼 | 데이터 형태 | 예시 |
|----------|----------|-----------|------|
| **Repeated Measures ANOVA** | Subject ID + Time1~TimeN | Wide | Subject \| Time1 \| Time2 \| Time3 |
| **Paired t-test** | Before, After | Wide | Subject \| Before \| After |
| **대응표본 비교** | 측정1, 측정2 | Wide | ID \| Pre \| Post |

**코드 예시** (`repeated-measures-anova/page.tsx` 172-195줄):
```typescript
// Wide format에서 dataMatrix 추출
const dataMatrix: number[][] = []
for (const subjectId of uniqueSubjects) {
  const subjectRow = subjectRows[0]
  const timeValues = timeVars.map(timeVar => {
    return parseFloat(String(subjectRow[timeVar]))
  })
  dataMatrix.push(timeValues)
}

// Python Worker에 전달 → Long format으로 재변환
await pyodideCore.callWorkerMethod(
  PyodideWorker.NONPARAMETRIC_ANOVA,
  'repeated_measures_anova',
  { dataMatrix, subjectIds, timeLabels }
)
```

### ✅ **Long Format 요구 통계** (R 스타일)

| 통계 방법 | 필수 컬럼 | 데이터 형태 | 예시 |
|----------|----------|-----------|------|
| **One-way ANOVA** | Group, Value | Long | Group \| Value |
| **Two-way ANOVA** | Factor1, Factor2, Value | Long | Factor1 \| Factor2 \| Value |
| **Independent t-test** | Group, Value | Long | Group \| Value |
| **Regression** | X, Y | Long | X \| Y |
| **Correlation** | Variable1, Variable2 | Long | Var1 \| Var2 |

**코드 예시** (`worker3-nonparametric-anova.py` 343-382줄):
```python
def two_way_anova(dataValues, factor1Values, factor2Values):
    # Long format 직접 처리
    df = pd.DataFrame({
        'value': dataValues,
        'factor1': factor1Values,
        'factor2': factor2Values
    })

    formula = 'value ~ C(factor1) + C(factor2) + C(factor1):C(factor2)'
    model = ols(formula, data=df).fit()
```

---

## ⚠️ 현재 문제점

### 1. **일관성 부족**
- **문제**: 같은 ANOVA인데 One-way는 Long, Repeated Measures는 Wide 요구
- **영향**: 사용자가 헷갈림, 데이터 준비 시 혼란

### 2. **문서화 부족**
- **문제**: 각 통계별로 어떤 형태를 입력해야 하는지 명시 없음
- **영향**: 데이터 업로드 후 에러 발생 시 원인 파악 어려움

### 3. **변환 로직 숨겨짐**
- **문제**: Wide → Long 변환이 코드 곳곳에 산재
- **영향**: 유지보수 어려움, 버그 가능성

### 4. **유연성 부족**
- **문제**: 다른 형태의 데이터는 수동 변환 필요
- **영향**: 사용자 불편, 진입 장벽 상승

---

## 🎯 SPSS/R 표준 비교

### **SPSS (Statistical Package for the Social Sciences)**

| 특징 | 설명 |
|------|------|
| **기본 형태** | Wide Format |
| **데이터 뷰** | 각 행 = 케이스, 각 열 = 변수 |
| **Repeated Measures** | 시간점마다 별도 컬럼 (Time1, Time2, ...) |
| **그룹 비교** | 그룹 변수를 별도 컬럼으로 (Group: 1=실험군, 2=통제군) |
| **장점** | - 입력 직관적<br>- 엑셀과 유사<br>- 반복측정 분석 편리 |
| **단점** | - 변수 추가 시 컬럼 증가<br>- 대규모 데이터 비효율 |

**SPSS 예시**:
```
# Repeated Measures (Within-subjects)
Subject   Time1   Time2   Time3   Group
1         10      12      15      A
2         8       11      13      A
3         9       10      14      B

# Between-subjects (그룹 비교)
Subject   Score   Group   Gender
1         85      Control    M
2         90      Treatment  F
3         78      Control    F
```

### **R (tidyverse 패러다임)**

| 특징 | 설명 |
|------|------|
| **기본 형태** | Long Format (Tidy Data) |
| **데이터 철학** | 1 관측값 = 1 행, 1 변수 = 1 열 |
| **변환 함수** | `pivot_longer()`, `pivot_wider()` |
| **그룹 비교** | 그룹 변수를 factor로 (Long format 유지) |
| **장점** | - ggplot2 최적화<br>- dplyr 파이프라인<br>- 유연한 분석 |
| **단점** | - 입력 덜 직관적<br>- 초보자 진입장벽 |

**R 예시**:
```r
# Long Format (Tidy Data)
Subject   Time    Value   Group
1         Time1   10      A
1         Time2   12      A
1         Time3   15      A
2         Time1   8       A
2         Time2   11      A
2         Time3   13      A

# Wide → Long 변환
data_long <- data_wide %>%
  pivot_longer(cols = Time1:Time3, names_to = "Time", values_to = "Value")
```

### **Python (pandas)**

| 특징 | 설명 |
|------|------|
| **기본 형태** | Long Format 선호 (R 영향) |
| **변환 함수** | `melt()`, `pivot()`, `pivot_table()` |
| **통계 라이브러리** | statsmodels, scipy (Long format 기본) |
| **장점** | - 유연한 변환<br>- 대규모 데이터 처리 |
| **단점** | - 초기 학습 곡선 |

**Python 예시**:
```python
# Wide → Long 변환 (pandas)
data_long = pd.melt(
    data_wide,
    id_vars=['Subject'],
    value_vars=['Time1', 'Time2', 'Time3'],
    var_name='Time',
    value_name='Value'
)
```

---

## 📊 현재 플랫폼 vs SPSS/R 비교

| 항목 | 현재 플랫폼 | SPSS | R | 개선 방향 |
|------|------------|------|---|----------|
| **기본 형태** | 혼재 (Wide + Long) | Wide | Long | ✅ SPSS 스타일 (Wide) 유지 |
| **Repeated Measures** | Wide ✅ | Wide | Long | ✅ 현재 방식 유지 |
| **Between-subjects** | Long ✅ | Wide | Long | 🟡 Wide 옵션 추가 |
| **데이터 변환** | 자동 (부분) | 수동 | 라이브러리 | ✅ 자동 변환 강화 |
| **문서화** | ❌ 부족 | ✅ 상세 | ✅ 풍부 | 🚨 **시급** |
| **예시 데이터** | ❌ 없음 | ✅ 내장 | ✅ 패키지 | 🚨 **필수** |
| **에러 메시지** | 🟡 일반적 | ✅ 구체적 | ✅ 명확 | 🔧 개선 필요 |

---

## 🔧 개선 방안

### 1. **표준화** (최우선)

**목표**: SPSS 스타일 기본, 자동 변환 지원

#### ✅ **채택: Wide Format 기본** (SPSS 표준)
- 사용자 진입 장벽 낮음 (엑셀과 유사)
- Repeated Measures 직관적
- Between-subjects도 Wide로 통일 가능

#### 변환 로직 통합
```typescript
// 제안: lib/utils/data-format-converter.ts
export class DataFormatConverter {
  /**
   * Long → Wide 변환
   * @example
   * Input: [{ Subject: 1, Time: 'T1', Value: 10 }, ...]
   * Output: [{ Subject: 1, T1: 10, T2: 12, T3: 15 }]
   */
  static longToWide(data: DataRow[], config: {
    idColumn: string
    timeColumn: string
    valueColumn: string
  }): DataRow[]

  /**
   * Wide → Long 변환
   */
  static wideToLong(data: DataRow[], config: {
    idColumn: string
    timeColumns: string[]
    timeName: string
    valueName: string
  }): DataRow[]

  /**
   * 자동 형태 감지
   */
  static detectFormat(data: DataRow[]): 'wide' | 'long' | 'mixed'
}
```

### 2. **문서화 강화** (시급)

#### 각 통계 페이지에 추가
```tsx
// 예시: repeated-measures-anova/page.tsx
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    <strong>데이터 형태:</strong> Wide Format
    <ul>
      <li>각 행 = 피험자</li>
      <li>각 열 = 측정 시점 (Time1, Time2, ...)</li>
    </ul>
    <Button variant="link" onClick={() => setShowExample(true)}>
      예시 보기
    </Button>
  </AlertDescription>
</Alert>
```

#### 예시 데이터 제공
```typescript
// 제안: lib/constants/example-datasets.ts
export const EXAMPLE_DATASETS = {
  'repeated-measures-anova': {
    name: '반복측정 ANOVA 예시',
    description: '3시점 측정 데이터',
    format: 'wide',
    data: [
      { Subject: 'S001', Time1: 10, Time2: 12, Time3: 15 },
      { Subject: 'S002', Time1: 8, Time2: 11, Time3: 13 },
      // ...
    ],
    csvUrl: '/example-data/repeated-measures.csv'
  },
  // ...
}
```

### 3. **Smart Flow 개선**

#### 데이터 형태 자동 감지 & 변환
```typescript
// Step 2: 데이터 검증 & 형태 감지
const detectedFormat = DataFormatConverter.detectFormat(uploadedData.data)

if (detectedFormat !== requiredFormat) {
  // 자동 변환 제안
  setShowConversionDialog(true)
}
```

### 4. **에러 메시지 개선**

#### Before (현재)
```
❌ "최소 2개 이상의 시간 변수를 선택해주세요."
```

#### After (개선)
```
❌ 데이터 형태가 올바르지 않습니다.

필요한 형태: Wide Format
- 각 행: 피험자
- 각 열: 측정 시점 (Time1, Time2, ...)

현재 데이터:
- 행: 9개
- 열: Subject, Time, Value

💡 Long Format → Wide Format 변환이 필요합니다.
[자동 변환하기] 버튼
```

---

## 📚 통계별 데이터 요구사항 매트릭스

| 통계 방법 | 기본 형태 | 필수 컬럼 | SPSS 호환 | 예시 링크 |
|----------|----------|----------|----------|----------|
| **Repeated Measures ANOVA** | Wide | Subject ID + Time1~N | ✅ | [예시](#) |
| **One-way ANOVA** | Long → Wide | Group + Value | ✅ 변환 | [예시](#) |
| **Two-way ANOVA** | Long → Wide | Factor1 + Factor2 + Value | ✅ 변환 | [예시](#) |
| **Paired t-test** | Wide | Before + After | ✅ | [예시](#) |
| **Independent t-test** | Long → Wide | Group + Value | ✅ 변환 | [예시](#) |
| **Correlation** | Wide | Var1 + Var2 | ✅ | [예시](#) |
| **Regression** | Wide | X + Y (또는 X1~Xn + Y) | ✅ | [예시](#) |
| **Chi-square** | Long → Contingency | Row + Column (+ Count) | ✅ 변환 | [예시](#) |

---

## 🚀 우선순위 로드맵

### Phase 1: 문서화 (1주)
- [ ] 각 통계 페이지에 데이터 형태 가이드 추가
- [ ] 예시 데이터셋 준비 (CSV 파일)
- [ ] 에러 메시지 개선

### Phase 2: 자동 변환 (2주)
- [ ] `DataFormatConverter` 유틸리티 구현
- [ ] Long ↔ Wide 자동 변환 기능
- [ ] Smart Flow에 통합

### Phase 3: 검증 & 테스트 (1주)
- [ ] 43개 통계 방법 전체 검증
- [ ] SPSS 데이터셋으로 호환성 테스트
- [ ] 사용자 가이드 작성

---

## 📖 참고 문헌

- **SPSS**: IBM SPSS Statistics Data Editor (Wide Format 표준)
- **R tidyverse**: Wickham, H. (2014). Tidy Data. Journal of Statistical Software.
- **pandas**: McKinney, W. (2010). Data Structures for Statistical Computing in Python.
- **statsmodels**: Long Format 기본 (R 영향)

---

**작성일**: 2026-02-09
**버전**: 1.0
**작성자**: Claude Code (AI Agent)