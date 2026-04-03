# E2E Testing Strategy

> Smart Flow 통계 분석 플랫폼의 End-to-End 테스트 전략

**Updated**: 2026-02-06 | **Status**: 2/44 methods tested (t-test, chi-square)

---

## 1. 테스트 도구 비교 및 선택 가이드

### 1-1. 도구별 특성

| 도구 | 방식 | 토큰 비용 | 적합 용도 |
|------|------|----------|----------|
| **Playwright 스크립트** (.spec.ts) | 코드 기반 자동화 | 작성 시 1회 (이후 **0**) | 반복 회귀 테스트, CI/CD |
| **Playwright MCP** (`@playwright/mcp`) | AI + accessibility tree | 매 실행마다 소비 (높음) | 탐색적 테스트, 디버깅, 새 UI 파악 |
| **Vercel Agent Browser** | AI + Snapshot Refs | 매 실행마다 소비 (**MCP 대비 대폭 절감**) | 장시간 AI 자율 탐색, 토큰 효율 중시 |
| **Playwright Test Agent** | 내부적으로 Playwright MCP 사용 | 매 실행마다 소비 | 테스트 자동 생성/디버깅 |

### 1-2. 언제 무엇을 쓸까

```
새 기능 개발 / UI 변경 후 탐색
  ├─ 토큰 여유 있음 → Playwright MCP (accessibility tree, 디버깅 도구 풍부)
  ├─ 토큰 절약 필요 → Vercel Agent Browser (Snapshot Refs로 컨텍스트 절감)
  └─ 자동 테스트 생성 → Playwright Test Agent

회귀 테스트 (기존 기능 확인)
  └─ 항상 → Playwright 스크립트 (npx playwright test)
       토큰 0, CI/CD 통합 가능, 반복 무한

디버깅 (E2E 테스트 실패 원인 추적)
  ├─ 1차: Trace Viewer / 스크린샷 / 로그 확인
  ├─ 2차: Playwright MCP로 실시간 탐색 (Inspector 연동 가능)
  └─ 세션 길어질 때 → Agent Browser로 토큰 절약
```

### 1-3. Playwright MCP vs Vercel Agent Browser 상세 비교

| 항목 | Playwright MCP | Vercel Agent Browser |
|------|---------------|---------------------|
| **컨텍스트 방식** | Accessibility tree 기반 (snapshot mode 지원) | Snapshot + Refs (`@e1`, `@e2`) |
| **토큰 효율** | 구조화된 트리 반환 (vision mode 시 더 높음) | Refs 방식으로 더 적은 컨텍스트 |
| **설정** | MCP 서버 설정 필요 (`@playwright/mcp`) | CLI 단독 실행 (`npx agent-browser`) |
| **브라우저 기능** | 네트워크 가로채기, 멀티탭, PDF, 대기 로직 | 네트워크 가로채기, 멀티탭, PDF, CDP 연결 **모두 지원** |
| **고유 기능** | Snapshot mode (incremental/full/none), Vision mode, Device emulation (143개 디바이스) | `--session` (다중 독립 세션), `--profile` (인증 상태 영구 보존), Rust CLI 네이티브 바이너리 |
| **아키텍처** | Node.js MCP 서버 | Rust CLI + Node.js 데몬 (상주), Node.js fallback |
| **추천** | MCP 생태계 연동, IDE 통합 (Claude Code 등) | bash 기반 에이전트, 장시간 자율 세션 |

> **참고**: 두 도구 모두 내부적으로 Playwright를 사용합니다. 핵심 차이는 AI에 정보를 전달하는 방식(컨텍스트 효율)과 설정 방식입니다.

