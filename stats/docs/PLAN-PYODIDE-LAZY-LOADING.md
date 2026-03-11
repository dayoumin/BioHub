# Pyodide 분할 로딩 & 메모리 최적화 계획

> 상태: **계획 수립** | 우선순위: 중간 | 작성일: 2026-03-10

## 배경

### 현재 구조
```
접속 → PyodidePreloader (requestIdleCallback, 라우트 무관)
  → Pyodide 코어 WASM (~7MB)
  → NumPy (~12MB)          ← 항상 로드
  → SciPy (~25MB)          ← 항상 로드 (모든 Worker가 top-level import)
  → helpers.py (~5KB)
  ─────────────────────
  합계: ~44MB 다운로드, ~85MB 메모리 상주

분석 실행 시 → ensureWorkerLoaded(N)
  → 추가 패키지 로드 (WORKER_EXTRA_PACKAGES) ← 이미 지연 로딩 구현됨
  → Worker Python 코드 실행 (runPythonAsync)

  Worker 1 (기술통계):        추가 없음
  Worker 2 (가설검정):        + statsmodels + pandas
  Worker 3 (비모수/ANOVA):    + statsmodels + pandas + sklearn
  Worker 4 (회귀/고급):       + statsmodels + sklearn
  Worker 5 (생존분석):        + sklearn
```

### 문제점
1. **초기 로딩**: NumPy+SciPy가 무조건 로드 → 통계 안 쓰는 사용자도 44MB 부담
2. **메모리 상주**: `dispose()` 있지만 자동 호출 없음 → WASM ~85MB 영구 점유
3. **그래프 시각화와 공존**: Graph Studio 사용 시 Pyodide 메모리가 불필요하게 점유

### 현재 캐싱 (이미 구현됨)
- **Service Worker** (`sw.js`): CDN 요청 Cache-First, 365일 유효
- **로컬 파일** (`pnpm setup:pyodide`): 오프라인 배포용
- **Singleton**: 앱 내 1회만 초기화

### 패키지 분할 제약 (중요)

**Pyodide의 `loadPackage()`는 `.whl` 파일 단위로 로드** — 서브모듈 단위 분할 불가.

```
scipy.whl (~25MB) ← 이걸 통째로 받아야 함
  ├── scipy.stats      ← t-test, ANOVA (자주 사용)
  ├── scipy.optimize   ← 곡선피팅 (일부만 사용)
  ├── scipy.linalg     ← stats 내부 의존
  ├── scipy.special    ← stats 내부 의존
  └── scipy.signal     ← 미사용
```

단, Python `import`는 lazy → `from scipy import stats`만 하면 signal/optimize는 메모리에 안 올라감.
**다운로드는 통째, 메모리는 사용 서브모듈만** — 이 특성을 활용.

따라서 최적화 가능 단위는 **패키지 레벨**:

| 패키지 | 다운로드 | 런타임 메모리 | 사용 빈도 |
|--------|---------|-------------|----------|
| numpy | ~12MB | ~15MB | 필수 (scipy 의존) |
| scipy | ~25MB | ~20-40MB (import한 서브모듈만) | 모든 분석 (51개 전체) |
| statsmodels | ~15MB | ~30MB | 회귀, ANOVA 사후검정, 혼합모형 등 |
| pandas | ~8MB | ~20MB | statsmodels 의존성 |
| scikit-learn | ~10MB | ~25MB | PCA, 클러스터링, LDA, ROC |

### SciPy를 지연할 수 없는 이유

**모든 Worker 파일이 top-level에서 scipy를 import:**
```python
# worker1~5 전부 동일 패턴
import numpy as np
from scipy import stats          ← top-level import
from scipy.stats import binomtest
```

Worker 코드 실행(`runPythonAsync`) 전에 SciPy가 반드시 로드되어야 함.
따라서 **SciPy는 코어 패키지에서 분리 불가** — NumPy+SciPy는 항상 함께 로드.

**사용자 유형별 효과 (현실적):**
```
👤 "통계 미사용" (홈, Graph Studio만)
  현재: 44MB 다운로드 → 최적화 후: 0MB               ✅ Phase 1

👤 "t-test/ANOVA만" (가장 흔함)
  현재: 44MB + Worker 즉시 → 최적화 후: 44MB (동일, 이미 최적)

👤 "회귀분석까지"
  현재: 44MB + 23MB(statsmodels+pandas) → 최적화 후: 동일 (이미 지연 로딩 중)

👤 "PCA/클러스터링" (드묾)
  현재: 44MB + 33MB → 최적화 후: 동일 (이미 지연 로딩 중)
```

---

## 목표

