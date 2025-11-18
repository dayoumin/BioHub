# 📋 통계 43개 페이지 종합 검증 계획

**작성일**: 2025-11-18
**목표**: Phase 9 리팩토링 완료 후 통계 43개 페이지의 실제 작동 여부 완벽 검증
**방법**: 자동 검증 (코드 분석) + 수동 검증 (브라우저 테스트)

---

## 📊 현황

- **전체 프로젝트**: 45개 (통계 43개 + 데이터 도구 2개)
- **검증 대상**: 통계 43개 (PyodideCore 표준)
- **제외 대상**: 2개 (frequency-table, cross-tabulation - JavaScript 단순 카운팅)

---

## 🎯 검증 전략 (3단계)

### Phase 1: 자동 코드 분석 (AI 수행) ✅
- **도구**: `scripts/test-all-statistics.js` (기존)
- **검증 항목**:
  1. PyodideCore 사용 여부
  2. Worker 메서드 호출 확인
  3. Mock 패턴 검출 (setTimeout, 하드코딩)
  4. TypeScript 컴파일 에러 0개
- **예상 시간**: 5분
- **결과**: 자동 리포트 생성 (통과/실패 목록)

### Phase 2: 핵심 페이지 수동 검증 (사용자 수행) ⏳
- **도구**: 브라우저 (`npm run dev`)
- **대상**: High Priority 15개 (가장 많이 사용되는 통계)
- **검증 항목**:
  1. CSV 업로드 정상 작동
  2. 변수 선택 UI 표시
  3. "분석" 버튼 클릭 가능
  4. 결과 화면 표시
  5. 콘솔 에러 없음
- **예상 시간**: 30분 (페이지당 2분)
- **결과**: 체크리스트 완료

### Phase 3: 전체 페이지 선택적 검증 (사용자 수행) 🔜
- **대상**: Medium Priority 28개 (Phase 2 통과 후)
- **방법**: 랜덤 샘플링 (10개) + 이슈 발견 시 추가 검증
- **예상 시간**: 20분
- **결과**: 주요 이슈 없으면 통과

---

## 📝 Phase 1: 자동 코드 분석 (AI 수행)

### 1-1. 기존 스크립트 실행

```bash
cd statistical-platform
node scripts/test-all-statistics.js
```

**출력 예시**:
```
✅ 1. anova
   계산 방법: PyodideCore
   Workers: [2]
   메서드: one_way_anova

❌ 2. chi-square
   계산 방법: None
   ⚠️ Mock 패턴 검출됨 (2개)
```

### 1-2. TypeScript 컴파일 체크

```bash
cd statistical-platform
npx tsc --noEmit
```

**목표**: 0 errors ✅

### 1-3. 결과 분석

- ✅ **통과**: PyodideCore 사용 + Mock 없음 + TypeScript 에러 없음
- ⚠️ **경고**: PyodideCore 사용하지만 TypeScript 경고 있음
- ❌ **실패**: Mock 패턴 검출 또는 계산 코드 없음

**결과 저장**: `VALIDATION_PHASE1_RESULTS.md` (자동 생성)

---

## 📋 Phase 2: 핵심 페이지 수동 검증 (15개)

### 우선순위 High (가장 많이 사용)

| # | 페이지 | 변수 매핑 | 테스트 데이터 | 검증 상태 |
|---|--------|----------|-------------|----------|
| 1 | **anova** | factor: group, dependent: value | anova.csv | ⏳ |
| 2 | **correlation** | variable1: x, variable2: y | correlation.csv | ⏳ |
| 3 | **descriptive** | variables: [value] | descriptive.csv | ⏳ |
| 4 | **regression** | predictors: [x1, x2], dependent: y | regression.csv | ⏳ |
| 5 | **t-test** | group: group, value: value | t-test.csv | ⏳ |
| 6 | **chi-square-independence** | row: treatment, col: outcome | chi-square-independence.csv | ⏳ |
| 7 | **mann-whitney** | group: group, value: value | mann-whitney.csv | ⏳ |
| 8 | **normality-test** | variable: value | normality-test.csv | ⏳ |
| 9 | **pca** | variables: [x1, x2, x3, x4] | pca.csv | ⏳ |
| 10 | **kruskal-wallis** | group: group, value: value | kruskal-wallis.csv | ⏳ |
| 11 | **wilcoxon** | before: before, after: after | wilcoxon.csv | ⏳ |
| 12 | **one-sample-t** | variable: value | one-sample-t.csv | ⏳ |
| 13 | **friedman** | columns: [time1, time2, time3] | friedman.csv | ⏳ |
| 14 | **partial-correlation** | variable1: x, variable2: y, control: z | partial-correlation.csv | ⏳ |
| 15 | **manova** | factor: group, dependents: [y1, y2] | manova.csv | ⏳ |

### 검증 절차 (페이지당 2분)

**Step 1: 페이지 접속** (10초)
- 브라우저에서 `/statistics/[페이지명]` 이동
- UI 정상 렌더링 확인

