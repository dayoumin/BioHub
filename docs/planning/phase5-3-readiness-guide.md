# Phase 5-3 사전 준비 가이드 (Readiness Guide)

**작성일**: 2025-10-29
**목적**: Phase 5-3 Worker Pool 전환 전 필수 검증 및 준비
**상태**: ✅ 사전 준비 완료 (Option 2, 4)

---

## 📋 개요

Phase 5-3 Worker Pool 전환은 다음과 같은 대규모 성능 개선을 목표로 합니다:

| 지표 | Phase 5 (현재) | Phase 5-3 (목표) | 개선율 |
|------|----------------|------------------|--------|
| **초기 로딩** | 3000ms | 500ms | **83% ↓** |
| **첫 계산** | 11800ms | 3000ms | **74% ↓** |
| **UI 블로킹** | 11800ms | 0ms | **100% ↓** |
| **병렬 처리** | 35400ms | 3800ms | **89% ↓** |

이러한 대폭적인 변경을 안전하게 수행하기 위해 **사전 검증**이 필수입니다.

---

## ✅ 완료된 사전 준비 작업 (2025-10-29)

### 1. Worker 환경 검증 시스템 구축 (Option 4)

**생성 파일**:
- ✅ [scripts/verify-worker-support.ts](../../scripts/verify-worker-support.ts) (500 lines)
- ✅ [public/verify-worker.html](../../public/verify-worker.html) (247 lines)
- ✅ [docs/WORKER_ENVIRONMENT_VERIFICATION.md](../WORKER_ENVIRONMENT_VERIFICATION.md) (600+ lines)

**검증 항목 (6개)**:
1. ✅ Web Worker API 지원
2. ✅ SharedArrayBuffer 지원 (성능 최적화)
3. ✅ IndexedDB 지원 (Pyodide 캐싱)
4. ✅ COOP/COEP 헤더 (보안 정책)
5. ✅ Pyodide 로딩 가능 여부
6. ✅ 메모리 용량 (최소 2GB)

**실행 방법**:
```bash
# 브라우저 자동 검증
npm run verify:worker

# 또는 수동 검증
# http://localhost:3000/verify-worker.html 열기
```

**검증 테스트**: ✅ 16/16 passed

---

### 2. 성능 회귀 테스트 시스템 구축 (Option 2)

**생성 파일**:
- ✅ [__tests__/performance/pyodide-regression.test.ts](../../statistical-platform/__tests__/performance/pyodide-regression.test.ts) (228 lines)
- ✅ [.github/workflows/performance-regression.yml](../../.github/workflows/performance-regression.yml)
- ✅ [docs/PERFORMANCE_REGRESSION_TESTING.md](../PERFORMANCE_REGRESSION_TESTING.md) (27KB)

**테스트 커버리지 (7개)**:
1. ✅ Pyodide 로딩 성능 (< 3000ms)
2. ✅ Pyodide 캐싱 검증 (< 100ms)
3. ✅ Worker 1: descriptive_stats, normality_test
4. ✅ Worker 2: one_sample_t_test
5. ✅ Worker 3: mann_whitney_u_test
6. ✅ Worker 4: multiple_regression
7. ✅ 입출력 일관성 검증

**성능 임계값 (Phase 5 Baseline)**:
```typescript
const PERFORMANCE_THRESHOLDS = {
  pyodideLoading: 3000,      // 3초 (초기 로드)
  cachedCalculation: 1000,   // 1초 (캐싱)
} as const
```

**실행 방법**:
```bash
# 회귀 테스트 실행
cd statistical-platform
npm run test:performance

# Watch 모드
npm run test:performance:watch
```

**검증 테스트**: ✅ 23/23 passed

---

### 3. CI/CD 자동화 구축

**GitHub Actions Workflow**:
- ✅ PR/push 시 자동 실행
- ✅ Path 필터: `pyodide/**`, `workers/**`, `__tests__/performance/**`
- ✅ 15분 타임아웃
- ✅ Node.js 20 환경

**트리거 조건**:
```yaml
on:
  pull_request:
    branches: [ master, main ]
    paths:
      - 'statistical-platform/lib/services/pyodide/**'
      - 'statistical-platform/public/workers/**'
      - 'statistical-platform/__tests__/performance/**'
  push:
    branches: [ master, main ]
  workflow_dispatch:
```

---

## 📊 Phase 5-3 시작 전 체크리스트

### A. 환경 검증 (필수)

- [ ] **1. Worker 환경 검증 실행**
  ```bash
  npm run verify:worker
  # 또는 http://localhost:3000/verify-worker.html 열기
  ```
  - [ ] Web Worker API: ✅ 지원
  - [ ] SharedArrayBuffer: ✅ 지원 (권장)
  - [ ] IndexedDB: ✅ 지원
  - [ ] COOP/COEP 헤더: ✅ 설정 (프로덕션)
  - [ ] Pyodide 로딩: ✅ 성공
  - [ ] 메모리: ✅ 2GB 이상

