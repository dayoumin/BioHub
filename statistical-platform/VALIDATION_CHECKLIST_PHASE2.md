# ✅ Phase 2: 수동 검증 체크리스트 (사용자용)

**검증 대상**: High Priority 15개 통계 페이지
**예상 시간**: 30분 (페이지당 2분)
**검증 방법**: 브라우저 수동 테스트

---

## 🚀 시작 전 준비

### 1. 개발 서버 실행
```bash
cd statistical-platform
npm run dev
```

브라우저에서 http://localhost:3000 접속 확인

### 2. 테스트 데이터 위치 확인
```
statistical-platform/test-data/
├── anova.csv
├── correlation.csv
├── descriptive.csv
└── ... (15개 CSV 파일)
```

---

## 📋 검증 절차 (페이지당 2분)

### Step 1: 페이지 접속 (10초)
- 브라우저에서 `/statistics/[페이지명]` 이동
- UI 정상 렌더링 확인

### Step 2: 데이터 업로드 (30초)
- "데이터 업로드" 단계
- CSV 파일 선택: `test-data/[페이지명].csv`
- 데이터 미리보기 테이블 표시 확인

### Step 3: 변수 선택 (30초)
- "변수 선택" 단계
- 아래 "변수 매핑표" 참조하여 변수 선택
- 드롭다운 정상 작동 확인

### Step 4: 분석 실행 (30초)
- **"분석" 버튼 클릭** ⚠️ (핵심)
- 로딩 인디케이터 표시 확인 (3-10초)
- 결과 화면 표시 확인:
  - 통계량 테이블 ✓
  - 차트/그래프 (있는 경우) ✓
  - 해석 텍스트 ✓

### Step 5: 에러 체크 (20초)
- F12 → Console 탭 확인
- **에러 메시지 없음** ✅
- (에러 발생 시) 스크린샷 + 메시지 복사

---

## 📊 High Priority 15개 페이지

### ✅ 1. anova (일원분산분석)
- **CSV 파일**: `test-data/anova.csv`
- **변수 매핑**:
  - 요인 (Factor): `group`
  - 종속변수 (Dependent): `value`
- **예상 결과**: F-통계량, p-value, 사후검정 (Tukey HSD)
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 2. correlation (상관분석)
- **CSV 파일**: `test-data/correlation.csv`
- **변수 매핑**:
  - 변수 1: `x`
  - 변수 2: `y`
- **예상 결과**: 상관계수 (r), p-value, 산점도
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 3. descriptive (기술통계)
- **CSV 파일**: `test-data/descriptive.csv`
- **변수 매핑**:
  - 분석 변수: `value` (다중 선택 가능)
- **예상 결과**: 평균, 중앙값, 표준편차, 히스토그램
- **검증 상태**: [ ]
- **비고**: _______________

### ⚠️ 4. regression (회귀분석) - **즉시 수정 필요!**
- **CSV 파일**: `test-data/regression.csv`
- **변수 매핑**:
  - 예측변수 (Predictors): `x1`, `x2` (다중 선택)
  - 종속변수 (Dependent): `y`
- **예상 결과**: 회귀계수, R², F-통계량
- **검증 상태**: [ ] ⚠️ **Phase 1에서 실패 - 작동 안 할 가능성 높음**
- **비고**: _______________

### ✅ 5. t-test (t-검정)
- **CSV 파일**: `test-data/t-test.csv`
- **변수 매핑**:
  - 그룹 변수: `group`
  - 값 변수: `value`
- **예상 결과**: t-통계량, p-value, 평균 차이
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 6. chi-square-independence (카이제곱 독립성 검정)
- **CSV 파일**: `test-data/chi-square-independence.csv`
- **변수 매핑**:
  - 행 변수 (Row): `treatment`
  - 열 변수 (Column): `outcome`
- **예상 결과**: χ² 통계량, p-value, 교차표
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 7. mann-whitney (Mann-Whitney U 검정)
- **CSV 파일**: `test-data/mann-whitney.csv`
- **변수 매핑**:
  - 그룹 변수: `group`
  - 값 변수: `value`
- **예상 결과**: U-통계량, p-value, 순위 합
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 8. normality-test (정규성 검정)
- **CSV 파일**: `test-data/normality-test.csv`
- **변수 매핑**:
  - 분석 변수: `value`
- **예상 결과**: Shapiro-Wilk, Kolmogorov-Smirnov, Q-Q plot
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 9. pca (주성분분석)
- **CSV 파일**: `test-data/pca.csv`
- **변수 매핑**:
  - 분석 변수: `x1`, `x2`, `x3`, `x4` (다중 선택)
