# 데이터 형식 가이드 (Data Format Guide)

**버전**: 1.0
**최종 업데이트**: 2025-11-24
**대상**: 통계 분석 초보자 ~ 중급자

---

## 📌 목차

1. [지원 파일 형식](#1-지원-파일-형식)
2. [데이터 구조: Wide vs Long Format](#2-데이터-구조-wide-vs-long-format)
3. [통계 방법별 권장 형식](#3-통계-방법별-권장-형식)
4. [결측치 처리 방법](#4-결측치-처리-방법)
5. [데이터 준비 체크리스트](#5-데이터-준비-체크리스트)
6. [CSV 템플릿 다운로드](#6-csv-템플릿-다운로드)

---

## 1. 지원 파일 형식

### ✅ **지원되는 파일 형식**

| 형식 | 확장자 | 설명 | 권장도 |
|-----|--------|------|--------|
| **CSV** | `.csv` | 쉼표로 구분된 텍스트 파일 | ⭐⭐⭐⭐⭐ (가장 권장) |
| **Excel** | `.xlsx`, `.xls` | Microsoft Excel 파일 | ⭐⭐⭐⭐ |
| **TSV** | `.tsv` | 탭으로 구분된 텍스트 파일 | ⭐⭐⭐ |
| **SPSS** | `.sav` | SPSS 데이터 파일 | ⭐⭐⭐ |
| **HWP** | `.hwp` | 한글 파일 (표만 추출) | ⭐⭐ |

---

### 📋 **CSV 파일 작성 규칙**

#### **1) 첫 번째 행은 변수명 (필수)**
```csv
fish_id,weight,length,feed_type
1,150.5,25.3,A
2,148.2,24.8,B
3,155.0,26.1,A
```

#### **2) 인코딩은 UTF-8 (권장)**
- **Windows Excel**: 저장 시 "CSV UTF-8 (쉼표로 분리)(*.csv)" 선택
- **Mac Excel**: 기본 UTF-8 저장됨
- **⚠️ 주의**: "CSV (쉼표로 분리)(*.csv)"는 ANSI 인코딩 → 한글 깨짐 발생!

#### **3) 변수명 작성 규칙**
- ✅ 영문 + 숫자 + 언더스코어(`_`) 사용 가능
- ✅ 한글 변수명도 지원 (예: "체중", "사료종류")
- ❌ 공백 사용 금지 → 언더스코어 사용 (예: `feed_type` ⭐, `feed type` ❌)
- ❌ 특수문자 금지 (예: `@`, `#`, `%`)

**예시**:
```csv
넙치_번호,체중_kg,길이_cm,사료_종류
1,150.5,25.3,A
```

---

## 2. 데이터 구조: Wide vs Long Format

### 🔄 **Wide Format (넓은 형식)**

**특징**: 각 개체가 **1개 행**을 차지, 반복 측정은 **여러 열**로 표현

**예시: 사전-사후 점수 (대응표본 t-검정)**
```csv
student_id,pre_score,post_score
1,65,75
2,70,80
3,60,70
```

**장점**:
- ✅ 사람이 읽기 쉬움
- ✅ 대응표본 t-검정, MANOVA에 적합

**사용 통계**:
- 대응표본 t-검정 (Paired t-test)
- MANOVA (다변량 분산분석)
- 주성분분석 (PCA)

---

### 📏 **Long Format (긴 형식)**

**특징**: 각 측정값이 **1개 행**을 차지, 개체가 **여러 행**으로 반복

**예시: 시간별 측정값 (반복측정 ANOVA)**
```csv
student_id,time_point,score
1,pre,65
1,post,75
2,pre,70
2,post,80
3,pre,60
3,post,70
```

**장점**:
- ✅ 반복측정 ANOVA에 필수
- ✅ 시계열 분석에 적합
- ✅ 데이터 추가가 쉬움

**사용 통계**:
- 반복측정 ANOVA (Repeated Measures ANOVA)
- 혼합모형 (Mixed Model)
- 시계열 분석

---

### 🔀 **Wide ↔ Long 변환 방법**

#### **방법 1: Excel 직접 변환**
**Wide → Long**:
1. Excel에서 "데이터" → "파워 쿼리" → "테이블/범위에서"
2. 변환할 열 선택 → "열 피벗 해제"
3. CSV로 저장

#### **방법 2: 플랫폼 내장 도구 (향후 지원 예정)**
```
대시보드 → 데이터 변환 → Wide/Long 변환
```

#### **방법 3: R/Python 스크립트**
**R (tidyr 패키지)**:
```r
# Wide → Long
library(tidyr)
long_data <- pivot_longer(wide_data, cols = c(pre_score, post_score),
                          names_to = "time_point", values_to = "score")
```

**Python (pandas)**:
```python
# Wide → Long
long_data = wide_data.melt(id_vars=['student_id'],
                           value_vars=['pre_score', 'post_score'],
                           var_name='time_point', value_name='score')
```

---

## 3. 통계 방법별 권장 형식

| 통계 방법 | 권장 형식 | 예시 데이터 |
|----------|----------|------------|
| **독립표본 t-검정** | Wide | `id, score, group` |
| **대응표본 t-검정** | Wide | `id, pre_score, post_score` |
| **일원분산분석 (ANOVA)** | Wide | `id, score, group` |
| **반복측정 ANOVA** | Long | `id, time, score` |
| **단순/다중 회귀** | Wide | `id, Y, X1, X2, X3` |
| **로지스틱 회귀** | Wide | `id, outcome (0/1), X1, X2` |
| **상관분석** | Wide | `id, var1, var2, var3` |
| **카이제곱 검정** | Wide | `id, row_var, col_var` |

---

### 📊 **예시 1: 독립표본 t-검정 (Wide Format)**

**연구 질문**: 남성과 여성의 평균 점수가 다른가?

```csv
student_id,score,gender
1,75,Male
2,80,Female
3,70,Male
4,85,Female
5,72,Male
```

**변수 선택**:
- 종속변수: `score` (continuous)
- 그룹 변수: `gender` (binary)

---

### 📊 **예시 2: 반복측정 ANOVA (Long Format)**

**연구 질문**: 시간에 따라 체중이 변화하는가?

```csv
fish_id,time_point,weight
1,day1,100.5
1,day7,105.2
1,day14,110.8
2,day1,98.3
2,day7,103.1
2,day14,108.5
```

**변수 선택**:
- 종속변수: `weight` (continuous)
- 개체내 요인: `time_point` (within)
- 개체 ID: `fish_id` (subject)

---

### 📊 **예시 3: 다중회귀분석 (Wide Format)**

**연구 질문**: 사료량, 수온, pH가 체중에 미치는 영향은?

```csv
fish_id,weight,feed_amount,water_temp,pH
1,150.5,100,25.5,7.2
2,148.2,95,24.8,7.0
3,155.0,105,26.1,7.5
```

**변수 선택**:
- 종속변수: `weight` (continuous)
- 독립변수: `feed_amount`, `water_temp`, `pH` (continuous)

---

## 4. 결측치 처리 방법

### ❓ **결측치 표시 방법**

| 표시 방법 | 지원 여부 | 예시 |
|----------|----------|------|
| **빈칸 (Empty)** | ✅ 지원 | `1,,25.3,A` |
| **NA** | ✅ 지원 | `1,NA,25.3,A` |
| **NULL** | ✅ 지원 | `1,NULL,25.3,A` |
| **-999** | ❌ 지원 안 함 | (수동 변환 필요) |

**⚠️ 주의**: `-999`, `9999` 같은 코드는 **실제 값으로 인식**됩니다!
→ 업로드 전에 빈칸 또는 `NA`로 변경하세요.

---

### 🛠️ **결측치 처리 옵션**

플랫폼은 분석 시 자동으로 결측치를 처리합니다:

| 옵션 | 설명 | 기본값 |
|-----|------|--------|
| **Listwise Deletion** | 결측치가 있는 행 전체 제거 | ✅ 기본 |
| **Pairwise Deletion** | 분석마다 사용 가능한 데이터만 사용 | (상관분석만) |
| **평균 대체 (Imputation)** | 결측치를 평균값으로 대체 | (향후 지원) |

**예시**:
```csv
student_id,score,gender
1,75,Male
2,,Female  ← 결측치
3,70,Male
```

→ **Listwise Deletion**: 2번 학생 제거 → 1번, 3번만 분석
→ **결과**: N=2

---

## 5. 데이터 준비 체크리스트

### ✅ **업로드 전 확인사항**

- [ ] **1) 첫 번째 행이 변수명인가?**
  - ❌ 잘못된 예: 첫 번째 행부터 데이터 시작
  - ✅ 올바른 예: `fish_id,weight,length`

- [ ] **2) 변수명에 공백이 없는가?**
  - ❌ `feed type` → ✅ `feed_type`

- [ ] **3) 인코딩이 UTF-8인가?** (한글 사용 시)
  - Excel: "CSV UTF-8 (쉼표로 분리)" 선택

- [ ] **4) 결측치가 빈칸 또는 NA로 표시되었는가?**
  - ❌ `-999`, `9999` → ✅ 빈칸 또는 `NA`

- [ ] **5) 각 변수가 1개 타입만 가지는가?**
  - ❌ 잘못된 예: `weight` 열에 "150.5", "Medium", "170.2" 혼재
  - ✅ 올바른 예: `weight` 열은 모두 숫자

- [ ] **6) 그룹 변수의 이름이 일관적인가?**
  - ❌ `Male`, `male`, `M` 혼재 → ✅ 모두 `Male`로 통일