**참고 자료**:
- [Microsoft Playwright MCP (공식)](https://github.com/microsoft/playwright-mcp)
- [Vercel Agent Browser (공식)](https://github.com/vercel-labs/agent-browser)
- [Agent Browser vs Puppeteer & Playwright (Bright Data)](https://brightdata.com/blog/ai/agent-browser-vs-puppeteer-playwright)

### 1-4. 실전 워크플로우: 도구 조합 파이프라인

각 도구의 장점을 단계별로 조합하여 **토큰 효율과 테스트 품질을 동시에** 확보합니다.

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 탐색 (새 기능/UI 변경 시)                           │
│  도구: Agent Browser (토큰 절약, --session으로 병렬 탐색)       │
│  목적: UI 구조, 셀렉터, 변수 선택 패턴 파악                     │
│  산출물: 셀렉터 목록, 테스트 시나리오 메모                       │
├─────────────────────────────────────────────────────────────┤
│  Phase 2: 스크립트 작성                                       │
│  도구: 직접 코딩 (탐색 결과 기반 .spec.ts)                      │
│  방법: 7개 템플릿 중 해당 패턴 복사 → 셀렉터/데이터만 교체        │
│  비용: 1회성 (이후 토큰 0)                                     │
├─────────────────────────────────────────────────────────────┤
│  Phase 3: 회귀 테스트 (매일 / PR마다 / CI)                     │
│  도구: Playwright 스크립트 (npx playwright test)               │
│  비용: 토큰 0, ~30초                                          │
│  결과: 통과 ✅ → 머지 / 실패 ❌ → Phase 4                      │
├─────────────────────────────────────────────────────────────┤
│  Phase 4: 디버깅 (테스트 실패 시)                               │
│  1차: Trace Viewer (로컬, 토큰 0)                              │
│  2차: Playwright MCP (accessibility tree로 정밀 탐색, IDE 연동) │
│  3차: Agent Browser (장시간 탐색 필요 시 토큰 절약)              │
│  산출물: 버그 수정 + 스크립트 업데이트                            │
└─────────────────────────────────────────────────────────────┘
```

**핵심 원칙**: Agent Browser로 싸게 탐색 → 스크립트로 고정 → 이후 무료 반복. MCP는 디버깅 시에만 투입.

| Phase | 도구 | 토큰 | 빈도 |
|-------|------|------|------|
| 탐색 | Agent Browser | 중 (MCP 대비 절감) | 새 기능 추가 시 |
| 작성 | 코드 편집기 | 0 | 1회 |
| 회귀 | Playwright 스크립트 | **0** | **매일/매 PR** |
| 디버깅 | Trace Viewer → MCP | 0 → 높음 | 실패 시만 |

---

## 2. E2E 테스트 아키텍처

### 2-1. 파일 구조

```
stats/
├── e2e/
│   ├── playwright-e2e.config.ts     # E2E 전용 Playwright 설정
│   ├── smart-flow-e2e.spec.ts       # Smart Flow E2E 테스트 (현재)
│   ├── results/
│   │   ├── screenshots/             # 성공 시 결과 스크린샷
│   │   └── artifacts/               # 실패 시 자동 저장 (스크린샷 + 에러 컨텍스트)
│   └── helpers/                     # (향후) 공통 헬퍼 → Page Object Model 패턴 적용
├── test-data/
│   └── e2e/
│       ├── t-test.csv               # t-검정용 데이터
│       └── chi-square-v2.csv        # 카이제곱용 데이터
```

### 2-2. 테스트 실행

```bash
# 전체 E2E 테스트
cd e2e && E2E_BASE_URL=http://localhost:3005 npx playwright test --config=playwright-e2e.config.ts

# 특정 테스트만
npx playwright test --grep "t-검정" --config=playwright-e2e.config.ts

# headed 모드 (브라우저 보면서)
npx playwright test --headed --config=playwright-e2e.config.ts

# 디버그 모드 (step-by-step Inspector)
npx playwright test --debug --config=playwright-e2e.config.ts

# Trace Viewer (실행 기록 시각화)
npx playwright test --trace on --config=playwright-e2e.config.ts
npx playwright show-trace trace.zip

# CI 병렬 분할 (여러 머신에 분배)
npx playwright test --shard=1/3 --config=playwright-e2e.config.ts
```

### 2-3. Playwright 공식 권장 사항 (적용 현황)

| 권장 사항 | 현재 상태 | 비고 |
|----------|----------|------|
| 테스트 격리 (fresh context) | ✅ 적용 | Playwright 기본 동작 |
| `getByRole`/`getByLabel` 우선 | ⚠️ 부분 적용 | 한국어 텍스트 변경 빈도가 높아 `data-testid` 우선 (아래 4-1 참조) |
| Page Object Model | ❌ 미적용 | 향후 `helpers/` 폴더에 분리 예정 |
| Trace Viewer | ✅ 가능 | `--trace on` 옵션 |
| CI `--shard` | ❌ 미적용 | 테스트 수 증가 시 도입 |

---

## 3. 44개 통계 메서드 테스트 그룹핑

### 3-1. 핵심 원리: 7개 변수 선택 패턴 = 7개 테스트 템플릿

Smart Flow의 `VariableSelectionStep.tsx`는 `getSelectorType()` 함수로 메서드별 변수 선택 UI를 결정합니다.
**동일 패턴 = 동일 E2E 플로우** → 7개 템플릿으로 44개 메서드 전부 커버 가능.

### 3-2. 패턴별 메서드 매핑

| # | 패턴 | 변수 역할 | 메서드 | 수 |
|---|------|----------|--------|---|
| T1 | **one-sample** | dependent 1개 | one-sample-t | 1 |
| T2 | **group-comparison** | groupVar + dependent | t-test, welch-t, one-way-anova, mann-whitney, kruskal-wallis 등 | 8 |
| T3 | **paired** | variables 2개 (정확히) | paired-t, wilcoxon, sign-test, mcnemar | 4 |
| T4 | **correlation** | variables 2+개 | pearson, spearman, kendall, correlation | 4 |
| T5 | **multiple-regression** | dependent + independentVar 2+개 | multiple-regression, stepwise | 3 |
| T6 | **two-way-anova** | groupVar 2+개 + dependent | two-way-anova, three-way-anova | 2 |
| T7 | **default** | dependentVar + independentVar | chi-square, logistic-regression, arima, PCA 등 나머지 전부 | ~22 |

### 3-3. 구현 우선순위

```
Phase 1 (완료): T2 group-comparison (t-test) + T7 default (chi-square)
Phase 2: T3 paired (paired-t) + T4 correlation (pearson)
Phase 3: T1 one-sample + T5 multiple-regression + T6 two-way-anova
Phase 4: T7 default 확장 (logistic, arima, PCA, kaplan-meier 등)
```

### 3-4. 패턴별 테스트 흐름

모든 패턴은 동일한 5단계 플로우를 공유합니다:

```
Hub → 데이터 업로드 → 직접 선택 → 메서드 선택 → 변수 선택 → 분석 시작 → 결과 검증
          ↑                                           ↑              ↑
     공통 (uploadCSV)                          패턴별 다름     공통 (waitForResults)
```

**패턴별 차이점은 "변수 선택" 단계에서만 발생:**

| 패턴 | 변수 선택 UI | 테스트 동작 |
|------|------------|-----------|
| one-sample | 종속변수 1개 선택 | 단일 변수 클릭 |
| group-comparison | 집단변수 + 종속변수 2패널 | 자동 할당 여부 확인 → 필요 시 수동 |
| paired | 변수 2개 선택 (pre/post) | 2개 변수 클릭 |
| correlation | 변수 2+개 체크박스 | 복수 변수 체크 |
| multiple-regression | 종속 1개 + 독립 2+개 | 종속 선택 + 독립 복수 체크 |
| two-way-anova | 요인 2+개 + 종속 1개 | 요인 복수 선택 + 종속 선택 |
| default | 독립 + 종속 토글 | 각 패널에서 1개씩 클릭 |

---

## 4. UI 안정성 가이드라인 (E2E 테스트가 깨지지 않으려면)

### 4-1. 셀렉터 안정성 계층

**Playwright 공식 권장**:
```
getByRole > getByLabel > getByPlaceholder > getByText > data-testid > CSS selector
```

**이 프로젝트의 선택 (한국어 특화)**:
```
data-testid  >  role/aria  >  CSS class  >  텍스트 매칭
```

> **차이 이유**: Playwright 공식은 `role/aria`를 최우선 권장하지만, 이 프로젝트는 한국어 UI 텍스트가 자주 변경됩니다.
> `getByRole('button', { name: '분석 시작' })`은 버튼 라벨이 바뀌면 깨집니다.
> `data-testid="analysis-start-btn"`은 텍스트와 무관하게 안정적입니다.
> 다만 향후 `data-testid`가 충분히 보급되면 `getByTestId()` 패턴으로 전환 권장.

### 4-2. UI 수정 시 체크리스트

- [ ] 기존 `data-testid` 속성 유지 (삭제/변경 금지)
- [ ] 버튼 텍스트 변경 시 E2E 테스트 검색어 확인 (`smart-flow-e2e.spec.ts`)
- [ ] 새 핵심 버튼/단계 추가 시 `data-testid` 부여
- [ ] stepper 단계명 변경 금지 (탐색, 방법, 변수, 분석)
- [ ] "분석 시작", "이 방법으로 분석하기" 등 핵심 CTA 텍스트 유지

### 4-3. E2E에서 사용 중인 핵심 셀렉터

```typescript
// 이 텍스트/패턴을 변경하면 E2E 테스트가 깨집니다:
'데이터 업로드'          // Hub 카드
'직접 선택'             // 방법 선택 탭
'Search methods...'     // 메서드 검색 입력란 placeholder
'이 방법으로 분석하기'    // 방법 확인 버튼
'분석 시작'             // 분석 실행 버튼
'검토 완료'             // 데이터 검증 완료 텍스트
input[type="file"]      // 파일 업로드 입력
```

> **TODO**: 위 텍스트 기반 셀렉터를 `data-testid`로 점진 전환 권장
> 예: `<button data-testid="start-analysis">분석 시작 →</button>`

### 4-4. 테스트 데이터 요구사항

각 패턴에 맞는 CSV 파일이 필요합니다:

| 데이터 | 컬럼 | 용도 |
|--------|------|------|
| `t-test.csv` | group (binary), value (numeric) | group-comparison |
| `chi-square-v2.csv` | gender (binary), preference (binary), age (numeric), ID | default (categorical) |
| (향후) `paired.csv` | pre (numeric), post (numeric) | paired |
| (향후) `correlation.csv` | x, y, z (all numeric) | correlation |
| (향후) `regression.csv` | y (numeric), x1, x2 (numeric) | multiple-regression |
| (향후) `anova-2way.csv` | factor_a, factor_b (categorical), value (numeric) | two-way-anova |

---

## 5. 트러블슈팅

### 5-1. ChunkLoadError (dev 서버)

**증상**: `Loading chunk app/layout.js failed (timeout)`
**원인**: 코드 수정 → HMR 리컴파일 → 브라우저 캐시된 청크 무효화
**해결**:
```bash
# 1. .next 캐시 삭제 후 서버 재시작
rm -rf .next && pnpm dev --port 3005

# 2. 코드 수정 후 최소 10초 대기 후 테스트 실행
sleep 10 && npx playwright test ...

# 3. navigateToUploadStep()에 재시도 로직 구현됨 (최대 3회)
```

**근본 해결**: production build로 테스트 (CI/CD 환경)
```bash
pnpm build && pnpm start -p 3005 &
# production 빌드는 청크가 고정되므로 ChunkLoadError 없음
```

### 5-2. 변수 자동 할당 vs 수동 선택

**AI 자동 추천**:
- 변수 선택 페이지에 "AI 추천 변수:" 박스가 표시됨
- group-comparison 패턴은 자동 할당이 적용되어 "분석 시작" 즉시 활성화
- default 패턴은 추천만 표시, 실제 선택은 안 됨 → 수동 클릭 필요

**테스트 로직**:
```typescript
// "분석 시작"이 이미 enabled이면 → 자동 할당됨 → 건너뜀
// disabled면 → 수동 선택 필요
const isRunEnabled = await runBtn.first().isEnabled().catch(() => false)
if (!isRunEnabled) {
  await selectVariables(page, 'var1', 'var2')
}
```

### 5-3. 포트 충돌

```bash
# 포트 사용 중인 프로세스 찾기
netstat -ano | grep :3005 | grep LISTENING

# PowerShell로 종료
powershell -Command "Stop-Process -Id <PID> -Force"
```

### 5-4. Playwright 디버깅 도구

| 도구 | 용도 | 실행 |
|------|------|------|
| **Inspector** | step-by-step 실행, 로케이터 확인 | `npx playwright test --debug` |
| **Trace Viewer** | 실행 기록 시각화 (네트워크, DOM 스냅샷) | `--trace on` → `npx playwright show-trace` |
| **UI Mode** | 브라우저에서 테스트 선택/실행/확인 | `npx playwright test --ui` |
| **스크린샷** | 실패 시 자동 저장 | `results/artifacts/` 폴더 |

---

## 6. 향후 계획

### 6-1. CI/CD 통합

```yaml
# GitHub Actions 예시
- name: E2E Tests
  run: |
    pnpm build
    pnpm start -p 3005 &  # production 빌드 (ChunkLoadError 방지)
    sleep 10
    cd e2e && npx playwright test --config=playwright-e2e.config.ts
```

CI 규모 확장 시 `--shard` 옵션으로 병렬 분할:
```yaml
strategy:
  matrix:
    shard: [1/3, 2/3, 3/3]
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}
```

### 6-2. 44개 메서드 확장 로드맵

1. **패턴별 대표 1개씩** 먼저 (7개 템플릿 완성)
2. **같은 패턴 내 변형** 추가 (예: t-test 완성 → welch-t, mann-whitney 추가)
3. **결과 검증 강화** (현재: statistic/pValue 존재 확인 → 향후: 수치 범위 검증)
4. **Page Object Model 도입**: 헬퍼 함수를 클래스로 분리 (`SmartFlowPage`, `VariableSelectionPage` 등)

### 6-3. 도구 활용 시나리오

```
[새 통계 메서드 추가]
  1. Playwright MCP/Agent Browser로 UI 탐색 → 변수 선택 패턴 파악
  2. 해당 패턴 템플릿 기반으로 .spec.ts 작성
  3. npx playwright test로 반복 검증

[UI 리팩토링]
  1. npx playwright test → 깨진 테스트 확인
  2. Playwright MCP로 변경된 UI 구조 확인
  3. 셀렉터/텍스트 수정
  4. 다시 npx playwright test → 전체 통과 확인

[버그 리포트 재현]
  1. Agent Browser로 사용자 시나리오 재현 (토큰 효율)
     - --session으로 독립 세션 사용
     - --profile로 인증 상태 보존 가능
  2. 재현 성공 → .spec.ts로 회귀 테스트 추가

[장시간 탐색적 테스트]
  1. Agent Browser 사용 (토큰 효율적 장시간 세션)
  2. 다중 세션 필요 시 --session=s1, --session=s2 병렬 실행
  3. 발견한 이슈 → .spec.ts로 자동화
```
