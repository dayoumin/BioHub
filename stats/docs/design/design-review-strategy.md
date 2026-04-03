# 디자인 검증 및 변환 전략 (2026)

## 1. 작업 방식: 컴포넌트 단위 증분 검토

디자인 변경은 **한꺼번에 다 하고 검토하지 않는다.** 컴포넌트 단위로 작업 → 즉시 확인 → 다음 단계 진행.

### 이유
1. CSS 변경은 cascade로 다른 곳에 영향 → 조기 발견 필수
2. Hot Reload로 즉시 확인 가능 → 별도 빌드 불필요
3. 시각적 변경은 diff만으로 판단 어려움 → 브라우저 확인이 유일한 정답

### 작업 순서 (ChatCentricHub 기준)
1. Hero 섹션 → 브라우저 확인 (light + dark)
2. ChatInput → 확인
3. TrackSuggestions → 확인
4. QuickAccessBar → 확인
5. 전체 통합 확인

---

## 2. Stitch → 코드 변환 워크플로우

### 2.1 전체 파이프라인

```
Stitch 프롬프트 → 화면 생성 → DESIGN.md 추출 → React 변환 → 토큰 매핑 → AST 검증 → 통합
```

### 2.2 단계별 상세

#### Step 1: Stitch에서 디자인 생성
```
MCP 도구: generate_screen_from_text, generate_variants, edit_screens
```
- 한글 프롬프트로 화면 생성
- `generate_variants`로 light/dark, 반응형 변형 생성 (v0.4.0 신규)
- `edit_screens`로 기존 화면 수정 (v0.4.0 신규)

#### Step 2: DESIGN.md 생성 (디자인 진실의 원천)
```bash
npx add-skill google-labs-code/stitch-skills/design-md
```
- 모든 화면을 분석하여 색상, 타이포그래피, 컴포넌트 패턴, 레이아웃 규칙 추출
- 이후 화면 생성 시 일관성의 기준점 역할

#### Step 3: 디자인 컨텍스트 추출
```
MCP 도구: extract_design_context
```
- Tailwind 팔레트, 폰트, 컴포넌트 구조("Design DNA") 추출
- 기존 앱의 디자인 시스템과 비교 기준 제공

#### Step 4: React 컴포넌트 변환
```bash
npx add-skill google-labs-code/stitch-skills/react-components
```

4단계 파이프라인:

| 단계 | 동작 |
|------|------|
| **Retrieval** | Stitch HTML/에셋을 Google Cloud Storage에서 다운로드 |
| **Mapping** | `style-guide.json`과 대조하여 토큰 일관성 확보 |
| **Generation** | Atomic Design 패턴으로 컴포넌트 스캐폴딩 (TSX + Props 인터페이스 + hooks + mockData) |
| **Validation** | `@swc/core` AST 검사 — 하드코딩 hex 거부, 누락 인터페이스 감지 |

#### Step 5: BioHub 토큰 매핑 (핵심)

Stitch 출력은 자체 hex 색상 사용 → BioHub의 기존 OKLCH 토큰으로 매핑 필수:

```
Stitch hex (#207fdf) → BioHub CSS 변수 (--primary) → Tailwind 클래스 (bg-primary)
```

매핑 절차:
1. `extract_design_context`로 Stitch 팔레트 추출
2. BioHub `globals.css` CSS 변수와 매핑 테이블 작성
3. 생성된 TSX에서 arbitrary 값(`bg-[#XXXX]`)을 디자인 시스템 클래스로 교체
4. AST 검증으로 하드코딩 hex 잔존 확인

#### Step 6: 통합 및 검증
- `pnpm tsc --noEmit` — 타입 체크
- `pnpm test` — 기존 테스트 통과
- 브라우저 확인 (light + dark + 반응형)

### 2.3 추가 유틸리티 스킬

| 스킬 | 용도 |
|------|------|
| **enhance-prompt** | 막연한 UI 아이디어 → Stitch 최적화 프롬프트로 변환 |
| **stitch-loop** | 두 화면 비교 → 시각적 불일치 식별 + 조화 제안 |
| **remotion** | Stitch 프로젝트에서 워크스루 영상 생성 |

---

## 3. Stitch 최신 업데이트 (2026년 2~3월)

