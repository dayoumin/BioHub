# Phase 5: Registry + Worker Pool Implementation Plan

## 프로젝트 개요

**목표**: Registry Pattern + Worker Pool로 SPSS급 성능 달성

**기간**: 10일 (2025-10-03 ~ 2025-10-14)

**예상 효과**:
- 초기 로딩: 83% 빠름 (3초 → 0.5초)
- 첫 계산: 74% 빠름 (11.8초 → 3초)
- UI 블로킹: 100% 제거 (11.8초 → 0초)
- 병렬 처리: 89% 빠름 (35.4초 → 3.8초)
- 개발 속도: 84% 향상 (HMR 5초 → 0.8초)

---

## Phase 1: Registry 기반 구조 (Day 1-3)

### Day 1: Registry 인프라 구축

**목표**: 메타데이터 기반 메서드 관리 시스템 구축

**작업**:
- [ ] `method-metadata.ts` 생성 (50개 메서드 메타데이터 정의)
- [ ] `statistical-registry.ts` 구현 (동적 import 메커니즘)
- [ ] `types.ts` 타입 정의 (StatisticalGroup, MethodMetadata)

**산출물**:
- `lib/statistics/registry/method-metadata.ts` (200줄)
- `lib/statistics/registry/statistical-registry.ts` (150줄)
- `lib/statistics/registry/types.ts` (50줄)

**검증**:
- [ ] 메타데이터 50개 메서드 완성
- [ ] Registry 단위 테스트 작성
- [ ] 동적 import 동작 확인

---

### Day 2-3: 그룹 모듈 분리

**목표**: 기존 16개 핸들러 파일을 6개 그룹으로 재구성

**작업**:
- [ ] Descriptive Group 생성 (10개 메서드)
- [ ] Hypothesis Group 생성 (8개 메서드)
- [ ] Regression Group 생성 (12개 메서드)
- [ ] Nonparametric Group 생성 (9개 메서드)
- [ ] ANOVA Group 생성 (9개 메서드)
- [ ] Advanced Group 생성 (12개 메서드)

**마이그레이션 매핑**:
```
기존 파일 → 새 그룹 파일
├── descriptive.ts → descriptive.group.ts
├── hypothesis-tests.ts → hypothesis.group.ts
├── regression.ts + regression-extended.ts → regression.group.ts
├── nonparametric.ts + nonparametric-extended.ts → nonparametric.group.ts
├── anova.ts + anova-extended.ts → anova.group.ts
└── advanced.ts + advanced-extended.ts → advanced.group.ts
```

**산출물**:
- `lib/statistics/groups/descriptive.group.ts` (300줄)
- `lib/statistics/groups/hypothesis.group.ts` (250줄)
- `lib/statistics/groups/regression.group.ts` (400줄)
- `lib/statistics/groups/nonparametric.group.ts` (350줄)
- `lib/statistics/groups/anova.group.ts` (380줄)
- `lib/statistics/groups/advanced.group.ts` (320줄)

**검증**:
- [ ] 각 그룹 독립 실행 테스트
- [ ] 기존 27개 유닛 테스트 통과
- [ ] 타입 안전성 검증 (npx tsc --noEmit)

---

## Phase 2: Worker Pool 통합 (Day 4-7)

### Day 4: Worker 인프라

**목표**: 2+2 Adaptive Worker Pool 구축

**작업**:
- [ ] AdaptiveWorkerPool 클래스 구현 (2개 코어 + 2개 확장 Worker)
- [ ] Statistical Worker 스크립트 작성
- [ ] Worker 메시지 프로토콜 정의 (타입 안전성 강화)
- [ ] 20분 미사용 시 확장 Worker 종료 로직

**Worker 매핑**:
- Worker 1: Descriptive (10개)
- Worker 2: Hypothesis (8개)
- Worker 3: Nonparametric + ANOVA (18개)
- Worker 4: Regression + Advanced (24개)

**산출물**:
- `lib/statistics/workers/adaptive-worker-pool.ts` (250줄)
- `lib/statistics/workers/statistical-worker.ts` (150줄)
- `lib/statistics/workers/worker-types.ts` (80줄 - 타입 강화)

**검증**:
- [ ] 코어 Worker 2개 정상 생성 (descriptive, hypothesis)
- [ ] 확장 Worker 지연 로딩 확인 (nonparametric+anova, regression+advanced)
- [ ] 메시지 타입 안전성 (DataRow[], MethodParameters)
- [ ] 20분 타이머 동작 확인

---

### Day 5-6: 그룹별 Worker 통합

**목표**: 각 그룹을 Worker에서 실행 가능하도록 변환

**작업**:
- [ ] Python 모듈 4개 분리 (Worker별)
- [ ] Worker-Group 연동 래퍼 구현
- [ ] Pyodide 패키지 Worker별 최적화

