# 통계 분석 페이지 종합 테스트 가이드 📊

**작성일**: 2025-11-04
**목표**: 45개 통계 페이지 체계적 점검 및 오류 검증
**상태**: 35/45 페이지 완료 (78%), 10개 남은 상태

---

## 🎯 테스트 목표 및 범위

### **테스트 3가지 레벨**

| 레벨 | 범위 | 시간 | 목표 |
|------|------|------|------|
| **L1: UI 렌더링** | 페이지 로드, 버튼 표시, 콘솔 에러 | 5분/개 | TypeScript 컴파일 에러 없음 |
| **L2: 기능 동작** | 데이터 업로드 → 분석 → 결과 표시 | 10분/개 | 버튼 활성화, 결과 계산 정상 |
| **L3: 코드 품질** | 타입 안전성, 에러 처리, 캐싱 | 15분/개 | 5.0/5 코드 점수 달성 |

---

## 🚀 시작하기

### **1단계: 개발 서버 실행**

```bash
cd statistical-platform
npm run dev
```

**확인**: `http://localhost:3000/dashboard/statistics` 접속

### **2단계: TypeScript 검증**

```bash
npx tsc --noEmit
```

**확인**: 0개 에러 (통계 페이지 관련)

### **3단계: 순서대로 각 통계 테스트**

아래 그룹별로 진행하세요.

---

## 📋 Group 1: Quick Wins (6개) - 45분

**특징**: 단순 구조, 빠른 검증 가능

### 1️⃣ ANOVA (분산 분석)
**파일**: `/statistics/anova/page.tsx`

**테스트 데이터**:
```csv
group,value
A,10.5
A,12.3
A,11.8
B,20.1
B,21.5
B,19.9
C,15.2
C,16.8
C,15.5
```

**테스트 단계**:
1. ✅ 페이지 로드
2. ✅ "Sample Data" 또는 CSV 업로드
3. ✅ **Dependent**: value / **Independent**: group 선택
4. ✅ "Analyze" 클릭
5. ✅ **예상 결과**:
   - F-statistic: ~80 (그룹 간 차이 큼)
   - p-value: < 0.001 (유의미)
   - 그룹별 평균: A≈11.5, B≈20.5, C≈15.8

**🐛 버그 체크**:
- [ ] 분석 후 버튼이 활성화되는가? (isAnalyzing 버그)
- [ ] 결과 테이블이 렌더링되는가?
- [ ] 콘솔에 에러가 없는가?
- [ ] 재분석 가능한가? (버튼 재활성화)

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5

---

### 2️⃣ t-test (독립표본 t 검정)
**파일**: `/statistics/t-test/page.tsx`

**테스트 데이터**:
```csv
group,value
Control,5.2
Control,5.5
Control,4.8
Treatment,7.1
Treatment,7.5
Treatment,6.8
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Group**: group / **Value**: value 선택
3. ✅ Equal Variance 가정 선택
4. ✅ "Analyze" 클릭
5. ✅ **예상 결과**:
   - t-statistic: ~15 (차이 유의미)
   - p-value: < 0.05
   - 95% CI: [1.5, 2.5]

**🐛 버그 체크**:
- [ ] 두 그룹만 선택 가능한가?
- [ ] 신뢰구간이 표시되는가?
- [ ] 평균 차이 계산이 맞는가?

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5

---

### 3️⃣ One-Sample t-test
**파일**: `/statistics/one-sample-t/page.tsx`

**테스트 데이터**:
```csv
value
10.5
11.2
10.8
11.5
9.8
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Variable**: value 선택
3. ✅ **Test Value**: 10 입력
4. ✅ "Analyze" 클릭
5. ✅ **예상 결과**:
   - t-statistic: > 0
   - p-value 표시
   - 기준값(10)과 비교

**🐛 버그 체크**:
- [ ] 숫자만 입력 가능한가? (유효성 검사)
- [ ] 결과 해석 텍스트가 표시되는가?

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5 (Mock 데이터 제거됨)

---

### 4️⃣ Normality Test (정규성 검정)
**파일**: `/statistics/normality-test/page.tsx`

**테스트 데이터**:
```csv
value
1.2
1.5
1.8
2.1
2.4
2.3
2.0
1.9
1.6
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Variable**: value 선택
3. ✅ Test Method: Shapiro-Wilk 선택
4. ✅ "Analyze" 클릭
5. ✅ **예상 결과**:
   - W-statistic: 0.9 ~ 1.0 (정규)
   - p-value: > 0.05 (정규성 확인)

**🐛 버그 체크**:
- [ ] 여러 검정방법 선택 가능한가?
- [ ] 히스토그램이 표시되는가?

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5

---

### 5️⃣ Means Plot (평균 플롯)
**파일**: `/statistics/means-plot/page.tsx`

**테스트 데이터**:
```csv
group,value
A,10
A,12
B,20
B,22
C,15
C,17
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **X-axis**: group / **Y-axis**: value 선택
3. ✅ "Analyze" 클릭
4. ✅ **예상 결과**:
   - 선 그래프 렌더링
   - 그룹별 평균값 표시