**Step 2: 데이터 업로드** (30초)
- "데이터 업로드" 단계
- CSV 파일 선택 (`test-data/[페이지명].csv`)
- 데이터 미리보기 확인

**Step 3: 변수 선택** (30초)
- "변수 선택" 단계
- 위 표의 "변수 매핑" 참조하여 변수 선택
- 드롭다운 정상 작동 확인

**Step 4: 분석 실행** (30초)
- **"분석" 버튼 클릭** ⚠️ (핵심)
- 로딩 인디케이터 표시 확인 (3-10초)
- 결과 화면 표시 확인
  - 통계량 테이블 표시
  - 차트/그래프 표시 (있는 경우)
  - 해석 텍스트 표시

**Step 5: 에러 체크** (20초)
- F12 → Console 탭 확인
- 에러 메시지 없음 ✅
- (에러 발생 시) 스크린샷 + 메시지 복사

### 체크리스트 템플릿

```
[ ] 1. anova
  [ ] UI 렌더링 정상
  [ ] CSV 업로드 성공
  [ ] 변수 선택 가능
  [ ] "분석" 버튼 클릭
  [ ] 결과 화면 표시
  [ ] 콘솔 에러 없음
  비고: _____________________

[ ] 2. correlation
  ...
```

---

## 📋 Phase 3: 전체 페이지 선택적 검증 (28개)

### 우선순위 Medium (28개)

| # | 페이지 | 변수 매핑 | 검증 방식 |
|---|--------|----------|----------|
| 16 | ancova | factor: group, dependent: value, covariate: covariate | 랜덤 샘플 |
| 17 | binomial-test | variable: outcome | 랜덤 샘플 |
| 18 | chi-square | row: row, col: col | 랜덤 샘플 |
| 19 | chi-square-goodness | variable: category | 랜덤 샘플 |
| 20 | cluster | variables: [x1, x2] | 랜덤 샘플 |
| 21 | cochran-q | columns: [time1, time2, time3] | 랜덤 샘플 |
| 22 | discriminant | group: group, predictors: [x1, x2] | 랜덤 샘플 |
| 23 | dose-response | dose: dose, response: response | 랜덤 샘플 |
| 24 | explore-data | variables: [x1, x2, x3] | 이슈 시 검증 |
| 25 | factor-analysis | variables: [x1, x2, x3, x4, x5] | 랜덤 샘플 |
| 26 | ks-test | variable: value | 랜덤 샘플 |
| 27 | mann-kendall | time: time, value: value | 이슈 시 검증 |
| 28 | mcnemar | before: before, after: after | 랜덤 샘플 |
| 29 | means-plot | group: group, value: value | 이슈 시 검증 |
| 30 | mixed-model | subject: subject, group: group, time: time, value: value | 이슈 시 검증 |
| 31 | mood-median | group: group, value: value | 랜덤 샘플 |
| 32 | non-parametric | variable: value | 이슈 시 검증 |
| 33 | ordinal-regression | predictors: [x1, x2], dependent: y | 이슈 시 검증 |
| 34 | poisson | predictors: [x1, x2], dependent: count | 이슈 시 검증 |
| 35 | power-analysis | 파라미터만 입력 | 랜덤 샘플 |
| 36 | proportion-test | group: group, outcome: outcome | 랜덤 샘플 |
| 37 | reliability | items: [item1, item2, item3, item4] | 이슈 시 검증 |
| 38 | response-surface | factors: [x1, x2], response: response | 이슈 시 검증 |
| 39 | runs-test | variable: value | 랜덤 샘플 |
| 40 | sign-test | before: before, after: after | 랜덤 샘플 |
| 41 | stepwise | predictors: [x1, x2, x3], dependent: y | 이슈 시 검증 |
| 42 | welch-t | group: group, value: value | 랜덤 샘플 |
| 43 | chi-square | (수동 입력) | 이슈 시 검증 |

**검증 방식**:
- **랜덤 샘플 (10개)**: Phase 2와 동일한 절차
- **이슈 시 검증**: Phase 1에서 경고/실패 시에만 검증

---

## 🔧 검증 도구 준비

### 1. 테스트 데이터 생성

**위치**: `statistical-platform/test-data/`

**필요한 CSV 파일** (43개):
- Phase 2 High Priority (15개): 우선 생성 ✅
- Phase 3 Medium Priority (28개): 필요 시 생성 ⏳

**자동 생성 스크립트** (선택):
```bash
# scripts/generate-test-data.js 실행 (있다면)
node scripts/generate-test-data.js
```

### 2. 검증 체크리스트 템플릿

**파일명**: `VALIDATION_CHECKLIST.md`

```markdown
# 통계 43개 페이지 검증 체크리스트

## Phase 2: High Priority (15개)

### ✅ 완료: 0/15
### ⚠️ 경고: 0/15
### ❌ 실패: 0/15

---

[ ] **1. anova**
- [ ] UI 렌더링 ✓
- [ ] CSV 업로드 ✓
- [ ] 변수 선택 ✓
- [ ] 분석 실행 ✓
- [ ] 결과 표시 ✓
- [ ] 콘솔 에러 없음 ✓
- 비고: _____________________

[ ] **2. correlation**
...
```