- **예상 결과**: 고유값, 분산 설명비율, Scree plot
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 10. kruskal-wallis (Kruskal-Wallis 검정)
- **CSV 파일**: `test-data/kruskal-wallis.csv`
- **변수 매핑**:
  - 그룹 변수: `group`
  - 값 변수: `value`
- **예상 결과**: H-통계량, p-value, 사후검정
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 11. wilcoxon (Wilcoxon 부호순위 검정)
- **CSV 파일**: `test-data/wilcoxon.csv`
- **변수 매핑**:
  - Before: `before`
  - After: `after`
- **예상 결과**: W-통계량, p-value, 중앙값 차이
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 12. one-sample-t (일표본 t-검정)
- **CSV 파일**: `test-data/one-sample-t.csv`
- **변수 매핑**:
  - 분석 변수: `value`
  - 검정값 (Test Value): `25` (수동 입력)
- **예상 결과**: t-통계량, p-value, 신뢰구간
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 13. friedman (Friedman 검정)
- **CSV 파일**: `test-data/friedman.csv`
- **변수 매핑**:
  - 측정값 변수: `time1`, `time2`, `time3` (다중 선택)
- **예상 결과**: χ²r-통계량, p-value, 사후검정
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 14. partial-correlation (편상관분석)
- **CSV 파일**: `test-data/partial-correlation.csv`
- **변수 매핑**:
  - 변수 1: `x`
  - 변수 2: `y`
  - 통제 변수 (Control): `z`
- **예상 결과**: 편상관계수, p-value
- **검증 상태**: [ ]
- **비고**: _______________

### ✅ 15. manova (다변량 분산분석)
- **CSV 파일**: `test-data/manova.csv`
- **변수 매핑**:
  - 요인 (Factor): `group`
  - 종속변수 (Dependents): `y1`, `y2` (다중 선택)
- **예상 결과**: Wilks' Lambda, Pillai's Trace, p-value
- **검증 상태**: [ ]
- **비고**: _______________

---

## 📊 진행 상황 추적

### 현재 상태
- [ ] **검증 완료**: 0/15 (0%)
- [ ] **정상 작동**: 0개
- [ ] **에러 발견**: 0개
- [ ] **수정 필요**: 1개 (regression - Phase 1에서 사전 발견)

### 체크리스트 템플릿 (각 페이지별)

```
[ ] 페이지명
  [ ] Step 1: UI 렌더링 ✓
  [ ] Step 2: CSV 업로드 ✓
  [ ] Step 3: 변수 선택 ✓
  [ ] Step 4: 분석 실행 ✓
  [ ] Step 5: 결과 표시 ✓
  [ ] Step 6: 콘솔 에러 없음 ✓
```

---

## 🚨 에러 발생 시 대응

### 1. 즉시 기록
- 페이지명: _______
- 에러 메시지: _______
- 발생 시점: Step _______
- 스크린샷: 저장 경로 _______

### 2. 콘솔 로그 복사
```
F12 → Console 탭
Ctrl+A → Ctrl+C (전체 복사)
```

### 3. 다음 페이지로 진행
- 한 페이지 에러로 멈추지 말고 15개 모두 테스트
- 나중에 한번에 수정

---

## ✅ 완료 기준

### 성공 (Pass)
- 15개 페이지 모두 정상 작동
- 콘솔 에러 0개
- 결과 화면 정상 표시

### 경고 (Warning)
- 1-2개 페이지에서 사소한 UI 이슈
- 계산 결과는 정상이나 차트 미표시 등

### 실패 (Fail)
- 3개 이상 페이지 에러
- Critical 에러 (분석 버튼 작동 안 함)

---

## 📝 검증 완료 후

### 결과 공유
1. 이 체크리스트 파일 저장
2. 에러 로그 (있는 경우) 복사
3. 스크린샷 (있는 경우) 첨부
4. AI에게 결과 전달

### AI가 수행할 작업
- 발견된 에러 즉시 수정
- TypeScript 컴파일 재확인
- Phase 3 Medium Priority 검증 가이드 제공

---

## 🎯 예상 결과

**최선의 경우**:
- 15/15 페이지 통과 (100%)
- regression 페이지만 수정 후 재테스트

**현실적인 경우**:
- 13-14/15 페이지 통과 (87-93%)
- regression + 1-2개 페이지 수정 필요

**최악의 경우**:
- 10/15 페이지 통과 (67%)
- 여러 페이지 수정 필요 (AI가 즉시 수정 가능)

---

**Updated**: 2025-11-18
**Next**: regression 페이지 수정 → Phase 2 수동 검증 시작
**Estimated Time**: 30분