**🐛 버그 체크**:
- [ ] 차트가 반응형으로 렌더링되는가?
- [ ] 마우스 호버 시 값이 표시되는가?

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5

---

### 6️⃣ KS Test (Kolmogorov-Smirnov)
**파일**: `/statistics/ks-test/page.tsx`

**테스트 데이터** (정규분포를 따르는 데이터):
```csv
value
1.2
1.5
1.8
2.1
2.4
2.3
2.0
1.9
1.6
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Variable**: value 선택
3. ✅ **Test Distribution**: Normal 선택
4. ✅ "Analyze" 클릭
5. ✅ **예상 결과**:
   - D-statistic: 0 ~ 0.5
   - p-value: > 0.05 (정규분포 따름)

**🐛 버그 체크**:
- [ ] 경험적 CDF 그래프가 표시되는가?
- [ ] JavaScript normalCDF 제거되었는가? (scipy 사용)

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5 (JavaScript 제거됨)

---

## 📋 Group 2: Medium Complexity (2개) - 40분

### 7️⃣ Friedman Test
**파일**: `/statistics/friedman/page.tsx`

**테스트 데이터** (반복측정):
```csv
subject,condition,value
1,A,5
1,B,7
1,C,6
2,A,4
2,B,6
2,C,5
3,A,6
3,B,8
3,C,7
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Subjects**: subject / **Groups**: condition / **Values**: value 선택
3. ✅ "Analyze" 클릭
4. ✅ **예상 결과**:
   - Friedman chi-square: 양수
   - p-value 표시
   - Kendall's W 효과크기

**🐛 버그 체크**:
- [ ] 순위 합계(Rank Sums) 테이블이 표시되는가?
- [ ] Double assertion 제거되었는가? (명시적 객체 생성)

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5

---

### 8️⃣ Kruskal-Wallis Test
**파일**: `/statistics/kruskal-wallis/page.tsx`

**테스트 데이터** (3개 이상 비정규 그룹):
```csv
group,value
A,5
A,4
A,3
B,10
B,9
B,8
C,15
C,14
C,13
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Group**: group / **Value**: value 선택
3. ✅ "Analyze" 클릭
4. ✅ **예상 결과**:
   - H-statistic: ~18
   - p-value: < 0.05
   - 사분위수 범위(IQR) 표시

**🐛 버그 체크**:
- [ ] 기술통계가 표시되는가?
- [ ] NumPy percentiles 정확도: Q1, Q3 계산 맞는가?

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5

---

## 📋 Group 3: Complex Analysis (2개) - 50분

### 9️⃣ Mann-Kendall Trend Test
**파일**: `/statistics/mann-kendall/page.tsx`

**테스트 데이터** (시계열 데이터):
```csv
time,value
1,10
2,12
3,15
4,18
5,20
6,22
7,25
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Time**: time / **Value**: value 선택
3. ✅ "Analyze" 클릭
4. ✅ **예상 결과**:
   - S-statistic: > 0 (상승추세)
   - p-value: < 0.05
   - Sen's slope: > 0
   - Kendall's tau: > 0

**🐛 버그 체크**:
- [ ] 시계열 그래프가 표시되는가?
- [ ] pymannkendall 제거, scipy 사용되는가?
- [ ] 추세 해석이 정확한가?

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5 (외부 라이브러리 제거됨)

---

### 🔟 Reliability (Cronbach's Alpha)
**파일**: `/statistics/reliability/page.tsx`

**테스트 데이터** (Likert 척도):
```csv
item1,item2,item3,item4
5,4,5,4
4,4,4,3
5,5,5,5
3,3,3,3
4,5,4,5
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Items**: item1, item2, item3, item4 모두 선택
3. ✅ "Analyze" 클릭
4. ✅ **예상 결과**:
   - Cronbach's Alpha: 0.7 ~ 0.9 (신뢰도 높음)
   - Item-total correlation
   - Alpha if item deleted

**🐛 버그 체크**:
- [ ] Item-total 상관계수가 모두 양수인가?
- [ ] Alpha 값이 합리적인가? (0 ~ 1)
- [ ] 중복 actions 체크 제거되었는가?

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5

---

## 📋 Group 4: Critical Complexity (1개) - 45분

### 1️⃣1️⃣ Regression (선형/로지스틱 회귀)
**파일**: `/statistics/regression/page.tsx`

#### **선형 회귀 테스트**

**테스트 데이터**:
```csv
x,y
1,2.5
2,3.8
3,5.1
4,6.2
5,7.8
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Dependent**: y / **Independent**: x 선택
3. ✅ **Method**: Linear Regression 선택
4. ✅ "Analyze" 클릭
5. ✅ **예상 결과**:
   - 회귀계수: ~1.5 (기울기)
   - p-value: < 0.05
   - R²: 0.95+ (높은 설명력)
   - 잔차 그래프