### 3. 에러 로그 템플릿

**파일명**: `VALIDATION_ERRORS.md`

```markdown
# 검증 중 발견된 에러

## Critical (즉시 수정 필요)

### 페이지명: example-page
- **에러**: Cannot read property 'callWorkerMethod' of undefined
- **발생 시점**: "분석" 버튼 클릭 후
- **스크린샷**: screenshots/example-page-error.png
- **콘솔 로그**:
  ```
  TypeError: Cannot read property 'callWorkerMethod' of undefined
    at handleAnalyze (page.tsx:123)
  ```

## Warning (확인 필요)

...
```

---

## 📊 검증 결과 보고서 형식

### 최종 리포트: `VALIDATION_FINAL_REPORT.md`

```markdown
# 통계 43개 페이지 검증 최종 보고서

**검증일**: 2025-11-18
**검증자**: [사용자명]
**소요 시간**: 55분

---

## 📊 전체 결과

| 상태 | 개수 | 비율 |
|------|------|------|
| ✅ 완료 | 40/43 | 93% |
| ⚠️ 경고 | 2/43 | 5% |
| ❌ 실패 | 1/43 | 2% |

---

## ✅ 통과한 페이지 (40개)

1. anova ✅
2. correlation ✅
3. descriptive ✅
...

---

## ⚠️ 경고가 있는 페이지 (2개)

### 1. stepwise
- **문제**: TypeScript 타입 캐스팅 (`as never`) 사용
- **영향**: 동작은 정상이나 타입 안전성 저하
- **권장**: 타입 정의 개선 필요

---

## ❌ 실패한 페이지 (1개)

### 1. chi-square
- **문제**: "분석" 버튼 클릭 시 에러 발생
- **에러**: `TypeError: Cannot read property 'row' of undefined`
- **원인**: 변수 매핑 누락
- **수정 방법**: [상세 설명]

---

## 📝 권장 사항

1. **즉시 수정 필요** (1개): chi-square
2. **개선 권장** (2개): stepwise, explore-data
3. **추가 테스트 필요**: 엣지 케이스 (결측치, 이상치)
```

---

## 🚀 실행 가이드

### AI가 수행할 작업 (자동)

1. **Phase 1 실행**
   ```bash
   cd statistical-platform
   node scripts/test-all-statistics.js
   npx tsc --noEmit
   ```

2. **Phase 1 결과 분석**
   - 통과/경고/실패 페이지 분류
   - `VALIDATION_PHASE1_RESULTS.md` 생성

3. **Phase 2/3 테스트 데이터 준비**
   - 필요한 CSV 파일 확인
   - 누락된 파일 생성

4. **검증 체크리스트 생성**
   - `VALIDATION_CHECKLIST.md` 생성
   - 사용자에게 수동 검증 가이드 제공

### 사용자가 수행할 작업 (수동)

1. **개발 서버 실행**
   ```bash
   cd statistical-platform
   npm run dev
   ```

2. **Phase 2 검증** (30분)
   - High Priority 15개 페이지 순서대로 테스트
   - 체크리스트 작성

3. **Phase 3 검증** (20분, 선택)
   - 랜덤 샘플 10개 테스트
   - 이슈 발견 시 추가 테스트

4. **결과 공유**
   - 완료된 체크리스트 전달
   - 에러 로그 전달 (있는 경우)

---

## 📅 예상 일정

| Phase | 담당 | 작업 시간 | 완료 예정 |
|-------|------|----------|----------|
| Phase 1 (자동 코드 분석) | AI | 5분 | 즉시 |
| Phase 2 (High Priority 15개) | 사용자 | 30분 | D+1 |
| Phase 3 (Medium Priority 10개) | 사용자 | 20분 | D+1 |
| 최종 리포트 작성 | AI | 5분 | D+1 |

**총 소요 시간**: 약 1시간

---

## 🎯 성공 기준

### 필수 달성 목표
1. **Phase 1 통과율**: 95% 이상 (41/43개)
2. **Phase 2 통과율**: 100% (15/15개)
3. **Critical 에러**: 0개
4. **TypeScript 에러**: 0개

### 추가 목표
- Phase 3 통과율 90% 이상
- 콘솔 경고 메시지 최소화
- 사용자 경험 개선 사항 도출

---

## 📞 문제 발생 시 대응

### AI 자동 대응 가능
- TypeScript 컴파일 에러 수정
- 변수 매핑 오류 수정
- Worker 메서드 호출 오류 수정

### 사용자 확인 필요
- 계산 결과 정확성 검증 (R/SPSS 비교)
- UI/UX 개선 사항
- 성능 이슈 (느린 응답)

---

**Updated**: 2025-11-18
**Next**: Phase 1 자동 실행 (AI) → Phase 2 가이드 제공 (사용자)