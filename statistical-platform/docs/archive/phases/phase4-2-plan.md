# Phase 4-2: 다양한 통계 메서드 런타임 테스트 계획

**시작 예정**: 2025-10-03
**예상 소요**: 1-2일
**상태**: 준비 완료

---

## 목표

Phase 4-1에서 검증한 기술통계(descriptive) 외에 **다양한 통계 메서드**가 실제 브라우저 환경에서 정상 작동하는지 검증

---

## 현재 상태

### ✅ Phase 4-1 완료 (2025-10-02)
- Pyodide 초기화 성공 (11.35초)
- descriptive (기술통계) 검증 완료
- 싱글톤 패턴 44배 성능 개선 확인
- E2E 테스트 3/3 통과

### 🎯 Phase 4-2 목표
- **10-15개 대표 메서드** 런타임 검증
- **R/SPSS 결과**와 정확도 비교
- **성능 벤치마크** 문서 작성

---

## 테스트할 메서드 (우선순위)

### Tier 1: 기본 통계 (많이 사용됨)
1. ✅ **descriptive** (완료) - 기술통계
2. **correlation** - 상관분석 (Pearson/Spearman)
3. **tTest** - t-검정 (독립/대응)
4. **anova** - 분산분석 (일원/이원)
5. **chiSquare** - 카이제곱 검정

### Tier 2: 회귀/비모수 (중요 분석)
6. **linearRegression** - 선형회귀
7. **logisticRegression** - 로지스틱 회귀
8. **mannWhitneyU** - Mann-Whitney U 검정
9. **kruskalWallis** - Kruskal-Wallis 검정
10. **wilcoxonTest** - Wilcoxon 검정

### Tier 3: 고급 분석 (Groups 5-6)
11. **partialCorrelation** - 부분상관분석
12. **factorAnalysis** - 요인분석
13. **reliabilityAnalysis** - 신뢰도 분석
14. **stepwiseRegression** - 단계적 회귀
15. **powerAnalysis** - 검정력 분석

---

## 작업 계획

### 1단계: 테스트 인프라 구축 (2시간)

**작업 내용**:
- 공통 테스트 헬퍼 함수 작성
- 테스트 데이터셋 준비 (CSV 파일)
- R/SPSS 결과 레퍼런스 데이터 준비

**파일**:
```
e2e/
├── helpers/
│   ├── test-data.ts          - 공통 테스트 데이터
│   ├── assertions.ts          - 공통 검증 함수
│   └── pyodide-utils.ts       - Pyodide 유틸리티
├── fixtures/
│   ├── sample-data-1.csv      - 기본 데이터셋
│   ├── sample-data-2.csv      - 회귀 데이터셋
│   └── reference-results.json - R/SPSS 결과
└── pyodide-methods.spec.ts    - 메서드별 테스트
```

---

### 2단계: Tier 1 메서드 테스트 (3-4시간)

#### Test: correlation (상관분석)
**테스트 데이터**: 두 변수 연속형
```typescript
test('correlation - Pearson', async ({ page }) => {
  // 데이터: [x: [1,2,3,4,5], y: [2,4,5,4,5]]
  // 예상: r = 0.775, p < 0.05
})
```

**검증 항목**:
- Pearson 상관계수 정확도 (0.0001 오차)
- p-value 정확도
- Spearman/Kendall 옵션

---

#### Test: tTest (t-검정)
**테스트 데이터**: 두 그룹
```typescript
test('tTest - Independent', async ({ page }) => {
  // 그룹1: [23, 25, 27, 29]
  // 그룹2: [30, 32, 34, 36]
  // 예상: t = -3.xx, p < 0.05
})
```

**검증 항목**:
- t-통계량 정확도
- 자유도 계산
- p-value 정확도
- 95% 신뢰구간

---

#### Test: anova (분산분석)
**테스트 데이터**: 3개 그룹
```typescript
test('anova - One-way', async ({ page }) => {
  // 그룹1: [10, 12, 14]
  // 그룹2: [15, 17, 19]
  // 그룹3: [20, 22, 24]
  // 예상: F = xx.xx, p < 0.001
})
```

**검증 항목**:
- F-통계량 정확도
- 사후검정 (Tukey HSD)
- 효과 크기 (eta-squared)

