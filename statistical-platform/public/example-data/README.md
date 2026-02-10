# 예시 데이터셋 (SPSS 표준 형식)

이 폴더에는 **SPSS 표준 데이터 형태**로 준비된 예시 CSV 파일들이 포함되어 있습니다.

---

## 📊 사용 방법

1. **데이터 업로드** 단계에서 CSV 파일 업로드
2. **변수 선택** 단계에서 컬럼 선택
3. **분석 실행**

---

## 📁 파일 목록

### **1. t-검정 (t-Test)**

#### `paired-t-test.csv` - 대응표본 t-검정
- **데이터 형태**: Wide Format (SPSS 표준)
- **컬럼**: Subject, Before, After
- **예시**: 운동 전후 혈압 비교

| Subject | Before | After |
|---------|--------|-------|
| S001    | 120    | 115   |
| S002    | 135    | 128   |
| ...     | ...    | ...   |

**SPSS 메뉴**: Analyze > Compare Means > Paired-Samples T Test

---

#### `independent-t-test.csv` - 독립표본 t-검정
- **데이터 형태**: Long Format (SPSS 표준)
- **컬럼**: Group, Score
- **예시**: 두 그룹(Control vs Treatment) 성적 비교

| Group   | Score |
|---------|-------|
| Control | 85    |
| Control | 90    |
| Treatment | 102 |
| ...     | ...   |

**SPSS 메뉴**: Analyze > Compare Means > Independent-Samples T Test

---

#### `one-sample-t.csv` - 일표본 t-검정
- **데이터 형태**: 단일 변수
- **컬럼**: Score
- **예시**: 평균 점수가 85점인지 검정

| Score |
|-------|
| 85    |
| 90    |
| ...   |

**SPSS 메뉴**: Analyze > Compare Means > One-Sample T Test

---

### **2. 분산분석 (ANOVA)**

#### `one-way-anova.csv` - 일원분산분석
- **데이터 형태**: Long Format (SPSS 표준)
- **컬럼**: Group, Score
- **예시**: 3개 그룹(A, B, C) 성적 비교

| Group | Score |
|-------|-------|
| A     | 85    |
| A     | 90    |
| B     | 102   |
| C     | 75    |
| ...   | ...   |

**SPSS 메뉴**: Analyze > Compare Means > One-Way ANOVA

---

#### `repeated-measures-anova.csv` - 반복측정 분산분석
- **데이터 형태**: Wide Format (SPSS 표준)
- **컬럼**: Subject, Time1, Time2, Time3
- **예시**: 같은 대상의 3시점 측정 비교

| Subject | Time1 | Time2 | Time3 |
|---------|-------|-------|-------|
| S001    | 120   | 125   | 130   |
| S002    | 135   | 140   | 145   |
| ...     | ...   | ...   | ...   |

**SPSS 메뉴**: Analyze > General Linear Model > Repeated Measures

---

### **3. 상관/회귀 (Correlation & Regression)**

#### `correlation.csv` - 상관분석
- **데이터 형태**: Wide Format (SPSS 표준)
- **컬럼**: Height, Weight
- **예시**: 키와 몸무게의 상관관계

| Height | Weight |
|--------|--------|
| 160    | 55     |
| 165    | 60     |
| ...    | ...    |

**SPSS 메뉴**: Analyze > Correlate > Bivariate

---

#### `linear-regression.csv` - 선형 회귀
- **데이터 형태**: Wide Format (SPSS 표준)
- **컬럼**: StudyHours, ExamScore
- **예시**: 공부 시간으로 시험 점수 예측

| StudyHours | ExamScore |
|------------|-----------|
| 2          | 65        |
| 3          | 70        |
| ...        | ...       |

**SPSS 메뉴**: Analyze > Regression > Linear

---

### **4. 범주형 데이터 (Categorical Data)**

