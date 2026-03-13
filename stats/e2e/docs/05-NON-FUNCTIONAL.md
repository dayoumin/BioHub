# Phase 5: 비기능 테스트 (성능 · 접근성 · 호환성)

> 통계 분석 / 그래프 시각화 각각에 대한 비기능 요구사항 검증

## 목표

기능이 "동작하는가"를 넘어 "**잘** 동작하는가"를 검증한다:
- 성능: 허용 가능한 시간 내에 완료되는가?
- 접근성: 보조 기술 사용자가 접근 가능한가?
- 호환성: 다양한 환경에서 동작하는가?

---

## Part A: 통계 분석 비기능 (nonfunctional/statistics-nonfunctional.spec.ts)

### 5A.1 성능 — 통계 분석 (@critical)

```
TC-5A.1.1: Pyodide 초기 로딩 시간
  측정:
    1. 새 세션 시작 (캐시 없음)
    2. t-test 분석 실행 트리거
    3. Pyodide 로딩 시작 → 완료 시간 측정
  기준:
    - CDN: < 15초 (첫 로드)
    - 캐시: < 3초 (재방문)
  방법:
    - performance.mark() / performance.measure()
    - 또는 타임스탬프 로깅

TC-5A.1.2: 통계 분석 실행 시간 (메서드별)
  측정:
    - 독립표본 t-검정: < 5초 (Pyodide 로딩 후)
    - 일원 ANOVA: < 5초
    - 다중 회귀: < 10초
    - PCA: < 10초
    - ARIMA: < 15초
  방법:
    - run-analysis-btn 클릭 → results-main-card 표시 시간

TC-5A.1.3: CSV 업로드 처리 시간
  측정:
    - 100행 CSV: < 1초
    - 1,000행 CSV: < 2초
    - 5,000행 CSV: < 5초
    - 10,000행 CSV: < 10초
  방법:
    - input.setInputFiles() → data-profile-summary 표시 시간

TC-5A.1.4: 메모리 사용량 모니터링
  측정:
    - 분석 5회 연속 실행 후 메모리 사용량
    - performance.memory.usedJSHeapSize 추적
  기준:
    - 5회 분석 후 메모리 증가 < 50MB (메모리 누수 없음)

TC-5A.1.5: 연속 분석 시 성능 저하 없음
  측정:
    - 1번째 분석 실행 시간 vs 5번째 분석 실행 시간
  기준:
    - 5번째 분석이 1번째 대비 2배 이상 느리지 않음
```

### 5A.2 접근성 — 통계 분석 (@important)

```
TC-5A.2.1: 키보드 내비게이션 — Smart Flow
  검증:
    - Tab 키로 Hub → Step 1 → Step 2 → Step 3 → Step 4 이동
    - Enter 키로 버튼 활성화
    - 파일 업로드: Tab → Enter로 파일 선택 다이얼로그
    - 메서드 검색: Tab → 입력 → Arrow 키 → Enter 선택

TC-5A.2.2: 스크린 리더 — 결과 화면
  검증:
    - results-main-card에 aria-label 존재
    - 통계량 숫자에 role="status" 또는 aria-live
    - 차트에 aria-label (설명 텍스트)
    - 에러 메시지에 role="alert"

TC-5A.2.3: 색각 이상 — 통계 결과
  검증:
    - 유의/비유의 구분이 색상만으로 되지 않음
    - 아이콘(✓/✗) 또는 텍스트로 보충
    - 효과크기 해석이 색상+텍스트 병행

TC-5A.2.4: 고대비 모드 대응
  검증:
    - prefers-contrast: high에서 UI 깨짐 없음
    - 버튼/입력 필드 경계 보임

TC-5A.2.5: 포커스 트랩 — 모달
  검증:
    - 변수 선택 모달(variable-modal) 열림 → 포커스 모달 내 순환
    - ESC 키 → 모달 닫힘
    - SampleSizeModal 동일
```

### 5A.3 호환성 — 통계 분석 (@nice-to-have)

```
TC-5A.3.1: Firefox에서 Smart Flow 동작
  설정: playwright.config.ts에 firefox 프로젝트 추가
  검증:
    - 업로드 → 메서드 선택 → 분석 → 결과 표시
    - Pyodide Web Worker 정상 동작

TC-5A.3.2: WebKit(Safari)에서 Smart Flow 동작
  검증:
    - 동일 워크플로우 테스트
    - IndexedDB 히스토리 저장

TC-5A.3.3: 오프라인 Pyodide (로컬 배포)
  조건: setup:pyodide 실행 후 CDN 차단
  검증:
    - 로컬 Pyodide에서 분석 정상 동작
```

