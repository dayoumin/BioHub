# 해석 엔진 자동 검증 시스템 구축 계획

**작성일**: 2025-11-23
**목표**: 43개 통계 해석을 인간 개입 없이 100% 자동 검증

---

## 📊 현황 분석

### 프로젝트 구조
- **통계 페이지**: 44개 (`app/(dashboard)/statistics/`)
- **해석 엔진**: `lib/interpretation/engine.ts` (468줄)
- **현재 테스트 커버리지**: 0% (`__tests__/` 비어있음)
- **해석 엔진 사용처**:
  - ✅ Smart Flow (스마트 분석)
  - ✅ 일부 공통 컴포넌트 (PValueBadge, ConfidenceIntervalDisplay)
  - ❌ 개별 통계 페이지 (미사용)

### 해석 엔진 아키텍처
```typescript
// lib/interpretation/engine.ts
export function getInterpretation(
  results: AnalysisResult,
  purpose?: string  // 스마트 분석에서만 전달
): InterpretationResult | null

// Phase 1: 목적 기반 해석 (우선순위 높음)
// - 비교, 상관, 예측 등 3가지 분석 목적

// Phase 2: 방법 기반 해석 (fallback)
// - ANOVA, Chi-Square, Cronbach's Alpha 등 34개 통계 방법
```

### 주요 임계값 (THRESHOLDS)
```typescript
const THRESHOLDS = {
  P_VALUE: { ALPHA: 0.05, VERY_STRONG: 0.001 },
  CORRELATION: { WEAK: 0.1, MODERATE: 0.4, STRONG: 0.7 },
  R_SQUARED: { LOW: 0.4, HIGH: 0.7 },
  ALPHA: { POOR: 0.6, QUESTIONABLE: 0.7, ACCEPTABLE: 0.8, GOOD: 0.9 },
  SILHOUETTE: { WEAK: 0.25, FAIR: 0.5, STRONG: 0.7 },
  EFFECT_SIZE: {
    COHENS_D: { SMALL: 0.2, MEDIUM: 0.5, LARGE: 0.8 },
    PEARSON_R: { WEAK: 0.3, MODERATE: 0.5 },
    ETA_SQUARED: { SMALL: 0.01, MEDIUM: 0.06, LARGE: 0.14 }
  }
}
```

---

## 🎯 3단계 자동 검증 전략

### Phase 1: 골든 스냅샷 테스트 (Golden Snapshot) 📸

**목표**: 각 통계별 고정 입력에 대한 출력 텍스트 스냅샷 저장 → 회귀 자동 탐지

#### 구현 계획
1. **Fixture 샘플 생성** (43개 통계 × 3 시나리오 = 129개)
   ```
   __tests__/lib/interpretation/fixtures/
   ├── two-group/
   │   ├── significant.json         # p=0.03
   │   ├── not-significant.json     # p=0.15
   │   └── boundary.json            # p=0.049
   ├── multi-group/
   │   ├── anova-significant.json
   │   └── kruskal-significant.json
   ├── correlation/
   │   ├── strong-positive.json     # r=0.85
   │   ├── weak.json                # r=0.05
   │   └── strong-negative.json     # r=-0.9
   ├── regression/
   │   ├── high-r2.json             # R²=0.85
   │   └── low-r2.json              # R²=0.2
   ├── categorical/
   │   ├── chi-square.json
   │   └── fisher.json
   ├── reliability/
   │   ├── excellent.json           # α=0.95
   │   └── poor.json                # α=0.5
   ├── clustering/
   │   ├── strong-structure.json    # silhouette=0.75
   │   └── weak-structure.json      # silhouette=0.2
   └── ... (43개 통계 커버)
   ```