| 목표 | 측정 기준 |
|------|----------|
| 통계 미사용 시 Pyodide 로드 안 함 | 홈/Graph Studio 진입 시 WASM 다운로드 0 |
| 비활성 시 메모리 해제 | N분 미사용 후 자동 dispose |
| 그래프 작업 시 메모리 확보 | Graph Studio 진입 시 Pyodide 해제 가능 |
| 메서드 선택 시 추가 패키지 prefetch | 분석 실행 전에 로드 완료 |

---

## Phase 1: 진입점 기반 지연 로딩 (난이도: 낮음, 효과: 큼)

### 변경 사항

**현재**: `PyodidePreloader`가 모든 페이지에서 idle 시 로드 (라우트 무관)
**변경**: Smart Flow 진입 시에만 로드 시작

```
AS-IS:
  어떤 페이지든 접속 → requestIdleCallback → Pyodide 전체 로드

TO-BE:
  홈(/) 접속 → 로드 없음             ✅ 44MB 절약
  Graph Studio → 로드 없음           ✅ 44MB 절약
  Bio-Tools → 로드 없음              ✅ 44MB 절약
  Smart Flow 진입 → Pyodide 코어 + NumPy + SciPy 로드 시작
```

### 구현
1. `PyodidePreloader.tsx` 수정: `usePathname()`으로 Smart Flow 라우트 체크
2. 또는 `PyodidePreloader`를 `app/(smart-flow)/layout.tsx`에만 배치

### 리스크
- Smart Flow 첫 진입 시 로딩 대기 (캐시 없을 때 2-3초)
- **완화**: 로딩 UI 이미 있음 (progress bar)

---

## Phase 2: 메서드 선택 시 Worker 패키지 prefetch (난이도: 낮음)

> 기존 Phase 4를 Phase 2로 승격. 기존 Phase 2(코어/패키지 분리)는 SciPy top-level import 제약으로 불가.

### 변경 사항

메서드 선택(Step 1 PurposeInputStep) 시점에 해당 Worker의 추가 패키지를 미리 로드.
현재는 `callWorkerMethod` → `ensureWorkerLoaded` 시점에야 로드 시작.

```
AS-IS:
  메서드 선택 → 변수 매핑 → 분석 실행 클릭 → [패키지 로드 대기] → 결과

TO-BE:
  메서드 선택 → [백그라운드 패키지 로드 시작] → 변수 매핑 → 분석 실행 → 즉시 결과
```

### 메서드 → Worker 매핑 (기존 구조 활용)

Worker 번호는 이미 `statistical-methods.ts`에 정의됨 (51개 메서드).
새로운 매핑 불필요 — 기존 `WORKER_EXTRA_PACKAGES` + Worker 번호로 충분.

```typescript
// PurposeInputStep.tsx 또는 MethodSelector.tsx에서:
const onMethodSelect = (method: StatisticalMethod) => {
  setSelectedMethod(method)

  // 백그라운드에서 해당 Worker의 추가 패키지 미리 로드
  const workerNum = method.workerNumber // 이미 존재하는 필드
  pyodideCore.ensureWorkerLoaded(workerNum).catch(() => {}) // non-blocking
}
```

### 구현
1. `PurposeInputStep.tsx` 또는 `MethodSelector.tsx`에서 메서드 선택 콜백에 prefetch 추가
2. `ensureWorkerLoaded`는 이미 멱등성 보장 (로드된 Worker 스킵)
3. 실패해도 `callWorkerMethod` 시점에 재시도됨

### 변경 대상
- `components/smart-flow/steps/purpose/MethodSelector.tsx` — prefetch 호출 추가

---

## Phase 3: 자동 메모리 관리 (난이도: 중간)

### Idle Timeout Dispose

```typescript
// pyodide-core.service.ts에 추가
class PyodideCoreService {
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000 // 5분

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      console.log('[Pyodide] idle 5분 → 메모리 해제')
      this.dispose()
    }, this.IDLE_TIMEOUT)
  }

  // callWorkerMethod 내부에서 호출
  async callWorkerMethod<T>(...): Promise<T> {
    this.resetIdleTimer()
    // ... 기존 로직
  }

  // dispose 시 타이머도 정리
  dispose(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    // ... 기존 dispose 로직
  }
}
```

### 페이지 이동 시 해제

```typescript
// app/graph-studio/layout.tsx에 추가:
'use client'
import { useEffect } from 'react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

useEffect(() => {
  // getInstance()는 인스턴스가 없으면 새로 생성하므로,
  // 먼저 초기화 여부를 확인해야 함
  const instance = PyodideCoreService.getInstance()
  if (instance.isInitialized()) {
    instance.dispose()
  }
}, [])
```