---

#### Test: chiSquare (카이제곱)
**테스트 데이터**: 분할표
```typescript
test('chiSquare - 2x2', async ({ page }) => {
  // [[10, 20], [30, 40]]
  // 예상: chi2 = xx.xx, p < 0.05
})
```

**검증 항목**:
- 카이제곱 통계량
- p-value
- 기대빈도

---

### 3단계: Tier 2 메서드 테스트 (3-4시간)

#### Test: linearRegression
```typescript
test('linearRegression', async ({ page }) => {
  // x: [1, 2, 3, 4, 5]
  // y: [2.1, 3.9, 6.2, 8.1, 9.8]
  // 예상: slope = 1.96, intercept = 0.14, R^2 = 0.998
})
```

**검증 항목**:
- 회귀계수 (slope, intercept)
- R-squared
- p-value
- 잔차분석

---

#### Test: logisticRegression
```typescript
test('logisticRegression', async ({ page }) => {
  // X: [[1, 2], [2, 3], [3, 4], [4, 5]]
  // y: [0, 0, 1, 1]
  // 예상: coefficients, odds ratio
})
```

---

#### Test: mannWhitneyU (비모수)
```typescript
test('mannWhitneyU', async ({ page }) => {
  // 그룹1: [1, 2, 3, 4, 5]
  // 그룹2: [6, 7, 8, 9, 10]
  // 예상: U = 0, p < 0.01
})
```

---

### 4단계: Tier 3 메서드 테스트 (2-3시간)

#### Test: partialCorrelation (Groups 5-6)
```typescript
test('partialCorrelation', async ({ page }) => {
  // X, Y, Z 세 변수
  // 예상: partial r (X, Y | Z) 계산
})
```

---

#### Test: factorAnalysis
```typescript
test('factorAnalysis', async ({ page }) => {
  // 5변수 데이터셋
  // 예상: 2개 요인 추출, 요인부하량
})
```

---

### 5단계: 성능 벤치마크 (2시간)

**측정 항목**:
```typescript
interface PerformanceMetrics {
  method: string
  dataSize: number
  initTime: number      // Pyodide 초기화 (첫 실행만)
  calcTime: number      // 계산 시간
  totalTime: number     // 총 시간
  cached: boolean       // 캐시 사용 여부
}
```

**테스트 시나리오**:
1. 소규모 데이터 (n=50)
2. 중규모 데이터 (n=500)
3. 대규모 데이터 (n=5000)

**목표**:
- 소규모: < 1초
- 중규모: < 3초
- 대규모: < 10초

---

### 6단계: R/SPSS 결과 비교 (2시간)

**작업**:
1. R 스크립트로 레퍼런스 결과 생성
2. SPSS 결과와 비교 (가능한 경우)
3. 오차 범위 확인 (0.0001 이내)

**R 스크립트 예시**:
```r
# correlation
data <- data.frame(x = c(1,2,3,4,5), y = c(2,4,5,4,5))
result <- cor.test(data$x, data$y)
print(result$estimate)  # r
print(result$p.value)   # p-value

# t-test
group1 <- c(23, 25, 27, 29)
group2 <- c(30, 32, 34, 36)
result <- t.test(group1, group2)
print(result)
```

---

### 7단계: 문서화 (1시간)

**작성 문서**:
1. `phase4-2-complete.md` - 완료 보고서
2. `performance-benchmark.md` - 성능 벤치마크
3. `accuracy-validation.md` - 정확도 검증 결과

**내용**:
- 테스트 결과 요약 (통과율)
- 성능 지표
- R/SPSS 비교 결과
- 발견된 이슈 및 해결 방법

---

## 예상 일정

| 단계 | 작업 | 예상 시간 | 완료 기준 |
|------|------|-----------|-----------|
| 1 | 테스트 인프라 | 2시간 | 헬퍼 함수, 데이터 준비 |
| 2 | Tier 1 테스트 | 4시간 | 5개 메서드 검증 |
| 3 | Tier 2 테스트 | 4시간 | 5개 메서드 검증 |
| 4 | Tier 3 테스트 | 3시간 | 5개 메서드 검증 |
| 5 | 성능 벤치마크 | 2시간 | 3가지 데이터 크기 |
| 6 | R/SPSS 비교 | 2시간 | 10개 메서드 검증 |
| 7 | 문서화 | 1시간 | 3개 문서 작성 |
| **총계** | | **18시간** | **15개 메서드, 3개 문서** |