**Python 모듈 전략 (4개 Worker별)**:
- `worker1-descriptive.py` (200줄): Descriptive 10개
- `worker2-hypothesis.py` (180줄): Hypothesis 8개
- `worker3-nonparametric-anova.py` (460줄): Nonparametric 9개 + ANOVA 9개
- `worker4-regression-advanced.py` (520줄): Regression 12개 + Advanced 12개

**Worker별 패키지 로딩**:
- Worker 1: NumPy (80MB, 0.8초)
- Worker 2: NumPy + SciPy (90MB, 1.2초)
- Worker 3: SciPy + Statsmodels (140MB, 2.3초)
- Worker 4: SciPy + Statsmodels + Sklearn (200MB, 3.8초)

**산출물**:
- `lib/statistics/workers/python/worker1-descriptive.py` (200줄)
- `lib/statistics/workers/python/worker2-hypothesis.py` (180줄)
- `lib/statistics/workers/python/worker3-nonparametric-anova.py` (460줄)
- `lib/statistics/workers/python/worker4-regression-advanced.py` (520줄)
- `lib/statistics/workers/package-loader.ts` (100줄)

**검증**:
- [ ] 각 그룹 Worker 실행 테스트
- [ ] Python 코드 정상 작동 확인
- [ ] 패키지 로딩 최적화 검증

---

### Day 7: Worker 최적화 및 메모리 관리

**목표**: Worker별 Pyodide 인스턴스 최적화

**작업**:
- [ ] Pyodide 캐싱 전략 구현 (싱글톤 패턴)
- [ ] 메모리 관리 시스템 (WorkerMemoryManager)
- [ ] 진행률 표시 시스템 (ProgressTracker)
- [ ] 20분 미사용 시 자동 정리 로직 (확장 Worker만)

**산출물**:
- `lib/statistics/workers/pyodide-cache.ts` (100줄)
- `lib/statistics/workers/memory-manager.ts` (120줄)
- `lib/statistics/workers/progress-tracker.ts` (80줄)

**검증**:
- [ ] 초기 메모리 170MB 확인 (코어 Worker 2개)
- [ ] 전체 로드 시 510MB 확인 (Worker 4개)
- [ ] 20분 타이머 동작 확인 (Worker 3, 4만)
- [ ] 장시간 실행 안정성 테스트 (100회 연속)

---

## Phase 3: 통합 및 최적화 (Day 8-10)

### Day 8: 통합 테스트

**목표**: 전체 시스템 통합 검증 및 성능 벤치마크

**작업**:
- [ ] 통합 테스트 Suite 작성 (50개 메서드 전체 실행)
- [ ] E2E 테스트 업데이트 (Registry + Worker 시나리오)
- [ ] 성능 벤치마크 (초기 로딩, 첫 계산, 캐싱 계산)

**산출물**:
- `__tests__/integration/registry-worker-integration.test.ts` (300줄)
- `e2e/registry-worker-e2e.spec.ts` (200줄)
- `__tests__/performance/benchmark.test.ts` (150줄)

**검증**:
- [ ] 모든 유닛 테스트 통과 (50개 메서드)
- [ ] E2E 테스트 통과
- [ ] 성능 목표 달성:
  - 앱 시작 < 0.5초
  - 코어 그룹 첫 계산 < 3초
  - 확장 그룹 첫 계산 < 6초
  - 캐싱 계산 < 0.1초
- [ ] **메모리 실측 및 문서 업데이트**:
  - Worker 1-4 순차 로딩하며 Chrome DevTools Heap Snapshot
  - 각 Worker 메모리 실측값 기록
  - 허용 범위 (60-100MB, 70-110MB, 110-170MB, 150-250MB) 확인
  - 범위 벗어나면 phase5-architecture.md 수정

---

### Day 9: 사용자 경험 개선

**목표**: 로딩 상태 시각화 및 에러 메시지 개선

**작업**:
- [ ] 진행률 UI 컴포넌트 (CalculationProgress.tsx)
- [ ] Worker 상태 모니터 (WorkerMonitor.tsx, 개발 전용)
- [ ] 에러 핸들링 개선 (WorkerTimeoutError, WorkerCrashError)

**산출물**:
- `components/calculation/CalculationProgress.tsx` (80줄)
- `components/debug/WorkerMonitor.tsx` (100줄)
- `lib/statistics/errors/worker-errors.ts` (60줄)

**검증**:
- [ ] 진행률 표시 정상 작동
- [ ] Worker 상태 실시간 모니터링
- [ ] 에러 메시지 사용자 친화적

---

### Day 10: 문서화 및 배포 준비

**목표**: 완전한 문서화 및 배포 설정

**작업**:
- [ ] 아키텍처 문서 완성 (phase5-architecture.md)
- [ ] 개발 가이드 작성 (새 메서드 추가, Worker 디버깅)
- [ ] 마이그레이션 가이드 작성 (Phase 4 → Phase 5)
- [ ] HTML 빌드 설정 (next.config.ts 업데이트)
- [ ] 빌드 테스트 (정적 HTML, Tauri 앱)