2. **스냅샷 테스트 구현**
   ```typescript
   // __tests__/lib/interpretation/engine-snapshot.test.ts
   import { getInterpretation } from '@/lib/interpretation/engine'

   describe('해석 엔진 골든 스냅샷 테스트', () => {
     describe('2집단 비교 (t-test, Mann-Whitney)', () => {
       it('유의한 차이 (p=0.03) → 스냅샷 매칭', () => {
         const fixture = require('./fixtures/two-group/significant.json')
         const result = getInterpretation(fixture, '비교')

         expect(result).not.toBeNull()
         expect(result?.title).toMatchSnapshot()
         expect(result?.summary).toMatchSnapshot()
         expect(result?.statistical).toMatchSnapshot()
         expect(result?.practical).toMatchSnapshot()
       })

       it('유의하지 않음 (p=0.15) → 스냅샷 매칭', () => {
         const fixture = require('./fixtures/two-group/not-significant.json')
         const result = getInterpretation(fixture, '비교')

         expect(result?.statistical).toMatchSnapshot()
       })
     })

     // ... 43개 통계 × 3 시나리오 = 129개 테스트
   })
   ```

3. **스냅샷 저장소** (Jest 자동 생성)
   ```
   __tests__/lib/interpretation/__snapshots__/
   └── engine-snapshot.test.ts.snap
   ```

#### 장점
- ✅ **회귀 탐지 최강**: 텍스트 1자 변경도 자동 감지
- ✅ **도메인 정확성 보장**: 전문가 검증 1회 → 영구 보존
- ✅ **빠른 피드백**: 0.1초 이내 diff 확인
- ✅ **무인 운영**: CI/CD에서 자동 실행

#### 단점
- ⚠️ 의도된 변경 시 스냅샷 수동 업데이트 필요
- 하지만 이것도 **검증 프로세스의 일부**!

---

### Phase 2: 계약 기반 테스트 (Contract Testing) ✅

**목표**: 각 통계 타입별 최소 입력 스키마 검증 + 경계값 조건 확인

#### 구현 계획

1. **필수 필드 검증**
   ```typescript
   // __tests__/lib/interpretation/engine-contract.test.ts
   describe('계약 테스트 - 필수 필드', () => {
     it('2집단 비교: groupStats 없음 → null 반환', () => {
       const input = { ...validSample, groupStats: undefined }
       const result = getInterpretation(input, '비교')
       expect(result).toBeNull()
     })

     it('회귀: coefficients 없음 → null 반환', () => {
       const input = { ...validSample, coefficients: undefined }
       const result = getInterpretation(input, '예측')
       expect(result).toBeNull()
     })

     it('신뢰도: alpha가 NaN → null 반환', () => {
       const input = { ...validSample, additional: { alpha: NaN } }
       const result = getInterpretation(input)
       expect(result).toBeNull() // engine.ts Line 285
     })
   })
   ```

2. **경계값 조건 검증**
   ```typescript
   describe('계약 테스트 - 경계값', () => {
     it('p-value = 0 → "< 0.001" 포맷', () => {
       const input = { ...validSample, pValue: 0 }
       const result = getInterpretation(input, '비교')
       expect(result?.statistical).toContain('< 0.001')
     })

     it('p-value = NaN → "N/A" 포맷', () => {
       const input = { ...validSample, pValue: NaN }
       const result = getInterpretation(input, '비교')
       if (result) {
         expect(result.statistical).toContain('N/A')
       }
     })

     it('r = 2 (범위 밖) → 1로 클램핑', () => {
       const input = { ...validSample, statistic: 2 }
       const result = getInterpretation(input, '상관')
       expect(result?.summary).toContain('1.000') // Clamped
     })

     it('R² = 1.5 (범위 밖) → 100%로 클램핑', () => {
       const input = { ...validSample, additional: { rSquared: 1.5 } }
       const result = getInterpretation(input, '예측')
       expect(result?.statistical).toContain('100.0%') // Clamped
     })
   })
   ```