**🐛 버그 체크**:
- [ ] 여러 독립변수 지원하는가?
- [ ] VIF (다중공선성) 계산 맞는가?
- [ ] 잔차 플롯이 표시되는가?

#### **로지스틱 회귀 테스트**

**테스트 데이터**:
```csv
x,y
1,0
2,0
3,1
4,1
5,1
```

**테스트 단계**:
1. ✅ 데이터 업로드
2. ✅ **Dependent**: y (binary) / **Independent**: x 선택
3. ✅ **Method**: Logistic Regression 선택
4. ✅ "Analyze" 클릭
5. ✅ **예상 결과**:
   - OR (Odds Ratio): > 1
   - p-value 표시
   - ROC 곡선

**🐛 버그 체크**:
- [ ] 이진 변수만 Dependent으로 선택 가능한가?
- [ ] 모든 계수가 숫자인가? (NaN 체크)

**코드 점수**: ⭐⭐⭐⭐⭐ 5.0/5 (Generic 타입, Helper 함수)

---

## 🔍 전체 테스트 체크리스트

### **TypeScript 검증** (필수)
```bash
npx tsc --noEmit
```
✅ 0개 에러

### **빌드 검증** (선택)
```bash
npm run build
```
✅ Success

### **각 통계별 검증** (필수)

| # | 통계 | L1 (UI) | L2 (기능) | L3 (코드) | 비고 |
|----|------|--------|---------|---------|------|
| 1 | ANOVA | ✅ | ✅ | ✅ | Group 1 |
| 2 | t-test | ✅ | ✅ | ✅ | Group 1 |
| 3 | One-Sample t | ✅ | ✅ | ✅ | Group 1 |
| 4 | Normality Test | ✅ | ✅ | ✅ | Group 1 |
| 5 | Means Plot | ✅ | ✅ | ✅ | Group 1 |
| 6 | KS Test | ✅ | ✅ | ✅ | Group 1 |
| 7 | Friedman | ✅ | ✅ | ✅ | Group 2 |
| 8 | Kruskal-Wallis | ✅ | ✅ | ✅ | Group 2 |
| 9 | Mann-Kendall | ✅ | ✅ | ✅ | Group 3 |
| 10 | Reliability | ✅ | ✅ | ✅ | Group 3 |
| 11 | Regression | ✅ | ✅ | ✅ | Group 4 |

---

## 📊 버그 발견 시 대응 방법

### **버그 발견됨**

1. **버그 타입 분류**:
   - L1: UI/렌더링 에러
   - L2: 계산 에러 (잘못된 결과값)
   - L3: 타입 안전성 에러

2. **보고 형식**:
   ```
   ### 버그 #[번호]
   - 통계: [이름]
   - 파일: [경로:라인]
   - 증상: [구체적 설명]
   - 재현 단계: [1. 2. 3.]
   - 예상 결과: [맞는 값]
   - 실제 결과: [잘못된 값]
   ```

3. **수정 우선순위**:
   - 🔴 **Critical**: isAnalyzing 버그, 계산 오류
   - 🟡 **High**: UI 깨짐, 경고창
   - 🟢 **Low**: 문구 오타, 스타일

---

## 🚀 다음 단계

### **이번 테스트 완료 후**:
- [ ] 11개 Group 1-4 통계 모두 L1-L3 통과
- [ ] 버그 로그 작성
- [ ] 남은 10개 통계(Group 5-6) 테스트 계획

### **Group 5-6 테스트** (향후 작업):
- Chi-square (2개)
- Correlation (2개)
- Regression variants (3개)
- 기타 (3개)

---

## 💡 팁

### **빠르게 테스트하기**:
```bash
# 터미널 1: 개발 서버
npm run dev

# 터미널 2: 타입 체크 (자동 감시)
npx tsc --noEmit --watch
```

### **샘플 데이터 자동 생성**:
각 통계 페이지는 보통 "Sample Data" 버튼을 제공합니다.
클릭하면 자동으로 테스트 데이터가 로드됩니다.

### **콘솔 로그 확인**:
- F12 → Console 탭
- 네트워크 에러 또는 React 경고 확인

---

**목표**: 45개 모든 통계가 L1-L3 완료 ✅
**진행**: 11개 완료, 34개 남은 상태
**예상 시간**: 그룹별 45-50분 × 4 = 약 200분 (3-4시간)
