# Phase 5 Migration Guide: Phase 4 → Phase 5

## 개요

Phase 4-1 (현재)에서 Phase 5 (Registry + Worker Pool)로 마이그레이션하는 과정을 단계별로 설명합니다.

---

## 변경 사항 요약

### 주요 변경점

| 구성 요소 | Phase 4-1 | Phase 5 | 변경 이유 |
|----------|-----------|---------|----------|
| 라우팅 | MethodRouter | StatisticalRegistry | 메타데이터 기반 동적 로딩 |
| 핸들러 | 16개 파일 | 6개 그룹 파일 | 도메인별 그룹화 |
| 실행 환경 | 메인 스레드 | 2+2 Adaptive Worker | UI 반응성 확보 |
| Pyodide | 단일 인스턴스 | Worker별 인스턴스 (4개) | 병렬 처리 |
| Python 코드 | 단일 파일 (2,545줄) | Worker별 분리 (4개 파일) | Worker 매핑 |
| 초기 메모리 | 127MB | 170MB | +34% (UI 블로킹 제거) |
| 초기 로딩 | 11.8초 | 2초 | 코어 Worker만 로딩 |
| UI 블로킹 | 11.8초 | 0초 | Worker 별도 스레드 |

---

## 마이그레이션 체크리스트

### 사전 준비

- [ ] 현재 코드 백업 (git tag phase4-1-stable)
- [ ] 모든 테스트 통과 확인 (27개 유닛 테스트)
- [ ] 브랜치 생성 (refactor/phase5-1-registry)
- [ ] 의존성 확인 (package.json)

### Phase 1: Registry 구조 (Day 1-3)

- [ ] 메타데이터 정의 파일 생성 (50개 메서드)
- [ ] StatisticalRegistry 클래스 구현
- [ ] 6개 그룹 모듈 생성
- [ ] 기존 핸들러 코드 이전
- [ ] Registry 단위 테스트 작성
- [ ] 기존 27개 테스트 통과 확인

### Phase 2: Worker Pool (Day 4-7)

- [ ] AdaptiveWorkerPool 구현 (2+2 전략)
- [ ] StatisticalWorker 구현
- [ ] Python 코드 4개 파일로 분리 (Worker별)
- [ ] Worker 통신 프로토콜 구현 (타입 안전성 강화)
- [ ] 코어 Worker 2개 생성 (descriptive, hypothesis)
- [ ] 확장 Worker 지연 로딩 로직 (nonparametric+anova, regression+advanced)
- [ ] 20분 미사용 시 자동 종료 로직 (확장 Worker만)
- [ ] Worker 테스트 작성
- [ ] 통합 테스트 업데이트

### Phase 3: 통합 및 최적화 (Day 8-10)

- [ ] 전체 통합 테스트
- [ ] 성능 벤치마크
- [ ] UI 개선 (진행률 표시)
- [ ] 문서화 완료
- [ ] HTML 빌드 테스트
- [ ] Tauri 앱 빌드 테스트

---

## 파일 매핑

### 신규 파일 생성

**Registry 관련**:
- `lib/statistics/registry/method-metadata.ts` (200줄) - 50개 메서드 메타데이터
- `lib/statistics/registry/statistical-registry.ts` (150줄) - 레지스트리 구현
- `lib/statistics/registry/types.ts` (50줄) - 타입 정의

**그룹 모듈**:
- `lib/statistics/groups/descriptive.group.ts` (300줄) - 기술통계 10개
- `lib/statistics/groups/hypothesis.group.ts` (250줄) - 가설검정 8개
- `lib/statistics/groups/regression.group.ts` (400줄) - 회귀분석 12개
- `lib/statistics/groups/nonparametric.group.ts` (350줄) - 비모수 9개
- `lib/statistics/groups/anova.group.ts` (380줄) - 분산분석 9개
- `lib/statistics/groups/advanced.group.ts` (320줄) - 고급분석 12개

**Worker 관련**:
- `lib/statistics/workers/adaptive-worker-pool.ts` (250줄) - 2+2 워커 풀
- `lib/statistics/workers/statistical-worker.ts` (150줄) - 워커 스크립트
- `lib/statistics/workers/worker-types.ts` (80줄) - 워커 타입 (강화)
- `lib/statistics/workers/pyodide-cache.ts` (100줄) - Pyodide 캐싱
- `lib/statistics/workers/memory-manager.ts` (120줄) - 메모리 관리
- `lib/statistics/workers/progress-tracker.ts` (80줄) - 진행률 추적
- `lib/statistics/workers/package-loader.ts` (100줄) - 패키지 로더