- [ ] **2. 브라우저 호환성 확인**
  - [ ] Chrome/Edge 90+ (권장)
  - [ ] Firefox 89+
  - [ ] Safari 15.4+ (제한적)

---

### B. 성능 Baseline 측정 (필수)

- [ ] **1. Phase 5 성능 회귀 테스트 실행**
  ```bash
  cd statistical-platform
  npm run test:performance > phase5-baseline.log 2>&1
  ```

- [ ] **2. Baseline 데이터 기록**
  - [ ] Pyodide 로딩 시간: ______ms (목표: < 3000ms)
  - [ ] 캐싱된 로딩: ______ms (목표: < 100ms)
  - [ ] Worker 1 (descriptive_stats): ______ms
  - [ ] Worker 2 (one_sample_t_test): ______ms
  - [ ] Worker 3 (mann_whitney_u_test): ______ms
  - [ ] Worker 4 (multiple_regression): ______ms

- [ ] **3. Baseline 문서 저장**
  ```bash
  # phase5-baseline.log를 docs/에 복사
  cp phase5-baseline.log ../docs/PHASE5_PERFORMANCE_BASELINE.txt
  ```

---

### C. 코드 준비 (필수)

- [ ] **1. Python Workers 검증**
  - [ ] worker1-descriptive.py (269 lines) - 검증 완료
  - [ ] worker2-hypothesis.py (418 lines) - 검증 완료
  - [ ] worker3-nonparametric-anova.py (742 lines) - 검증 완료
  - [ ] worker4-regression-advanced.py (755 lines) - 검증 완료

- [ ] **2. TypeScript 컴파일 에러 확인**
  ```bash
  cd statistical-platform
  npx tsc --noEmit
  ```
  - [ ] 에러 개수: ____개 (목표: < 10개, 중요하지 않은 에러만 남음)

- [ ] **3. 현재 리팩토링 작업 완료**
  - [ ] Pattern A/B 전환 완료 또는 커밋
  - [ ] 작업 중인 파일 모두 커밋
  - [ ] Git working directory clean

---

### D. 문서 검토 (권장)

- [ ] **1. Phase 5-3 계획서 재검토**
  - [ ] [phase5-2-worker-pool-plan.md](./phase5-2-worker-pool-plan.md) 읽기
  - [ ] Day 1-3 작업 내용 이해
  - [ ] 예상 소요 시간: 17-25시간 (2-3일)

- [ ] **2. Worker 매핑 확인**
  ```
  Worker 1 (Core):      10개 메서드 - 기술통계 (Descriptive)
  Worker 2 (Core):       8개 메서드 - 가설검정 (Hypothesis)
  Worker 3 (Extended):  18개 메서드 - 비모수 + ANOVA
  Worker 4 (Extended):  24개 메서드 - 회귀 + 고급분석
  ```

- [ ] **3. 성능 목표 재확인**
  - [ ] 초기 로딩: 83% 개선 (3s → 0.5s)
  - [ ] 첫 계산: 74% 개선 (11.8s → 3s)
  - [ ] UI 블로킹: 100% 제거

---

### E. 백업 및 안전장치 (필수)

- [ ] **1. Git 브랜치 생성**
  ```bash
  git checkout -b phase5-3-worker-pool
  ```

- [ ] **2. 롤백 계획 수립**
  - [ ] Phase 5 코드 백업 완료 (Git 히스토리)
  - [ ] 문제 발생 시 되돌릴 커밋 해시 기록: ____________

- [ ] **3. 점진적 전환 전략**
  - [ ] Day 1: Worker Pool 인프라만 구축 (코드 변경 최소)
  - [ ] Day 2: Worker 1-2 (Core) 먼저 전환 및 테스트
  - [ ] Day 3: Worker 3-4 (Extended) 전환 및 통합 테스트

---

## 🚀 Phase 5-3 시작 순서

### Step 1: 최종 검증 (30분)
```bash
# 1. Worker 환경 검증
npm run verify:worker

# 2. 성능 baseline 측정
cd statistical-platform
npm run test:performance > ../docs/PHASE5_PERFORMANCE_BASELINE.txt

# 3. TypeScript 컴파일 체크
npx tsc --noEmit

# 4. Git status 확인
git status  # working directory clean 확인
```

### Step 2: 브랜치 생성 및 작업 시작
```bash
# 1. 새 브랜치 생성
git checkout -b phase5-3-worker-pool

# 2. Phase 5-3 Day 1 작업 시작
# - AdaptiveWorkerPool 클래스 구현
# - Statistical Worker 스크립트 작성
# - Worker 타입 정의

# 3. 커밋 단위 유지 (작은 단위로 자주 커밋)
git add .
git commit -m "feat(phase5-3): Day 1 - AdaptiveWorkerPool 클래스 구현"
```

