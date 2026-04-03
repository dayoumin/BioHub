# Graph Studio E2E 테스트 — 다른 세션 핸드오프

## 목적

Graph Studio의 기능 테스트를 E2E(Playwright)로 수행.
통계 E2E는 별도 세션에서 진행 중이므로, **이 세션은 그래프만 담당**.

---

## 포트 충돌 방지 (CRITICAL)

통계 테스트 세션이 **포트 3000**을 사용 중.
이 세션은 **포트 3001**을 사용해야 함.

### 방법: playwright.config 복사 + 포트 변경

```bash
# stats/ 디렉토리에서 실행
cd d:/Projects/BioHub/stats

# 그래프 전용 config 생성
cp playwright.config.ts playwright-graph.config.ts
```

`playwright-graph.config.ts`에서 변경할 부분:

```typescript
// baseURL 변경
use: {
  baseURL: 'http://localhost:3001',  // 3000 → 3001
},

// webServer 포트 변경
webServer: {
  command: 'npx --yes serve out -p 3001 -s',  // 3000 → 3001
  url: 'http://localhost:3001',                // 3000 → 3001
},

// 테스트 대상을 graph-studio만으로 제한
testMatch: '**/graph-studio*.spec.ts',
```

### 실행 명령

```bash
# 빌드 (이미 되어있으면 skip)
pnpm run build

# 그래프 테스트만 실행
npx playwright test --config=playwright-graph.config.ts

# headed 모드 (브라우저 보면서)
npx playwright test --config=playwright-graph.config.ts --headed
```

---

## 현재 Graph Studio E2E 현황

### 기존 테스트 (6개) — `e2e/graph-studio-e2e.spec.ts`

| ID | 테스트 | 내용 |
|----|--------|------|
| T1 | 업로드 모드 렌더링 | smoke — 페이지/드롭존/버튼 표시 확인 |
| T2 | 차트 유형 클릭 → 에디터 | 샘플 데이터로 bar 차트 진입 |
| T3 | 파일 업로드 → 에디터 | CSV 업로드 후 차트 렌더링 |
| T4 | 사이드 패널 탭 전환 | data/style 탭 활성화 토글 |
| T5 | 사이드 패널 토글 | 열기/닫기 |
| T6 | AI 패널 토글 | AI 입력/전송 버튼 표시 |

### 추가 필요한 테스트 (제안)

| 우선순위 | 테스트 | 내용 |
|----------|--------|------|
| P1 | 차트 타입별 렌더링 | bar, line, scatter, pie, heatmap 등 각각 샘플 클릭 → 렌더링 확인 |
| P1 | CSV 데이터 → 차트 반영 | 업로드 후 데이터 탭에서 컬럼 확인 |
| P1 | 차트 타입 변경 | 에디터 진입 후 다른 차트 타입으로 전환 |
| P2 | 스타일 변경 | 색상/폰트/레이블 등 스타일 탭 옵션 변경 |
| P2 | dataZoom | 줌 인/아웃 동작 |
| P2 | Undo/Redo | 변경 후 되돌리기/다시하기 |
| P3 | AI 편집 | AI 패널에서 명령 → 차트 변경 (mock 필요) |
| P3 | 내보내기 | PNG/SVG 내보내기 버튼 동작 |

---

## 셀렉터 레지스트리

모든 셀렉터는 `e2e/selectors.ts`의 `S` 객체 사용. 주요 Graph Studio 셀렉터:

```typescript
S.graphStudioPage           // 페이지 루트
S.graphStudioDropzone       // 드래그앤드롭 영역
S.graphStudioUploadZone     // 업로드 점선 박스
S.graphStudioFileUploadBtn  // 파일 선택 버튼
S.graphStudioFileInput      // sr-only file input (setInputFiles 타겟)
S.graphStudioChartType(type)// 차트 유형 썸네일 ('bar', 'line', etc.)
S.graphStudioChart          // 메인 차트 영역
S.graphStudioSidePanel      // 사이드 패널
S.graphStudioSideToggle     // 사이드 패널 토글
S.graphStudioTabData        // 데이터 탭
S.graphStudioTabStyle       // 스타일 탭
S.graphStudioAiToggle       // AI 패널 토글
S.graphStudioAiInput        // AI 입력
S.graphStudioAiSend         // AI 전송
S.graphStudioUndo           // Undo
S.graphStudioRedo           // Redo
S.graphStudioLeftPanel      // 좌측 데이터 패널
S.graphStudioRightPanel     // 우측 속성 패널
S.graphStudioLeftToggle     // 좌측 패널 토글
```

---

## 테스트 데이터

- `stats/public/test-data/독립표본t검정_암수차이.csv` — 기존 T3에서 사용
- `stats/test-data/e2e/` — 32개 CSV 파일 (anova, correlation, regression 등)
- `stats/public/example-data/` — 메서드별 예제 데이터

---

## 핵심 헬퍼 패턴

```typescript
// 페이지 이동 + hydration 대기
async function navigateToGraphStudio(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.goto('/graph-studio', { waitUntil: 'load', timeout: 60_000 })
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-graph-studio-ready') === 'true',
    { timeout: 30_000 },
  )
}

// 샘플 차트로 에디터 진입
async function enterEditorViaSampleChart(page: Page, chartType = 'bar'): Promise<void> {
  const thumbnail = page.locator(S.graphStudioChartType(chartType))
  await thumbnail.waitFor({ state: 'visible', timeout: 10_000 })
  await thumbnail.click()
  await page.waitForSelector(S.graphStudioChart, { state: 'attached', timeout: 10_000 })
}
```

---

## 주의사항

1. **빌드 필수**: `pnpm run build` → `stats/out/` 생성 (static export)
2. **포트 3001 사용**: 통계 세션이 3000 사용 중
3. **pageerror 수집**: `page.on('pageerror')` 패턴 사용 권장
4. **hydration 대기**: `data-graph-studio-ready` 속성 확인 필수
5. **새 셀렉터 추가 시**: 반드시 `e2e/selectors.ts`에 등록 + 컴포넌트에 `data-testid` 추가
6. **`taskkill /IM node.exe` 절대 금지** — 다른 세션의 serve 프로세스 죽임