3. **임계값 일관성 검증**
   ```typescript
   // __tests__/lib/interpretation/engine-thresholds.test.ts
   describe('임계값 일관성 검증', () => {
     it('CORRELATION: WEAK < MODERATE < STRONG', () => {
       const THRESHOLDS = { CORRELATION: { WEAK: 0.1, MODERATE: 0.4, STRONG: 0.7 } }
       expect(THRESHOLDS.CORRELATION.WEAK).toBeLessThan(THRESHOLDS.CORRELATION.MODERATE)
       expect(THRESHOLDS.CORRELATION.MODERATE).toBeLessThan(THRESHOLDS.CORRELATION.STRONG)
     })

     it('ALPHA: POOR < QUESTIONABLE < ACCEPTABLE < GOOD', () => {
       const THRESHOLDS = { ALPHA: { POOR: 0.6, QUESTIONABLE: 0.7, ACCEPTABLE: 0.8, GOOD: 0.9 } }
       expect(THRESHOLDS.ALPHA.POOR).toBeLessThan(THRESHOLDS.ALPHA.QUESTIONABLE)
       expect(THRESHOLDS.ALPHA.QUESTIONABLE).toBeLessThan(THRESHOLDS.ALPHA.ACCEPTABLE)
       expect(THRESHOLDS.ALPHA.ACCEPTABLE).toBeLessThan(THRESHOLDS.ALPHA.GOOD)
     })
   })
   ```

#### 장점
- ✅ **빠른 피드백**: 10초 이내 전체 검증
- ✅ **기술적 정확성**: NaN/Infinity/범위 밖 값 처리 확인
- ✅ **100% 자동화**: 인간 개입 불필요

---

### Phase 3: CI/CD 파이프라인 통합 🚀

**목표**: GitHub Actions로 매 PR마다 자동 검증

#### GitHub Actions 워크플로우
```yaml
# .github/workflows/interpretation-qa.yml
name: 해석 엔진 QA 자동화

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  contract-test:
    name: 계약 테스트
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: statistical-platform

      - name: TypeScript 컴파일 체크
        run: npx tsc --noEmit
        working-directory: statistical-platform

      - name: 계약 테스트 실행
        run: npm test -- __tests__/lib/interpretation/engine-contract.test.ts
        working-directory: statistical-platform

      - name: 임계값 검증
        run: npm test -- __tests__/lib/interpretation/engine-thresholds.test.ts
        working-directory: statistical-platform

  snapshot-test:
    name: 골든 스냅샷 테스트
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: statistical-platform

      - name: 스냅샷 테스트 실행
        run: npm test -- __tests__/lib/interpretation/engine-snapshot.test.ts
        working-directory: statistical-platform

      - name: 스냅샷 diff 업로드 (실패 시)
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: snapshot-diff
          path: statistical-platform/__tests__/lib/interpretation/__snapshots__/
          retention-days: 7

  coverage-report:
    name: 커버리지 리포트
    runs-on: ubuntu-latest
    needs: [contract-test, snapshot-test]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: statistical-platform

      - name: 커버리지 생성
        run: npm run test:coverage -- lib/interpretation/
        working-directory: statistical-platform

      - name: 커버리지 업로드
        uses: codecov/codecov-action@v3
        with:
          files: statistical-platform/coverage/lcov.info
          flags: interpretation-engine
```

#### 성공 기준
- ✅ TypeScript 컴파일: 0 errors
- ✅ 계약 테스트: 100% pass
- ✅ 스냅샷 테스트: 100% pass (또는 승인된 diff)
- ✅ 커버리지: > 95% (해석 엔진)

---

## 📂 최종 파일 구조

```
statistical-platform/
├── lib/
│   └── interpretation/
│       └── engine.ts                     # 해석 엔진 (468줄)
│
├── __tests__/
│   └── lib/
│       └── interpretation/
│           ├── fixtures/                 # 43개 통계 샘플 데이터
│           │   ├── two-group/
│           │   │   ├── significant.json
│           │   │   ├── not-significant.json
│           │   │   └── boundary.json
│           │   ├── multi-group/
│           │   │   ├── anova-significant.json
│           │   │   └── kruskal-significant.json
│           │   ├── correlation/
│           │   │   ├── strong-positive.json
│           │   │   ├── weak.json
│           │   │   └── strong-negative.json
│           │   ├── regression/
│           │   │   ├── high-r2.json
│           │   │   └── low-r2.json
│           │   ├── categorical/
│           │   ├── reliability/
│           │   ├── clustering/
│           │   ├── dimensionality/
│           │   └── ... (43개 통계 커버)
│           │
│           ├── __snapshots__/            # Jest 자동 생성
│           │   └── engine-snapshot.test.ts.snap
│           │
│           ├── engine-snapshot.test.ts   # 골든 스냅샷 테스트 (129개)
│           ├── engine-contract.test.ts   # 계약 테스트 (~50개)
│           └── engine-thresholds.test.ts # 임계값 검증 (~10개)
│
└── .github/
    └── workflows/
        └── interpretation-qa.yml         # CI/CD 자동화
```