- [ ] **7) 날짜 형식이 ISO 8601인가?** (날짜 사용 시)
  - ❌ `2024/01/15`, `15-Jan-2024`
  - ✅ `2024-01-15` (YYYY-MM-DD)

---

## 6. CSV 템플릿 다운로드

### 📥 **통계 방법별 샘플 데이터**

다음 템플릿을 다운로드하여 참고하세요:

#### **1) 독립표본 t-검정 (Two-Sample t-test)**
```csv
id,score,group
1,75,Control
2,80,Treatment
3,70,Control
4,85,Treatment
5,72,Control
6,88,Treatment
```
📎 [t_test_template.csv 다운로드](#) (향후 지원)

---

#### **2) 일원분산분석 (One-Way ANOVA)**
```csv
id,weight,feed_type
1,150.5,A
2,148.2,B
3,155.0,A
4,152.3,C
5,149.1,B
6,157.8,C
```
📎 [anova_template.csv 다운로드](#) (향후 지원)

---

#### **3) 반복측정 ANOVA (Repeated Measures ANOVA)**
```csv
fish_id,time_point,weight
1,day1,100.5
1,day7,105.2
1,day14,110.8
2,day1,98.3
2,day7,103.1
2,day14,108.5
```
📎 [repeated_measures_template.csv 다운로드](#) (향후 지원)

---

#### **4) 다중회귀분석 (Multiple Regression)**
```csv
id,yield,fertilizer,water,sunlight
1,150,100,50,8
2,148,95,48,7
3,155,105,52,9
4,152,100,50,8
```
📎 [regression_template.csv 다운로드](#) (향후 지원)

---

#### **5) 로지스틱 회귀 (Logistic Regression)**
```csv
id,pass,study_hours,attendance
1,1,10,90
2,0,5,70
3,1,12,95
4,0,3,60
```
📎 [logistic_template.csv 다운로드](#) (향후 지원)

---

## 📚 추가 자료

- **[변수 선택 가이드](./VARIABLE_SELECTION_GUIDE.md)**: 변수 역할 및 타입 설명
- **[통계 방법 선택 가이드](./RESEARCH_USER_GUIDE.md)**: 연구 목적별 통계 방법
- **AI 챗봇**: 헤더의 💬 아이콘 클릭 → 데이터 형식 질문

---

## ⚠️ 자주 발생하는 오류

### ❌ **오류 1: "첫 번째 행에 변수명이 없습니다"**
**원인**: 데이터가 첫 번째 행부터 시작
**해결**: Excel에서 첫 번째 행에 변수명 추가

---

### ❌ **오류 2: "한글이 깨져서 보입니다"**
**원인**: CSV 파일이 ANSI 인코딩
**해결**: Excel에서 "CSV UTF-8 (쉼표로 분리)" 선택 후 저장

---

### ❌ **오류 3: "변수 타입을 자동 감지할 수 없습니다"**
**원인**: 한 열에 숫자와 문자열이 혼재
**해결**: 각 열이 1개 타입만 가지도록 데이터 정리

---

### ❌ **오류 4: "그룹 변수가 2개 수준이 아닙니다"**
**원인**: t-검정에서 그룹이 3개 이상 (예: `Male`, `Female`, `Other`)
**해결**:
- 방법 1: 일원분산분석(ANOVA) 사용
- 방법 2: 2개 그룹만 필터링

---

**문의**: 추가 질문은 AI 챗봇 또는 GitHub Issues에 문의하세요!