### 2월 업데이트
| 기능 | 상태 | 설명 |
|------|------|------|
| **Hatter Agent** | 테스트 중 | Flash/Pro/Ideate 외 신규 에이전트. 멀티스텝 디자인 (반복 개선, 화면 간 일관성) |
| **앱스토어 에셋 생성** | 테스트 중 | 프로토타입에서 스토어 스크린샷 + 아이콘 자동 생성 |
| **네이티브 MCP 내보내기** | 출시 | Export 패널에서 직접 MCP 설정 + API 키 생성 (기존 GCP 인증 대체 가능) |
| **edit_screens / generate_variants** | 출시 | MCP v0.4.0 — 기존 화면 수정 + 반응형 변형 생성 |
| **Agent Skills 시스템** | 출시 | design-md, react-components, enhance-prompt, remotion 스킬 |

### 3월 업데이트
| 기능 | 상태 | 설명 |
|------|------|------|
| **Voice Mode** | 테스트 중 | 음성으로 디자인 변경/비평 |
| **Design Studio** | 테스트 중 | 음성 기반 생성 전용 워크스페이스 |

### BioHub에 미치는 영향
- `@_davideast/stitch-mcp`를 **v0.4.0**으로 업데이트 권장 (`edit_screens`, `generate_variants`)
- Export 패널 네이티브 MCP → 기존 `stitch-mcp init` 인증 대체 가능 (더 간단)
- `design-md` 스킬로 디자인 일관성 문서 자동 생성

---

## 4. 코드 검증 방법 (우선순위순)

### Tier 1: 즉시 적용 (무료)

#### 1. Hot Reload 브라우저 확인
```bash
pnpm dev  # Turbopack: 96% 더 빠른 Fast Refresh
```
- 코드 저장 → 즉시 브라우저 반영
- **반드시 light + dark 모드 둘 다 확인**
- 반응형: 브라우저 창 크기 조절로 md/lg 브레이크포인트 확인

#### 2. Playwright Visual Snapshot
```typescript
// e2e/visual-regression.spec.ts
test('home hub visual', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('home-hub.png', {
    maxDiffPixelRatio: 0.01,
  })
})
```
- 기준 이미지 생성: `npx playwright test --update-snapshots`
- CI에서 자동 비교 (Docker 기반 렌더링 일관성 필요)
- **주의**: OS별 렌더링 차이 → Docker 또는 플랫폼별 baseline

#### 3. eslint-plugin-tailwindcss
```bash
pnpm add -D eslint-plugin-tailwindcss
```
- 잘못된 클래스명 감지
- 클래스 순서 정렬
- 중복 클래스 경고

### Tier 2: 낮은 노력 (무료)

#### 4. Storybook 컴포넌트 카탈로그
```bash
pnpm add -D @storybook/nextjs-vite
```
- 컴포넌트를 격리 환경에서 시각 확인
- props 변경으로 다양한 상태 테스트
- shadcn/ui + Tailwind 바로 호환

### Tier 3: 예산 시 (PR별 자동 시각 회귀)

| 도구 | 특징 | 비용 |
|------|------|------|
| **Chromatic** | Storybook 네이티브, 픽셀 비교 | 5,000 스냅샷/월 무료 |
| **Lost Pixel** | 오픈소스, Storybook + 페이지 지원 | 셀프호스트 무료 |
| **Percy** | AI 시각 리뷰 에이전트 (2025말~) | 5,000 스크린샷/월 무료 |

---

## 5. 디자인 토큰 일관성

BioHub는 이미 OKLCH 토큰 시스템 사용 (`globals.css`):
- `--primary`, `--background`, `--card` 등 CSS 변수
- Tailwind `bg-primary`, `text-muted-foreground` 등으로 참조
- **원칙**: 하드코딩 색상 금지, 반드시 CSS 변수/Tailwind 클래스 사용

Stitch 목업의 색상(`#207fdf` 등)은 참조용이며, 실제 구현은 기존 토큰 시스템 유지.

---

## 6. 체크리스트 (컴포넌트 작업 완료 시)

- [ ] Light 모드 브라우저 확인
- [ ] Dark 모드 브라우저 확인
- [ ] 반응형 (sm/md/lg) 확인
- [ ] 기존 테스트 통과 (`pnpm test`)
- [ ] 타입 체크 통과 (`pnpm tsc --noEmit`)
- [ ] 하드코딩 색상 없음 (CSS 변수/Tailwind만 사용)
- [ ] Stitch hex → BioHub 토큰 매핑 완료 (변환 시)