**Python 모듈 (4개 Worker별)**:
- `lib/statistics/workers/python/worker1-descriptive.py` (200줄)
- `lib/statistics/workers/python/worker2-hypothesis.py` (180줄)
- `lib/statistics/workers/python/worker3-nonparametric-anova.py` (460줄)
- `lib/statistics/workers/python/worker4-regression-advanced.py` (520줄)

### 기존 파일 마이그레이션

**통합되는 핸들러 파일**:
```
calculator-handlers/descriptive.ts → groups/descriptive.group.ts
calculator-handlers/hypothesis-tests.ts → groups/hypothesis.group.ts
calculator-handlers/regression.ts
calculator-handlers/regression-extended.ts  } → groups/regression.group.ts
calculator-handlers/nonparametric.ts
calculator-handlers/nonparametric-extended.ts } → groups/nonparametric.group.ts
calculator-handlers/anova.ts
calculator-handlers/anova-extended.ts } → groups/anova.group.ts
calculator-handlers/advanced.ts
calculator-handlers/advanced-extended.ts } → groups/advanced.group.ts
```

**수정되는 파일**:
- `lib/statistics/statistical-calculator.ts` - Registry + WorkerPool 통합
- `lib/statistics/method-parameter-types.ts` - 타입 유지 (변경 없음)

**제거되는 파일**:
- `lib/statistics/method-router.ts` - StatisticalRegistry로 대체
- `lib/services/pyodide-statistics.ts` - 4개 Worker별 Python 파일로 분리

---

## 핵심 변경 내용

### 1. StatisticalCalculator 변경

**주요 변경사항**:
- MethodRouter → StatisticalRegistry + AdaptiveWorkerPool
- 메인 스레드 동기 실행 → Worker 비동기 실행
- Pyodide 직접 초기화 → Worker 내부 초기화

**마이그레이션 포인트**:
- `router.dispatch()` → `registry.executeInWorker()`
- `pyodideService.initialize()` 제거 (Worker가 자동 처리)

### 2. Method Router → Registry

**주요 변경사항**:
- 사전 등록 (모든 핸들러 로드) → 지연 로딩 (메타데이터만)
- 동기 Map 조회 → 비동기 동적 import
- 모든 핸들러 메모리 상주 → 필요한 그룹만 로드

**마이그레이션 포인트**:
- `registerHandlers()` 제거
- `METHOD_METADATA` 기반 동적 로딩

### 3. Handler Files → Group Modules

**주요 변경사항**:
- Factory 패턴 → 그룹 모듈 패턴
- `context.pyodideService` → `self.pyodide` (Worker 컨텍스트)
- 16개 핸들러 파일 → 6개 그룹 파일 (논리적 그룹)

**마이그레이션 포인트**:
- `createXxxHandlers()` → `XxxGroup.handlers`
- Pyodide 접근 방식 변경 (Worker 환경)

### 4. Python Code 분리

**주요 변경사항**:
- `pyodide-statistics.ts` (2,545줄) → 4개 Worker별 Python 파일
- 단일 거대 파일 → Worker별 모듈화
- 6개 논리 그룹 → 4개 Worker 매핑

**Worker별 Python 매핑**:
- Worker 1 → worker1-descriptive.py (Descriptive 그룹)
- Worker 2 → worker2-hypothesis.py (Hypothesis 그룹)
- Worker 3 → worker3-nonparametric-anova.py (Nonparametric + ANOVA 그룹)
- Worker 4 → worker4-regression-advanced.py (Regression + Advanced 그룹)

**마이그레이션 포인트**:
- Python 함수를 Worker별로 분류 (그룹별 아님)
- 각 Worker에 필요한 패키지만 import

---

## 2+2 Adaptive Worker Pool 구성

### 코어 Worker (항상 활성, 80% 사용자)

- **Worker 1 (Descriptive)**: 10개 메서드, 80MB, 0.8초 초기화
- **Worker 2 (Hypothesis)**: 8개 메서드, 90MB, 1.2초 초기화

### 확장 Worker (필요시 로딩, 20% 사용자)

- **Worker 3 (Nonparametric + ANOVA)**: 18개 메서드, 140MB, 2.3초 초기화
- **Worker 4 (Regression + Advanced)**: 24개 메서드, 200MB, 3.8초 초기화

### 로딩 전략

- 앱 시작 시: 코어 Worker 2개만 생성 (170MB, 2초)
- 비모수/분산분석 요청: Worker 3 지연 로딩
- 회귀/고급분석 요청: Worker 4 지연 로딩
- 20분 미사용 시: 확장 Worker 자동 종료 (코어는 유지)

