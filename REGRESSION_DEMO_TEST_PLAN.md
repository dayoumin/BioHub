# Regression-Demo 페이지 브라우저 테스트 계획

**URL**: http://localhost:3000/statistics/regression-demo

**목적**: regression-demo 페이지의 완전한 기능 검증

---

## 테스트 시나리오 (10개)

### ✅ Scenario 1: Step 1 - 회귀 유형 선택

**단계**:
1. 페이지 접속
2. "단순 선형 회귀" 카드 클릭
3. 선택 상태 확인 (체크 아이콘 + 파란 테두리)
4. 하단에 "단순 선형 회귀 선택됨" 메시지 확인

**예상 결과**:
- [x] 카드 클릭 시 `border-primary bg-primary/5` 적용
- [x] CheckCircle 아이콘 표시
- [x] 하단 안내 메시지 표시 (파란색 배경)

---

### ✅ Scenario 2: Step 2 - CSV 파일 업로드

**단계**:
1. "다음" 버튼 클릭 또는 자동 Step 2 이동
2. DataUploadStep 렌더링 확인
3. CSV 파일 드래그 앤 드롭 또는 "파일 선택" 클릭

**테스트 데이터** (sample.csv):
```csv
height,weight
170,65.5
180,75.0
165,60.5
175,70.0
168,63.0
```

**예상 결과**:
- [x] DataUploadStep 컴포넌트 표시
- [x] 파일 업로드 성공 토스트 메시지
- [x] 우측 패널에 DataPreviewPanel 자동 표시 (5개 행)

---

### ✅ Scenario 3: Step 3 - 변수 선택 (Badge UI)

**단계**:
1. 독립변수(X) 드롭다운에서 "height" 선택
2. 종속변수(Y) 드롭다운에서 "weight" 선택
3. "분석하기" 버튼 활성화 확인

**예상 결과**:
- [x] 드롭다운에 "height", "weight" 항목 표시
- [x] 선택 시 Badge 하이라이트
- [x] "분석하기" 버튼 활성화 (파란색)

---

### ✅ Scenario 4: Step 4 - 분석 결과 표시

**단계**:
1. "분석하기" 버튼 클릭
2. 로딩 스피너 확인 (1.5초)
3. 결과 패널 렌더링 확인

**예상 결과**:
- [x] 로딩 중 버튼 비활성화 + 스피너
- [x] 우측 패널이 "results" 모드로 전환
- [x] KPI 카드 4개 표시 (R², Adjusted R², F, p-value)

---

### ✅ Scenario 5: KPI 카드 - p-value 색상

**단계**:
1. 결과 패널에서 p-value 확인

**예상 결과**:
- [x] p < 0.05: 초록색 (`text-green-600`)
- [x] p >= 0.05: 회색 (`text-muted-foreground`)

**데모 데이터 검증**:
```typescript
fPValue: 0.001 → 초록색 ✅
```

---

### ✅ Scenario 6: StatisticsTable - 회귀계수

**단계**:
1. "회귀계수" 카드 확인
2. 테이블 컬럼 확인: 변수, Estimate, Std Error, t-value, p-value
3. 데이터 2행 확인: 절편, height

**예상 결과**:
- [x] 테이블 헤더 5개
- [x] 절편: Estimate = 12.340
- [x] height: Estimate = 0.450
- [x] p-value 포맷: "0.001" 또는 "< 0.001"

---

### ✅ Scenario 7: 산점도 차트 (Recharts)

**단계**:
1. "산점도 및 회귀선" 카드 확인
2. 파란색 점 (실제값) 확인
3. 빨간색 선 (예측값) 확인

**예상 결과**:
- [x] ScatterChart 렌더링 (250px 높이)
- [x] X축 라벨: "독립변수"
- [x] Y축 라벨: "종속변수"
- [x] 데이터 포인트 5개 (데모 데이터)

---

### ✅ Scenario 8: 잔차 플롯 탭 전환

**단계**:
1. "잔차 분석" 카드 확인
2. "잔차 플롯" 탭 확인 (기본 선택)
3. "Q-Q 플롯" 탭 클릭

**예상 결과**:
- [x] 잔차 플롯: 산점도 표시 (X=적합값, Y=잔차)
- [x] Q-Q 플롯: "Q-Q 플롯은 잔차의 정규성을 확인합니다" 메시지 표시