---

## Part B: 그래프/시각화 비기능 (nonfunctional/graph-nonfunctional.spec.ts)

### 5B.1 성능 — 그래프 (@critical)

```
TC-5B.1.1: 차트 초기 렌더링 시간
  측정:
    - 샘플 데이터 Bar 차트: < 2초
    - 100행 CSV Line 차트: < 3초
    - 1,000행 CSV Scatter: < 5초
  방법:
    - 차트 유형 클릭 → graphStudioChart visible 시간

TC-5B.1.2: 차트 유형 전환 시간
  측정:
    - Bar → Line 전환: < 1초
    - Line → Scatter 전환: < 1초
  기준:
    - 사용자가 "멈춤" 체감 없음

TC-5B.1.3: 대용량 데이터 차트 렌더링
  측정:
    - 5,000행 데이터 차트 렌더링: < 5초
    - 10,000행 데이터 차트 렌더링: < 10초
  검증:
    - 렌더링 후 상호작용 (호버, 줌) 응답 < 200ms

TC-5B.1.4: 차트 리렌더링 (스타일 변경 시)
  측정:
    - 색상 변경 → 차트 업데이트: < 500ms
    - 제목 변경 → 차트 업데이트: < 500ms
  기준:
    - 입력 후 즉시 반영 (사용자 체감)

TC-5B.1.5: ECharts 메모리 관리
  측정:
    - 차트 유형 10번 전환 후 메모리
    - 이전 차트 인스턴스 dispose 확인
  기준:
    - 메모리 누수 없음 (10번 전환 후 증가 < 20MB)
```

### 5B.2 접근성 — 그래프 (@important)

```
TC-5B.2.1: 키보드 내비게이션 — Graph Studio
  검증:
    - Tab 키로 차트 유형 선택 → Enter로 활성화
    - Tab으로 사이드 패널 탭 전환
    - Tab으로 AI 패널 접근

TC-5B.2.2: 차트 대체 텍스트
  검증:
    - ECharts canvas에 aria-label 존재
    - 차트 유형 + 데이터 요약 (예: "Bar chart showing group comparison")
    - 또는 별도 SR-only 요약 텍스트

TC-5B.2.3: 색각 이상 — 차트 색상
  검증:
    - 기본 팔레트가 색맹 친화적 (deuteranopia safe)
    - 또는 "색맹 모드" 팔레트 옵션 존재
    - 패턴/해칭으로 구분 보충

TC-5B.2.4: 차트 썸네일 — 포커스 표시
  검증:
    - 차트 유형 썸네일에 :focus-visible 스타일
    - 현재 선택된 유형 시각적 구분

TC-5B.2.5: 감소된 모션 대응
  검증:
    - prefers-reduced-motion: reduce에서
    - 차트 애니메이션 비활성화
    - 전환 효과 최소화
```

### 5B.3 호환성 — 그래프 (@nice-to-have)

```
TC-5B.3.1: Firefox에서 ECharts 렌더링
  검증:
    - Bar/Line/Scatter 정상 렌더링
    - Canvas 2D 컨텍스트 정상

TC-5B.3.2: WebKit에서 ECharts 렌더링
  검증:
    - 동일한 차트 렌더링
    - 사이드 패널 레이아웃

TC-5B.3.3: Plotly 차트 브라우저 호환
  검증:
    - Plotly WebGL 차트 (3D 등) 렌더링
    - 모드바 상호작용
```

---

## Part C: 공통 비기능 (nonfunctional/common-nonfunctional.spec.ts)

### 5C.1 페이지 로드 성능 (@critical)

```
TC-5C.1.1: 초기 페이지 로드 시간
  측정:
    - / (Hub): < 3초
    - /graph-studio: < 3초
    - /dashboard: < 3초
  방법:
    - page.goto() → DOMContentLoaded 시간
    - First Contentful Paint (FCP) 측정

TC-5C.1.2: 정적 자산 로딩
  측정:
    - JS 번들 크기 확인 (Next.js 정적 빌드)
    - 초기 로드 네트워크 요청 수
  기준:
    - 초기 JS 번들 < 500KB (gzip)
    - 초기 요청 < 30개
```