### 설계 근거

- Hypothesis는 자주 쓰임 → 코어 Worker로 분리 (Worker 2 과부하 방지)
- Nonparametric은 전문가용 → ANOVA와 묶어 확장
- 메서드 수 균형: 10, 8, 18, 24 (고르게 분산)

---

## 호환성 보장

### 타입 호환성

- `MethodParameters` - 변경 없음
- `CalculationResult` - 변경 없음
- `DataRow` - 변경 없음

**기존 페이지 코드 변경 불필요**:
```typescript
// Before & After 동일
await StatisticalCalculator.calculate('mean', data, params)
```

### 테스트 호환성

**기존 27개 유닛 테스트**:
- 모두 그대로 통과해야 함
- 테스트 코드 변경 없이 실행

**E2E 테스트**:
- Worker 비동기 처리로 인한 타이밍 조정 필요
- `await page.waitForSelector()` 추가 가능

---

## 성능 검증

### 측정 지표

**성능 (코어 그룹: Descriptive, Hypothesis)**:

| 지표 | Phase 4-1 | Phase 5 목표 | 측정 방법 |
|------|-----------|-------------|----------|
| 앱 시작 | 2.8초 | <0.5초 | Performance API |
| 첫 계산 (코어) | 11.8초 | <3초 | 벤치마크 |
| 첫 계산 (확장) | 11.8초 | <6초 | 벤치마크 (Worker 로딩 포함) |
| 캐싱 계산 | 0.27초 | <0.1초 | 벤치마크 |
| UI 블로킹 | 11.8초 | 0초 | 사용자 테스트 |

**메모리 (트레이드오프, 추정치)**:

| 지표 | Phase 4-1 | Phase 5 추정 | 변화 | 허용 범위 |
|------|-----------|-------------|------|----------|
| 초기 메모리 | 48MB | 85MB | +77% | 70-100MB |
| Pyodide 로드 후 | 127MB | 170MB | +34% | 150-200MB |
| 전체 로드 후 | - | 510MB | Worker 4개 | 400-600MB |

**검증**: Day 8에 실측 후 범위 벗어나면 조정

**핵심 가치**: UI 블로킹 제거 (메모리 증가 허용)

### 검증 방법

**초기 로딩 시간**:
```typescript
const start = performance.now()
await import('@/lib/statistics/registry/statistical-registry')
const end = performance.now()
console.log(`초기 로딩: ${end - start}ms`) // < 500ms
```

**메모리 사용량**:
- Chrome DevTools > Memory > Take Snapshot
- 코어 Worker 2개 생성 후: ~170MB
- 확장 Worker 로딩 후: ~290MB

---

## 문제 해결

### 일반적인 이슈

1. **Worker 통신 실패**
   - 원인: Worker 스크립트 경로 오류
   - 해결: next.config.ts에서 publicPath 확인

2. **Pyodide 로드 실패**
   - 원인: CDN 접속 불가
   - 해결: 로컬 번들 사용 또는 CDN URL 확인

3. **메모리 누수**
   - 원인: 확장 Worker 종료 안 됨
   - 해결: 20분 타이머 로직 확인 (Worker 3, 4만)

4. **테스트 타임아웃**
   - 원인: Worker 초기화 시간
   - 해결: 테스트 타임아웃 증가 (30초)

---

## 롤백 절차

### 브랜치 전략

```
main (Phase 4-1 안정)
  ├─ refactor/phase5-1-registry (Day 1-3)
  ├─ refactor/phase5-2-worker-pool (Day 4-7)
  └─ refactor/phase5-3-integration (Day 8-10)
```

### 롤백 시나리오

1. **Phase 1 실패**: `git checkout main` - 현재 구조 유지
2. **Phase 2 실패**: Phase 1 브랜치 유지 - Registry만 적용
3. **Phase 3 실패**: Phase 2 브랜치 유지 - 통합 문제만 해결

---

## 완료 검증

### 체크리스트

- [ ] 50개 메서드 모두 작동
- [ ] 27개 유닛 테스트 통과
- [ ] E2E 테스트 통과
- [ ] 성능 목표 달성 (초기 로딩 <0.5초, 첫 계산 <3초)
- [ ] 메모리 목표 달성 (초기 170MB, 평균 290MB)
- [ ] HTML 빌드 성공
- [ ] Tauri 앱 빌드 성공
- [ ] 모든 브라우저 테스트 통과

---

**문서 버전**: 2.0
**작성일**: 2025-10-03
**작성자**: Claude Code