**산출물**:
- `docs/phase5-architecture.md` (200줄)
- `docs/phase5-development-guide.md` (250줄)
- `docs/phase5-migration-guide.md` (200줄)
- `docs/phase5-complete.md` (완료 보고서)

**검증**:
- [ ] 문서 완성도 100%
- [ ] HTML 빌드 성공 (out/ 폴더 생성)
- [ ] Tauri 앱 빌드 성공
- [ ] 모든 브라우저 테스트 (Chrome, Firefox, Safari, Edge)

---

## 성공 지표 (KPI)

### 성능 지표 (코어 그룹)

| 지표 | Phase 4-1 | Phase 5 목표 | 측정 방법 |
|------|-----------|-------------|----------|
| 앱 시작 | 2.8초 | <0.5초 | Performance API |
| 첫 계산 (코어) | 11.8초 | <3초 | 벤치마크 |
| 첫 계산 (확장) | 11.8초 | <6초 | 벤치마크 (Worker 로딩 포함) |
| 캐싱 계산 | 0.27초 | <0.1초 | 벤치마크 |
| UI 블로킹 | 11.8초 | 0초 | 사용자 테스트 |

### 메모리 지표 (트레이드오프, 추정치)

| 지표 | Phase 4-1 | Phase 5 추정 | 변화 | 허용 범위 |
|------|-----------|-------------|------|----------|
| 초기 메모리 | 48MB | 85MB | +77% | 70-100MB |
| Pyodide 로드 후 | 127MB | 170MB | +34% | 150-200MB |
| 전체 로드 후 | - | 510MB | Worker 4개 | 400-600MB |

**Worker별 메모리**:
- Worker 1 (NumPy): 80MB (허용: 60-100MB)
- Worker 2 (NumPy + SciPy): 90MB (허용: 70-110MB)
- Worker 3 (SciPy + Statsmodels): 140MB (허용: 110-170MB)
- Worker 4 (SciPy + Statsmodels + Sklearn): 200MB (허용: 150-250MB) ⚠️ Day 8 실측

**핵심 가치**: UI 블로킹 제거 (메모리 증가 허용)

### 품질 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 테스트 커버리지 | 90% 이상 | Jest coverage |
| 타입 안전성 | 100% | tsc --noEmit |
| 빌드 성공률 | 100% | CI/CD |
| E2E 테스트 통과율 | 100% | Playwright |

### 개발 효율 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| HMR 시간 | 5초 | 0.8초 | 실측 |
| 빌드 시간 | 45초 | 32초 | CI 로그 |
| 테스트 실행 | 28초 | 8초 | Jest 시간 |
| 새 메서드 추가 | 73초 | 9초 | 작업 측정 |

---

## 위험 관리

### 고위험 항목

1. **Worker 통신 오버헤드**
   - 위험: 작은 데이터에서는 오히려 느릴 수 있음
   - 대응: 데이터 크기에 따라 Worker/Main 선택
   - 책임자: 개발자

2. **기존 테스트 깨짐**
   - 위험: 27개 테스트가 깨질 가능성
   - 대응: 단계별 마이그레이션, 롤백 전략
   - 책임자: QA

3. **확장 Worker 성능 목표**
   - 위험: 확장 Worker 첫 로딩 시 6초 소요 (사용자 대기)
   - 대응: 백그라운드 사전 로딩 / 진행률 표시
   - 책임자: 개발자

### 중위험 항목

1. **브라우저 호환성**
   - 위험: IE11 미지원
   - 대응: 지원 브라우저 명시
   - 책임자: 개발자

2. **디버깅 복잡도**
   - 위험: Worker 내부 디버깅 어려움
   - 대응: Worker 전용 로깅, 디버그 모드
   - 책임자: 개발자

---

## 롤백 전략

### 브랜치 전략
```
main (현재 Phase 4-1 안정 버전)
  ├─ refactor/phase5-1-registry (Day 1-3)
  ├─ refactor/phase5-2-worker-pool (Day 4-7)
  └─ refactor/phase5-3-integration (Day 8-10)
```

### 롤백 시나리오

1. **Phase 1 실패 시**: Registry 포기, 현재 구조 유지
2. **Phase 2 실패 시**: Registry만 적용, Worker Pool 포기 (여전히 80% 개선)
3. **Phase 3 실패 시**: 통합 문제만 해결, 기본 기능은 작동

---

## 다음 단계 (Phase 5 완료 후)

### Phase 6: 성능 극대화 (선택)
- Shared Worker로 Pyodide 단일 인스턴스화
- WebAssembly 최적화
- 대용량 데이터 스트리밍 처리

### Phase 7: 플러그인 생태계 (선택)
- 써드파티 플러그인 지원
- 플러그인 마켓플레이스
- 커뮤니티 기여 활성화

---

**문서 버전**: 2.0
**작성일**: 2025-10-03
**작성자**: Claude Code