### 메모리 해제의 실효성

| 모드 | dispose() 시 메모리 해제 | 비고 |
|------|------------------------|------|
| **Main Thread** | `this.pyodide = null` → GC 의존 | WASM 메모리는 즉시 해제 불확실 |
| **Web Worker** | `worker.terminate()` → **즉시 해제** | Worker 스레드 + WASM 모두 해제 |

> **권장**: Phase 3 구현 시 Web Worker 모드 기본 활성화 검토.
> Worker 모드에서 `terminate()`는 OS 레벨에서 스레드를 종료하므로 메모리 회수가 확실함.

### 재초기화 전략
- `dispose()` 후 `pyodide = null`, `packagesLoaded = false`, `loadedWorkers.clear()` → 깨끗한 상태
- Smart Flow 재진입 → `initialize()` 호출 시 `if (this.pyodide)` 가드 통과 → 정상 재초기화
- Service Worker 캐시 덕분에 .whl 재다운로드 없음 → 재초기화 ~0.3초

---

## 구현 우선순위

```
Phase 1 (진입점 제한)          → 효과: 큼   난이도: 낮음  → 🟢 즉시
Phase 2 (Worker prefetch)     → 효과: 중간  난이도: 낮음  → 🟢 Phase 1과 함께
Phase 3 (자동 메모리 관리)      → 효과: 큼   난이도: 중간  → 🟡 Graph Studio 작업과 함께
```

> ~~기존 Phase 2 (코어/패키지 분리)~~ 삭제됨:
> SciPy가 모든 Worker top-level import로 코어에서 분리 불가.
> 추가 패키지(statsmodels/sklearn)는 이미 `WORKER_EXTRA_PACKAGES`로 지연 로딩 중.

---

## 메모리 영향 분석: 그래프 시각화

### 그래프 시각화 메모리 사용

| 구성요소 | 메모리 | 비고 |
|----------|--------|------|
| Canvas 2D (차트) | 10-30MB | 데이터 포인트 수에 비례 |
| SVG DOM (복잡한 그래프) | 20-50MB | 노드 수에 비례 |
| 이미지 텍스처 | 5-20MB | 배경/아이콘 |
| Three.js/WebGL (3D) | 50-100MB | 3D 사용 시 |
| **합계** | **30-100MB** | |

### Pyodide + 그래프 동시 사용 시

```
현재 (동시 상주):
  Pyodide:     ~85MB
  Graph Studio: ~50MB
  기타 (React 등): ~30MB
  ─────────────────────
  합계:        ~165MB  ← 저사양 PC 부담

Phase 3 적용 후 (Graph Studio 진입 시 Pyodide dispose):
  Graph Studio: ~50MB
  기타 (React 등): ~30MB
  ─────────────────────
  합계:        ~80MB   ← 절반으로 감소
```

### 브라우저 메모리 한계 참고

| 환경 | 탭당 메모리 한계 |
|------|-----------------|
| Chrome Desktop (64bit) | ~4GB |
| Chrome Mobile (Android) | ~512MB-1GB |
| Safari iOS | ~256MB-512MB |
| 저사양 PC (4GB RAM) | ~1GB (OS 공유) |

현재 165MB는 데스크탑에서 문제없지만, 향후 3D 그래프나 대용량 데이터셋 지원 시 최적화 필요.

---

## 변경 대상 파일

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `components/providers/PyodidePreloader.tsx` | 1 | 라우트 조건부 로드 (`usePathname`) |
| `components/smart-flow/steps/purpose/MethodSelector.tsx` | 2 | 메서드 선택 시 Worker prefetch |
| `lib/services/pyodide/core/pyodide-core.service.ts` | 3 | idle timer 추가, dispose에 timer 정리 |
| `app/graph-studio/layout.tsx` | 3 | 진입 시 Pyodide dispose |

---

## 미결정 사항

1. **idle timeout 시간**: 5분? 10분? 사용자 테스트 필요
2. **Web Worker 모드 기본 활성화**: 현재 opt-in (`NEXT_PUBLIC_PYODIDE_USE_WORKER`) → Phase 3에서 기본값 변경 검토. Worker `terminate()`가 main-thread `pyodide = null`보다 메모리 회수 확실
3. **모바일 지원 시**: `performance.memory` API로 힙 사용량 모니터링 → 임계치 초과 시 자동 dispose
4. **SciPy top-level import 제거 가능성**: 모든 Worker에서 `from scipy import stats`를 함수 내부 import로 변경하면 SciPy 지연 가능 — 단, 51개 메서드 전부 수정 필요 + 매 호출마다 import 오버헤드. 효과 대비 비용이 높아 현재는 미채택