### 5C.2 에러 경계 (Error Boundaries) (@important)

```
TC-5C.2.1: 컴포넌트 크래시 → ErrorBoundary 표시
  검증:
    - 의도적 에러 주입 (evaluate로 throw)
    - ErrorBoundary fallback UI 표시
    - "다시 시도" 버튼 동작

TC-5C.2.2: ChunkLoadError 복구
  검증:
    - 네트워크 차단 → 청크 로드 실패
    - "다시 시도" 버튼 표시
    - 클릭 시 페이지 복구
```

### 5C.3 반응형 레이아웃 (@important)

```
TC-5C.3.1: 뷰포트 1024px — 최소 지원 해상도
  검증 (통계 + 그래프):
    - Smart Flow 4단계 UI 깨짐 없음
    - Graph Studio 패널 겹침 없음
    - 버튼/입력 터치 가능 크기

TC-5C.3.2: 뷰포트 1440px — 일반 데스크톱
  검증:
    - 컨텐츠 너비 적절
    - 사이드 패널 정상 표시

TC-5C.3.3: 뷰포트 1920px — 와이드
  검증:
    - 과도한 빈 공간 없음
    - 차트 크기 적절히 확대

TC-5C.3.4: 뷰포트 2560px — 울트라와이드
  검증:
    - 레이아웃 깨짐 없음
    - max-width 적용
```

---

## 구현 패턴

### 성능 측정 헬퍼

```typescript
// helpers/performance-helpers.ts

async function measurePageLoad(page: Page, url: string): Promise<number> {
  const start = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  return Date.now() - start
}

async function measureAction(page: Page, action: () => Promise<void>, waitFor: string): Promise<number> {
  const start = Date.now()
  await action()
  await page.waitForSelector(waitFor, { timeout: 30000 })
  return Date.now() - start
}

async function getMemoryUsage(page: Page): Promise<number> {
  return page.evaluate(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } }
    return perf.memory?.usedJSHeapSize ?? 0
  })
}

async function measureFCP(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            resolve(entry.startTime)
          }
        }
      })
      observer.observe({ entryTypes: ['paint'] })
      // fallback
      setTimeout(() => resolve(-1), 10000)
    })
  })
}
```

### 접근성 검증 헬퍼

```typescript
// helpers/a11y-helpers.ts

async function checkKeyboardNavigation(page: Page, steps: string[]): Promise<boolean> {
  for (const selector of steps) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const el = document.activeElement
      return el?.getAttribute('data-testid') ?? el?.tagName ?? 'none'
    })
    // 포커스 순서 검증
  }
  return true
}

async function checkAriaAttributes(page: Page, selector: string): Promise<Record<string, string>> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return {}
    return {
      role: el.getAttribute('role') ?? '',
      'aria-label': el.getAttribute('aria-label') ?? '',
      'aria-live': el.getAttribute('aria-live') ?? '',
      'aria-describedby': el.getAttribute('aria-describedby') ?? '',
    }
  }, selector)
}
```

---

## 파일 구조

```
stats/e2e/nonfunctional/
├── statistics-nonfunctional.spec.ts   # Part A: 통계 비기능
├── graph-nonfunctional.spec.ts        # Part B: 그래프 비기능
└── common-nonfunctional.spec.ts       # Part C: 공통 비기능

stats/e2e/helpers/
├── performance-helpers.ts             # 성능 측정
└── a11y-helpers.ts                    # 접근성 검증
```

## 성능 기준 요약

| 측정 항목 | 통계 | 그래프 |
|-----------|------|--------|
| 페이지 로드 | < 3초 | < 3초 |
| 첫 분석/렌더링 | < 20초 (Pyodide 포함) | < 2초 |
| 후속 분석/렌더링 | < 5초 | < 1초 |
| 데이터 100행 | < 1초 | < 1초 |
| 데이터 5,000행 | < 5초 | < 5초 |
| 데이터 10,000행 | < 10초 | < 10초 |
| 메모리 누수 (5회 반복) | < 50MB 증가 | < 20MB 증가 |

## 실행 시간 예상

- Part A (통계 비기능): ~15분
- Part B (그래프 비기능): ~10분
- Part C (공통 비기능): ~5분
- **전체 Phase 5: ~30분**