**실제 소요 예상**: 1-2일 (하루 8-10시간 작업 기준)

---

## 성공 기준

### 필수 (Must Have)
- [ ] 15개 메서드 모두 런타임 테스트 통과
- [ ] 10개 메서드 R 결과와 0.0001 오차 이내
- [ ] 성능 벤치마크 문서 작성
- [ ] E2E 테스트 안정성 90% 이상

### 권장 (Should Have)
- [ ] 5개 메서드 SPSS 결과와 비교
- [ ] 대규모 데이터 (n=5000) 처리 성공
- [ ] 에러 처리 시나리오 테스트

### 선택 (Nice to Have)
- [ ] 추가 메서드 테스트 (20개 이상)
- [ ] 시각화 결과 검증
- [ ] 자동화 CI/CD 파이프라인

---

## 리스크 및 대응

### 리스크 1: Pyodide 패키지 누락
**발생 확률**: 중간
**영향도**: 높음
**대응**:
- 필요 패키지 사전 확인 (statsmodels, sklearn 등)
- 동적 로딩 로직 검토
- 대체 라이브러리 검토

### 리스크 2: 계산 시간 초과
**발생 확률**: 낮음
**영향도**: 중간
**대응**:
- 타임아웃 90초 → 120초 증가
- 데이터 크기 조정
- Web Worker 활용 검토

### 리스크 3: R/SPSS 결과 불일치
**발생 확률**: 낮음
**영향도**: 높음
**대응**:
- Python 라이브러리 버전 확인
- 알고리즘 차이 문서화
- 허용 오차 범위 조정 (0.0001 → 0.001)

---

## 체크리스트

### 사전 준비
- [ ] Playwright 실행 환경 확인
- [ ] R 설치 및 스크립트 준비
- [ ] 테스트 데이터셋 준비
- [ ] Git 브랜치 생성 (`test/phase4-2-methods`)

### 1단계 완료
- [ ] test-data.ts 작성
- [ ] assertions.ts 작성
- [ ] pyodide-utils.ts 작성
- [ ] sample-data CSV 준비
- [ ] reference-results.json 준비

### 2-4단계 완료 (메서드별)
- [ ] correlation 테스트 통과
- [ ] tTest 테스트 통과
- [ ] anova 테스트 통과
- [ ] chiSquare 테스트 통과
- [ ] linearRegression 테스트 통과
- [ ] logisticRegression 테스트 통과
- [ ] mannWhitneyU 테스트 통과
- [ ] kruskalWallis 테스트 통과
- [ ] wilcoxonTest 테스트 통과
- [ ] partialCorrelation 테스트 통과
- [ ] factorAnalysis 테스트 통과
- [ ] reliabilityAnalysis 테스트 통과
- [ ] stepwiseRegression 테스트 통과
- [ ] powerAnalysis 테스트 통과

### 5-6단계 완료
- [ ] 성능 벤치마크 측정 (3가지 크기)
- [ ] R 결과 비교 (10개)
- [ ] SPSS 결과 비교 (5개, 선택)

### 7단계 완료
- [ ] phase4-2-complete.md 작성
- [ ] performance-benchmark.md 작성
- [ ] accuracy-validation.md 작성

### 마무리
- [ ] Git commit 및 push
- [ ] CLAUDE.md 업데이트
- [ ] Phase 4-3 계획 수립

---

## 참고 자료

### 내부 문서
- [Phase 4-1 완료 보고서](phase4-runtime-test-complete.md)
- [Phase 3 완료 보고서](phase3-complete.md)
- [통계 검증 가이드](STATISTICAL_VERIFICATION_GUIDE.md)

### 외부 링크
- Pyodide 패키지: https://pyodide.org/en/stable/usage/packages-in-pyodide.html
- SciPy 문서: https://docs.scipy.org/doc/scipy/
- statsmodels 문서: https://www.statsmodels.org/stable/

---

**작성일**: 2025-10-02
**시작 예정**: 2025-10-03
**예상 완료**: 2025-10-04
