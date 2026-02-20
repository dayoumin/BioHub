# 📋 통계 플랫폼 테스트 가이드

## 🏗️ 테스트 구조

```
stats/
├── __tests__/                        # 통합 테스트
│   └── statistics/
│       └── statistical-validation.test.ts  # Pyodide 통계 검증 (17개 테스트)
│
├── lib/statistics/__tests__/        # 단위 테스트
│   └── method-mapping.test.ts       # 메서드 매핑 테스트 (19개 테스트)
│
├── app/                             # 브라우저 테스트 페이지
│   ├── validation/page.tsx          # 실시간 통계 검증 대시보드
│   └── validation-full/page.tsx     # 전체 통계 함수 테스트
│
├── test-data/                        # 테스트 데이터
│   ├── datasets/                    # 표준 테스트 데이터셋
│   │   └── standard-datasets.ts
│   └── reference-results/            # R/SPSS 검증 결과
│       └── r-reference-results.ts
│
└── jest.setup.js                    # Jest 환경 설정

```

## 🧪 테스트 유형

### 1. 단위 테스트 (Unit Tests)
**파일**: `lib/statistics/__tests__/method-mapping.test.ts`
- 통계 메서드 매핑 로직
- 추천 알고리즘
- 요구사항 검증
- **실행**: `npm test method-mapping`

### 2. 통합 테스트 (Integration Tests)
**파일**: `__tests__/statistics/statistical-validation.test.ts`
- Pyodide + SciPy 통합
- R/SPSS 결과와 비교 검증
- 허용 오차: 0.0001
- **참고**: Jest 환경에서는 Pyodide 로딩 이슈로 실패 (브라우저에서만 작동)

### 3. 브라우저 테스트 (Browser Tests)
**URL**: http://localhost:3000/validation
- 실제 브라우저 환경에서 Pyodide 실행
- 실시간 통계 계산 검증
- 시각적 결과 확인

## 📊 테스트 커버리지

### ✅ 현재 구현된 테스트 (17개)
1. **T-검정**
   - 독립표본 t-test
   - 대응표본 t-test
   - Welch's t-test

2. **분산분석**
   - 일원분산분석 (One-way ANOVA)
   - Tukey HSD 사후검정

3. **상관분석**
   - Pearson 상관계수
   - Spearman 순위상관

4. **회귀분석**
   - 단순선형회귀

5. **정규성/등분산성**
   - Shapiro-Wilk 검정
   - Levene 검정

6. **비모수 검정**
   - Mann-Whitney U
   - Wilcoxon signed-rank
   - Kruskal-Wallis

7. **기타**
   - 카이제곱 독립성 검정
   - 기술통계
   - 이상치 탐지 (IQR)

### ❌ 미구현 테스트
- 이원분산분석 (Two-way ANOVA)
- 다중회귀분석
- 로지스틱 회귀
- PCA (주성분분석)
- 요인분석
- 군집분석
- 시계열분석
- Cronbach's Alpha
- Friedman test
- Bonferroni/Games-Howell/Dunn 사후검정

## 🚀 테스트 실행 방법

### 방법 1: 브라우저 테스트 (권장)
```bash
# 1. 개발 서버 시작
cd stats
npm run dev

# 2. 브라우저 열기
start chrome "http://localhost:3000/validation"

# 3. "테스트 실행" 버튼 클릭
```

### 방법 2: Jest 단위 테스트
```bash
# 메서드 매핑 테스트만
npm test method-mapping

# 모든 테스트 (Pyodide 제외)
npm test -- --testPathIgnorePatterns=statistical-validation
```

### 방법 3: 모든 테스트 시도
```bash
# 타임아웃 증가하여 실행 (Pyodide 로딩 시도)
npm test -- --testTimeout=60000
```

## 🔧 Pyodide 로딩 이슈 해결

### 현재 상황
- **문제**: Jest의 jsdom 환경에서 Pyodide(WebAssembly) CDN 로딩 실패
- **증상**: 30초 타임아웃 후 테스트 실패
- **원인**: Node.js 환경에서 브라우저 전용 API 미지원

### 해결 방안

#### 1. 모킹 (빠른 테스트)
```javascript
// jest.setup.js
global.loadPyodide = jest.fn().mockResolvedValue({
  runPythonAsync: jest.fn().mockImplementation(() =>
    // 미리 계산된 값 반환
    Promise.resolve({ statistic: -2.121, pvalue: 0.101 })
  )
})
```

#### 2. E2E 테스트 (추천)
```bash
# Playwright 설치
npm install --save-dev @playwright/test

# 브라우저 테스트 실행
npx playwright test
```

#### 3. Node.js용 Pyodide
```bash
# pyodide 패키지 설치
npm install --save-dev pyodide

# 서비스 수정하여 NODE_ENV=test일 때 다른 로더 사용
```

## 📈 테스트 품질 지표

### 목표
- **정확도**: R/SPSS 결과와 0.0001 이내 오차
- **커버리지**: 핵심 통계 함수 100%
- **성능**: 1000개 데이터 처리 < 1초

### 현재 상태
- **구현**: 17/29 함수 (59%)
- **정확도**: ✅ (검증된 함수 모두 통과)
- **성능**: ✅ (n=1000 테스트 통과)

## 🛠️ 테스트 데이터

### 표준 데이터셋
```typescript
// test-data/datasets/standard-datasets.ts
export const standardDatasets = {
  normal: [/* 정규분포 데이터 */],
  skewed: [/* 왜도 데이터 */],
  outliers: [/* 이상치 포함 */],
  paired: [/* 대응 데이터 */]
}
```

### R 검증 결과
```typescript
// test-data/reference-results/r-reference-results.ts
export const ReferenceResults = {
  tTest: {
    independent: { statistic: -2.121, pValue: 0.101, df: 4 },
    paired: { statistic: 3.234, pValue: 0.023, df: 4 }
  }
}
```

## 📝 향후 계획

1. **단기 (1주)**
   - Playwright E2E 테스트 구현
   - 미구현 함수 테스트 추가

2. **중기 (2-3주)**
   - CI/CD 파이프라인 구축
   - 자동화된 회귀 테스트

3. **장기 (1개월+)**
   - 성능 벤치마크 대시보드
   - 테스트 커버리지 90% 달성

## 💡 팁

- **브라우저 테스트 우선**: Pyodide는 브라우저 환경에서만 완전히 작동
- **레퍼런스 데이터 활용**: R/SPSS 결과와 항상 비교
- **시각적 검증**: validation 페이지에서 실시간 확인
- **성능 고려**: 대용량 데이터는 Web Worker 사용

---

*최종 업데이트: 2025-09-17*
*작성자: Claude Code Assistant*