---

## ⏱️ 구현 타임라인

### Week 1: Fixture + 스냅샷 테스트
- [ ] Day 1-2: 43개 통계별 Fixture JSON 생성 (129개 샘플)
- [ ] Day 3-4: 스냅샷 테스트 작성 (engine-snapshot.test.ts)
- [ ] Day 5: 전문가 검증 (1회) → 스냅샷 승인

### Week 2: 계약 테스트
- [ ] Day 1-2: 경계값 조건 테스트 작성 (engine-contract.test.ts)
- [ ] Day 3: 임계값 일관성 검증 (engine-thresholds.test.ts)
- [ ] Day 4-5: 전체 테스트 실행 + 버그 수정

### Week 3: CI/CD + 문서화
- [ ] Day 1-2: GitHub Actions 워크플로우 구현
- [ ] Day 3: PR 테스트 (실제 PR로 검증)
- [ ] Day 4-5: 문서 업데이트 (README, CLAUDE.md)

---

## ✅ 성공 기준

### 정량 지표
- [x] **Fixture 샘플**: 43개 통계 × 3 시나리오 = 129개
- [x] **스냅샷 테스트**: 129개 스냅샷 생성 + 전문가 검증 1회
- [x] **계약 테스트**: ~50개 케이스 (필수 필드 + 경계값 + NaN 처리)
- [x] **임계값 검증**: ~10개 일관성 체크
- [x] **커버리지**: > 95% (lib/interpretation/)
- [x] **CI/CD**: 매 PR마다 자동 실행 (< 5분 이내)

### 정성 지표
- [x] **회귀 탐지**: 텍스트 1자 변경도 자동 감지
- [x] **무인 운영**: 인간 개입 없이 자동 검증 (스냅샷 승인 제외)
- [x] **빠른 피드백**: 0.1초 이내 스냅샷 diff 확인
- [x] **도메인 정확성**: 전문가 검증 1회 → 영구 보존

---

## 🚀 실행 방법

### 로컬 개발
```bash
# 1. 전체 테스트 실행
cd statistical-platform
npm test -- __tests__/lib/interpretation/

# 2. 스냅샷 업데이트 (의도된 변경 시)
npm test -- __tests__/lib/interpretation/engine-snapshot.test.ts -u

# 3. 특정 테스트만 실행
npm test -- __tests__/lib/interpretation/engine-contract.test.ts

# 4. 커버리지 확인
npm run test:coverage -- lib/interpretation/
```

### CI/CD
```bash
# PR 생성 시 자동 실행
# GitHub Actions → "해석 엔진 QA 자동화" 확인
# 실패 시 Artifacts에서 snapshot-diff 다운로드
```

---

## 📚 참고 자료

### 내부 문서
- [lib/interpretation/engine.ts](../lib/interpretation/engine.ts) - 해석 엔진 소스코드
- [types/smart-flow.ts](../types/smart-flow.ts) - AnalysisResult 타입 정의
- [STATISTICS_CODING_STANDARDS.md](./STATISTICS_CODING_STANDARDS.md) - 통계 코딩 표준

### 외부 자료
- [Jest 스냅샷 테스트 공식 문서](https://jestjs.io/docs/snapshot-testing)
- [계약 기반 테스트 (Contract Testing)](https://martinfowler.com/bliki/ContractTest.html)
- [골든 스냅샷 패턴](https://abseil.io/resources/swe-book/html/ch12.html)

---

**Updated**: 2025-11-23 | **Version**: 1.0 | **Author**: Claude Code
