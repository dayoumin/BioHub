# 42개 통계 페이지 수동 테스트 가이드

**목적**: 각 통계 페이지의 "분석" 버튼이 정상 작동하는지 확인

**작성일**: 2025-11-15
**테스트 범위**: 42개 통계 페이지

---

## 📋 테스트 절차

### 1. 개발 서버 실행
```bash
cd statistical-platform
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 2. 각 페이지 테스트 (3단계)

#### Step 1: 데이터 업로드
1. 통계 페이지 이동 (예: `/statistics/t-test`)
2. "데이터 업로드" 단계에서 CSV 파일 선택
   - 테스트 데이터 위치: `test-data/[페이지명].csv`
   - 예: `test-data/t-test.csv`

#### Step 2: 변수 선택
1. "변수 선택" 단계에서 적절한 변수 선택
   - 각 통계별 필수 변수는 아래 "변수 매핑표" 참조

#### Step 3: 분석 실행
1. **"분석" 버튼 클릭** ⚠️ (핵심)
2. 로딩 인디케이터 표시 확인
3. 결과 화면 표시 확인
4. 에러 없이 완료 확인

---

## 📊 42개 통계 페이지 변수 매핑표

### Group 1: T-Tests (3개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| t-test | t-test.csv | group: group, value: value | two-sample만 지원 |
| one-sample-t | one-sample-t.csv | variable: value, testValue: 25 | |
| welch-t | welch-t.csv | group: group, value: value | |

### Group 2: ANOVA (2개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| anova | anova.csv | factor: group, dependent: value | |
| ancova | ancova.csv | factor: group, dependent: value, covariate: covariate | |

### Group 3: Chi-Square (3개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| chi-square | chi-square.csv | row: row, col: col | 수동 입력 방식 |
| chi-square-independence | chi-square-independence.csv | row: treatment, col: outcome | |
| chi-square-goodness | chi-square-goodness.csv | variable: category | |

### Group 4: Correlation (2개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| correlation | correlation.csv | variable1: x, variable2: y | |
| partial-correlation | partial-correlation.csv | variable1: x, variable2: y, control: z | |

### Group 5: Non-parametric (10개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| mann-whitney | mann-whitney.csv | group: group, value: value | |
| wilcoxon | wilcoxon.csv | before: before, after: after | |
| kruskal-wallis | kruskal-wallis.csv | group: group, value: value | |
| friedman | friedman.csv | columns: [time1, time2, time3] | |
| mood-median | mood-median.csv | group: group, value: value | |
| sign-test | sign-test.csv | before: before, after: after | |
| runs-test | runs-test.csv | variable: value | |
| cochran-q | cochran-q.csv | columns: [time1, time2, time3] | |
| mcnemar | mcnemar.csv | before: before, after: after | |
| ks-test | ks-test.csv | variable: value | |

### Group 6: Regression (4개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| regression | regression.csv | predictors: [x1, x2], dependent: y | |
| stepwise | stepwise.csv | predictors: [x1, x2, x3], dependent: y | |
| ordinal-regression | ordinal-regression.csv | predictors: [x1, x2], dependent: y | y는 Low/Medium/High |
| poisson | poisson.csv | predictors: [x1, x2], dependent: count | count는 정수 |

### Group 7: Multivariate (3개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| manova | manova.csv | factor: group, dependents: [y1, y2] | |
| pca | pca.csv | variables: [x1, x2, x3, x4] | |
| factor-analysis | factor-analysis.csv | variables: [x1, x2, x3, x4, x5] | ✅ PyodideCore 사용 |

### Group 8: 기타 (15개)

| 페이지 | CSV 파일 | 변수 매핑 | 비고 |
|-------|---------|----------|------|
| descriptive | descriptive.csv | variables: [value] | |
| normality-test | normality-test.csv | variable: value | |
| binomial-test | binomial-test.csv | variable: outcome | Success/Failure |
| proportion-test | proportion-test.csv | group: group, outcome: outcome | |
| power-analysis | - | 파라미터만 입력 | effectSize, alpha, power |
| cluster | cluster.csv | variables: [x1, x2] | |
| discriminant | discriminant.csv | group: group, predictors: [x1, x2] | |
| reliability | reliability.csv | items: [item1, item2, item3, item4] | |
| mann-kendall | mann-kendall.csv | time: time, value: value | |
| means-plot | means-plot.csv | group: group, value: value | |
| explore-data | explore-data.csv | variables: [x1, x2, x3] | |
| dose-response | dose-response.csv | dose: dose, response: response | |
| response-surface | response-surface.csv | factors: [x1, x2], response: response | |
| mixed-model | mixed-model.csv | subject: subject, group: group, time: time, value: value | |
| non-parametric | non-parametric.csv | variable: value | |

---

## ✅ 테스트 체크리스트

각 페이지 테스트 시 아래 항목을 확인하세요:

### 기본 동작
- [ ] CSV 파일 업로드 성공
- [ ] 변수 선택 UI 정상 표시
- [ ] "분석" 버튼 클릭 가능
- [ ] 로딩 인디케이터 표시

### 분석 실행
- [ ] `isAnalyzing` 상태 true → false 전환
- [ ] PyodideCore 호출 성공
- [ ] Worker 응답 정상 수신
- [ ] 결과 화면 표시

### 에러 처리
- [ ] 콘솔에 에러 메시지 없음
- [ ] try-catch 정상 작동
- [ ] 사용자에게 에러 메시지 표시 (에러 발생 시)

---

## 🚨 알려진 이슈

### Critical (즉시 수정 필요)
없음 ✅

### Warning (확인 필요)
1. **stepwise**: `as never` 타입 캐스팅 사용
2. **correlation**: Worker 2 'correlation' 메서드 존재 확인 필요

### 미구현 기능
1. **t-test**: one-sample, paired 탭 비활성화됨 (준비중)
2. **chi-square**: 수동 입력 방식 (데이터 업로드 미지원)

---

## 📝 테스트 결과 기록

### 테스트 진행 상황

| 상태 | 개수 | 설명 |
|------|------|------|
| ✅ 완료 | 0/42 | 정상 동작 확인 |
| ⚠️ 경고 | 0/42 | 동작하나 개선 필요 |
| ❌ 실패 | 0/42 | 에러 발생 |
| ⏭️ 스킵 | 0/42 | 테스트 불가 |

### 실패한 페이지 (있는 경우)

| 페이지 | 에러 메시지 | 스크린샷 |
|-------|------------|---------|
| - | - | - |

---

## 🎯 빠른 테스트 (우선순위)

시간이 제한적인 경우, 다음 페이지들을 우선 테스트하세요:

### High Priority (10개)
1. **t-test** - 가장 많이 사용
2. **anova** - ANOVA 그룹 대표
3. **regression** - Regression 그룹 대표
4. **correlation** - 상관분석
5. **descriptive** - 기술통계
6. **chi-square-independence** - 카이제곱 검정
7. **mann-whitney** - 비모수 검정
8. **normality-test** - 정규성 검정
9. **pca** - 다변량 분석
10. **factor-analysis** - ✅ 수정된 페이지

### Medium Priority (10개)
11. wilcoxon
12. kruskal-wallis
13. one-sample-t
14. friedman
15. stepwise (⚠️ 타입 캐스팅 이슈)
16. partial-correlation
17. manova
18. binomial-test
19. proportion-test
20. reliability

### Low Priority (22개)
나머지 페이지들

---

## 🛠️ 자동화 스크립트 (선택)

Playwright를 사용한 자동 테스트 (설정 필요):

```bash
# Playwright 설치 (1회만)
npx playwright install chromium

# 테스트 데이터 생성 (이미 완료됨)
node scripts/playwright-test-runner.js

# TODO: Playwright 자동 테스트 스크립트 작성 필요
```

---

## 📞 문제 발생 시

1. **개발 서버 재시작**
   ```bash
   # Ctrl+C로 중단 후
   npm run dev
   ```

2. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 에러 메시지 복사

3. **TypeScript 에러 체크**
   ```bash
   cd statistical-platform
   npx tsc --noEmit
   ```

4. **Git 상태 확인**
   ```bash
   git status
   git diff
   ```

---

**Updated**: 2025-11-15
**Author**: Claude Code
**Status**: Ready for Testing