#### `chi-square.csv` - 카이제곱 검정
- **데이터 형태**: Long Format (SPSS 표준)
- **컬럼**: Gender, Treatment
- **예시**: 성별과 치료 결과의 독립성 검정

| Gender | Treatment |
|--------|-----------|
| Male   | Success   |
| Male   | Failure   |
| Female | Success   |
| ...    | ...       |

**SPSS 메뉴**: Analyze > Descriptive Statistics > Crosstabs > Chi-Square

---

### **5. 비모수 검정 (Nonparametric Tests)**

#### `mann-whitney.csv` - Mann-Whitney U 검정
- **데이터 형태**: Long Format (SPSS 표준)
- **컬럼**: Group, Score
- **예시**: 두 그룹의 비모수 비교

| Group   | Score |
|---------|-------|
| Control | 45    |
| Treatment | 58  |
| ...     | ...   |

**SPSS 메뉴**: Analyze > Nonparametric Tests > Legacy Dialogs > 2 Independent Samples

---

#### `wilcoxon.csv` - Wilcoxon 부호순위 검정
- **데이터 형태**: Wide Format (SPSS 표준)
- **컬럼**: Subject, Before, After
- **예시**: 대응표본의 비모수 검정

| Subject | Before | After |
|---------|--------|-------|
| S001    | 45     | 52    |
| S002    | 38     | 42    |
| ...     | ...    | ...   |

**SPSS 메뉴**: Analyze > Nonparametric Tests > Legacy Dialogs > 2 Related Samples

---

## 🔍 데이터 형태 가이드

### **Wide Format (넓은 형태)**
- **특징**: 각 행 = 피험자, 각 열 = 측정 시점/변수
- **사용처**: 반복측정, 대응표본 비교
- **예시**:
  ```
  Subject | Time1 | Time2 | Time3
  S001    | 120   | 125   | 130
  S002    | 135   | 140   | 145
  ```

### **Long Format (긴 형태)**
- **특징**: 각 행 = 관측값, 그룹 변수가 별도 컬럼
- **사용처**: 그룹 비교, ANOVA, 회귀분석
- **예시**:
  ```
  Group   | Score
  Control | 85
  Control | 90
  Treatment | 102
  ```

---

## 📖 SPSS 호환성

모든 예시 데이터는 **SPSS에서 내보낸 CSV 파일과 동일한 형태**입니다.

- ✅ SPSS → CSV Export → 본 플랫폼 업로드 **바로 가능**
- ✅ 컬럼명은 자유롭게 변경 가능 (한글/영문 모두 지원)
- ✅ 결측값은 빈 칸 또는 "NA"로 표시

---

## 🚀 빠른 시작

### 1. 예시 파일 다운로드
각 통계 페이지의 "📄 예시 데이터 다운로드" 버튼 클릭

### 2. 데이터 업로드
CSV 파일을 드래그 앤 드롭 또는 파일 선택

### 3. 변수 선택
컬럼 이름을 클릭하여 변수 할당

### 4. 분석 실행
"분석 실행" 버튼 클릭

---

## ❓ FAQ

**Q: 컬럼명을 한글로 바꿔도 되나요?**
A: 네, 한글 컬럼명 지원합니다. 예: `Before` → `사전`

**Q: 엑셀 파일은 안 되나요?**
A: 엑셀 → CSV 저장 후 업로드하세요. (UTF-8 인코딩 권장)

**Q: SPSS 데이터 파일(.sav)은요?**
A: SPSS에서 "다른 이름으로 저장" → "CSV (쉼표로 구분)" 선택

**Q: 결측값은 어떻게 표시하나요?**
A: 빈 칸 또는 "NA" 입력

**Q: Long/Wide 형태를 자동 변환해주나요?**
A: 현재는 수동 변환 필요. 향후 자동 변환 기능 추가 예정

---

**업데이트**: 2026-02-09
**버전**: 1.0
**문의**: 각 통계 페이지의 안내 메시지 참조