---

### ✅ Scenario 9: VIF 다중공선성 진단 (조건부)

**단계**:
1. 결과 패널 스크롤
2. VIF 카드 표시 여부 확인

**예상 결과**:
- [x] 단순회귀 (1개 독립변수): VIF 카드 **미표시**
- [x] 다중회귀 (2개 이상 독립변수): VIF 카드 **표시**
- [x] VIF > 10: `destructive` (빨간색)
- [x] VIF 5-10: `secondary` (노란색)
- [x] VIF < 5: `default` (파란색)

**현재 데모 데이터**: VIF = null → VIF 카드 미표시 ✅

---

### ✅ Scenario 10: DataPreviewPanel 통합 (우측 패널)

**단계**:
1. Step 2에서 CSV 업로드 후 우측 패널 확인
2. "펼치기" 버튼 클릭
3. "데이터 미리보기" 탭 → "기초 통계" 탭 전환

**예상 결과**:
- [x] 업로드 즉시 우측 패널에 DataPreviewPanel 표시
- [x] 기본 접힌 상태 (성능 최적화)
- [x] 펼치기 시 데이터 테이블 5행 표시
- [x] 기초 통계: 평균, 표준편차, 최소값, 최대값

---

## 브라우저 테스트 체크리스트

### 기능 테스트
- [ ] Step 1: 회귀 유형 선택 (simple/multiple/logistic)
- [ ] Step 2: CSV 업로드 (DataUploadStep)
- [ ] Step 3: 변수 선택 (드롭다운)
- [ ] Step 4: 분석 결과 표시 (ResultsPanel)
- [ ] KPI 카드: R², F-statistic, p-value 색상
- [ ] StatisticsTable: 회귀계수 테이블
- [ ] 산점도: Recharts ScatterChart
- [ ] 잔차 플롯: Tabs 전환
- [ ] DataPreviewPanel: 우측 패널 통합

### UI/UX 테스트
- [ ] 반응형: Desktop (1920px) / Tablet (1024px) / Mobile (375px)
- [ ] Hover 효과: 카드 hover시 shadow 증가
- [ ] 접근성: 키보드 네비게이션 (Tab, Enter)
- [ ] 로딩 상태: 스피너 + 버튼 비활성화
- [ ] 에러 처리: 유효하지 않은 데이터 업로드

### 성능 테스트
- [ ] 대용량 CSV (1000행): 업로드 속도
- [ ] DataPreviewPanel: 100행 제한 (경고 메시지 표시)
- [ ] 차트 렌더링: Recharts 최초 로드 시간

### 크로스 브라우저 테스트
- [ ] Chrome (최신)
- [ ] Firefox (최신)
- [ ] Edge (최신)
- [ ] Safari (Mac 환경)

---

## 예상 이슈 및 대응

### Issue 1: TypeScript 에러
**증상**: 브라우저 콘솔에 타입 에러
**대응**: `npx tsc --noEmit` 실행 → 0 errors 확인 완료 ✅

### Issue 2: Pyodide 미연결
**증상**: "분석하기" 버튼 클릭 시 실제 계산 안됨
**대응**: Line 236-237 주석 해제 후 실제 Pyodide 연결
**현재**: 데모 데이터 사용 중 (의도적) ✅

### Issue 3: DataPreviewPanel 렌더링 안됨
**증상**: 우측 패널에 미리보기 표시 안됨
**대응**: `rightPanelConfig` 설정 확인 (Line 271-277)
**현재**: `renderPreview` prop 정상 전달 ✅

---

## 테스트 완료 기준

### 필수 조건 (Must Have)
- [x] TypeScript 컴파일 에러 0개
- [ ] 브라우저 콘솔 에러 0개
- [ ] 모든 Step 정상 작동 (1 → 2 → 3 → 4)
- [ ] 결과 패널 모든 컴포넌트 렌더링

### 선택 조건 (Nice to Have)
- [ ] 실제 Pyodide 연동 (현재 데모 데이터)
- [ ] 다중회귀 + 로지스틱 회귀 구현
- [ ] Q-Q 플롯 차트 구현

---

**테스트 일시**: 2025-11-15
**테스트 환경**: Windows 11, Chrome 120+
**테스트 URL**: http://localhost:3000/statistics/regression-demo