### Step 3: 각 단계별 회귀 테스트 실행
```bash
# Day 1 완료 후
npm run test:performance

# Day 2 완료 후
npm run test:performance

# Day 3 완료 후 (최종)
npm run test:performance
```

---

## 📈 성공 기준

Phase 5-3 작업이 성공적으로 완료되었다고 판단하는 기준:

### 1. 성능 목표 달성
- ✅ 초기 로딩: < 500ms (Phase 5 대비 83% 개선)
- ✅ 첫 계산: < 3000ms (Phase 5 대비 74% 개선)
- ✅ UI 블로킹: 0ms (100% 제거)
- ✅ 병렬 처리: < 3800ms (Phase 5 대비 89% 개선)

### 2. 기능 무결성
- ✅ 모든 회귀 테스트 통과 (7/7)
- ✅ Worker 1-4 모든 메서드 정상 작동 (60개)
- ✅ 입출력 결과 동일 (Phase 5와 비교)

### 3. 코드 품질
- ✅ TypeScript 컴파일 에러: 0개
- ✅ 단위 테스트 통과율: 100%
- ✅ 코드 리뷰 점수: > 9/10

### 4. 사용자 경험
- ✅ 앱 시작 시 즉시 반응 (< 1초)
- ✅ 분석 실행 중 UI 정지 없음
- ✅ 브라우저 탭 전환 시에도 계산 계속

---

## 🔧 문제 해결 가이드

### 문제 1: Worker 환경 검증 실패

**증상**: `verify:worker` 실행 시 ❌ 표시

**해결 방법**:
1. [WORKER_ENVIRONMENT_VERIFICATION.md](../WORKER_ENVIRONMENT_VERIFICATION.md) 참조
2. 브라우저 버전 확인 (Chrome 90+, Firefox 89+)
3. HTTPS 환경에서 실행 (SharedArrayBuffer 필요)
4. COOP/COEP 헤더 설정 확인

### 문제 2: 성능 회귀 테스트 실패

**증상**: `npm run test:performance` 실패

**해결 방법**:
1. [PERFORMANCE_REGRESSION_TESTING.md](../PERFORMANCE_REGRESSION_TESTING.md) 참조
2. Pyodide CDN 연결 확인
3. 타임아웃 늘리기: `--testTimeout=60000`
4. 인터넷 연결 안정성 확인

### 문제 3: Phase 5-3 전환 후 성능 저하

**증상**: Phase 5보다 느려짐

**원인 분석**:
1. Worker 초기화 시간 증가
2. 메시지 통신 오버헤드
3. Pyodide 중복 로드

**해결 방법**:
1. Worker Pool 크기 조정 (2+2 → 1+3 또는 3+1)
2. 메시지 직렬화 최적화 (Transferable 객체 사용)
3. Pyodide 캐싱 강화

---

## 📚 참고 문서

### 필수 읽기
1. **[phase5-2-worker-pool-plan.md](./phase5-2-worker-pool-plan.md)** - Phase 5-3 상세 계획
2. **[WORKER_ENVIRONMENT_VERIFICATION.md](../WORKER_ENVIRONMENT_VERIFICATION.md)** - 환경 검증 가이드
3. **[PERFORMANCE_REGRESSION_TESTING.md](../PERFORMANCE_REGRESSION_TESTING.md)** - 성능 테스트 가이드

### 추가 참고
4. **[ROADMAP.md](../../ROADMAP.md)** - 전체 로드맵 (Phase 5-3 섹션)
5. **[CLAUDE.md](../../CLAUDE.md)** - AI 코딩 규칙
6. **Worker 파일들**:
   - [worker1-descriptive.py](../../statistical-platform/public/workers/python/worker1-descriptive.py)
   - [worker2-hypothesis.py](../../statistical-platform/public/workers/python/worker2-hypothesis.py)
   - [worker3-nonparametric-anova.py](../../statistical-platform/public/workers/python/worker3-nonparametric-anova.py)
   - [worker4-regression-advanced.py](../../statistical-platform/public/workers/python/worker4-regression-advanced.py)

---

## ✅ 최종 체크

Phase 5-3 시작 전 마지막 확인:

- [ ] ✅ Worker 환경 검증 완료
- [ ] ✅ 성능 baseline 측정 완료
- [ ] ✅ TypeScript 컴파일 에러 < 10개
- [ ] ✅ Git working directory clean
- [ ] ✅ 브랜치 생성 완료 (`phase5-3-worker-pool`)
- [ ] ✅ Phase 5-3 계획서 읽기 완료
- [ ] ✅ 롤백 계획 수립 완료
- [ ] ✅ 팀원에게 작업 시작 공지 (선택)

**모든 항목 체크 완료 시 Phase 5-3 시작 가능!** 🚀

---

**작성**: 2025-10-29
**버전**: 1.0
**다음 업데이트**: Phase 5-3 완료 후
