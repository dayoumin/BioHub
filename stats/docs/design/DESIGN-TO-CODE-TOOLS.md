# 디자인-to-코드 AI 도구 가이드 (2026년 3월 기준)

## 개요

AI 코딩 에이전트(Claude Code 등)와 연동하여 디자인 → React 컴포넌트 자동 변환이 가능한 도구들 정리.

---

## 1. Google Stitch + stitch-mcp

### 개요

- **Stitch**: Google Labs 실험 프로젝트 (Galileo AI 인수 후 리브랜딩)
- **stitch-mcp**: davideast가 만든 오픈소스 CLI — Stitch API를 로컬 환경 및 AI 에이전트와 연결
- Gemini 2.5 Flash(기본) / Gemini 2.5 Pro(실험) 기반 UI 생성
- **완전 무료**: 표준 월 350회, 실험 모드 월 50회

### 핵심 기능 (양방향)

| 방향 | 툴 | 설명 |
|------|----|------|
| 읽기 | `list_projects` | 프로젝트 목록 조회 |
| 읽기 | `list_screens` | 스크린 목록 조회 |
| 읽기 | `get_screen_code` | HTML 소스 다운로드 |
| 읽기 | `get_screen_image` | 스크린샷 (base64) |
| **쓰기** | `generate_screen_from_text` | 텍스트 프롬프트로 새 디자인 생성 |
| **쓰기** | `edit_screens` | 기존 디자인 수정 |
| **쓰기** | `generate_variants` | 디자인 변형 생성 |
| 복합 | `build_site` | 여러 스크린을 라우트에 매핑해 HTML 반환 |

> `build_site`는 HTML 라우팅 맵을 반환하는 virtual 툴. Astro 사이트 파일 생성은 CLI `site` 명령 별도.

### Claude Code 설정

```bash
# MCP 등록 (PC당 1회)
npx @_davideast/stitch-mcp init -c claude-code -t stdio
claude mcp add stitch -- npx @_davideast/stitch-mcp proxy
```

설정 순서:
1. MCP client → `claude-code`
2. Google Cloud CLI → 번들 자동 설치
3. Authenticate → 브라우저 Google 로그인
4. Connection → `stdio`
5. **Project → 목록에서 직접 선택** (검색 기능 버그 있음)
6. IAM role → `Yes`

진단: `npx @_davideast/stitch-mcp doctor`
인증 초기화: `npx @_davideast/stitch-mcp logout` → `init` 재실행

### Claude Code 워크플로우

**A. Claude가 Stitch에 디자인 생성 후 코드 변환 (쓰기 활용)**
```
Claude에게:
"Stitch에 데이터 업로드 패널 만들어줘.
드래그앤드롭 영역 + CSV/Excel 배지 포함.
그리고 바로 React 컴포넌트로 변환해줘."
        ↓
Claude → generate_screen_from_text 호출
        ↓
Stitch가 Gemini로 디자인 생성
        ↓
Claude → get_screen_code로 HTML 취득
        ↓
React 컴포넌트 변환
```

**B. 기존 디자인 가져와서 변환 (읽기)**
```
Claude에게:
"Stitch의 ChatInput 스크린을 가져와서
shadcn/ui 기반 Next.js 컴포넌트로 변환해줘."
        ↓
Claude → get_screen_code → HTML 취득
        ↓
컴포넌트 변환
```

### `/react:components` 스킬 역할

Claude Code 내장 스킬. Stitch MCP와 함께 사용 시 자동으로:
1. `list_tools`로 Stitch MCP prefix 탐색
2. `get_screen`으로 디자인 JSON + 스크린샷 다운로드 → `.stitch/designs/` 저장
3. 스크린샷으로 레이아웃 시각적 확인
4. 컴포넌트 파일 생성:
   - `src/components/` — 메인 컴포넌트
   - `src/hooks/` — 이벤트/로직 분리
   - `src/data/mockData.ts` — 텍스트/URL 데이터
5. Tailwind 테마 매핑 (`resources/style-guide.json`)
6. AST 기반 유효성 검사

**BioHub 적용 시 주의**: 스킬이 Vite 기준으로 설계되어 있어 경로/명령어 조정 필요:

| 스킬 기본값 | BioHub 적용값 |
|------------|--------------|
| `src/components/` | `stats/components/` |
| `src/hooks/` | `stats/hooks/` |
| `npm run validate` | `pnpm run validate` |
| `App.tsx` | Next.js App Router (해당 없음) |

### 장단점

**장점**: 완전 무료, 빠른 프로토타이핑, Figma 내보내기 지원, stitch-mcp 매우 활발히 업데이트 중 (v0.5.0)
**단점**: Google Labs 실험 프로젝트 (언제든 종료 가능), 출력 다양성 부족, 월 사용 제한, stitch-mcp는 비공식

---

## 2. Pencil.dev

### 개요

- AI 네이티브 벡터 디자인 캔버스. "Design on canvas. Land in code." 슬로건
- **IDE 내장형**: VS Code / Cursor Extension으로 설치 — 별도 브라우저 앱 없음
- `.pen` 파일 사용 (JSON 기반, Git 친화적)
- **MCP 자동 실행**: 확장 설치 시 로컬 MCP 서버 자동 시작 — 별도 등록 명령 불필요
- Claude Code CLI를 AI 엔진으로 사용 (Anthropic 계정 필요)
- a16z Speedrun 포트폴리오 기업
- **현재 Early Access 무료**

### 핵심 차별점

- **캔버스 = 에이전트 워크스페이스**: Claude Code가 MCP로 `.pen` 파일을 직접 읽고 수정
- **양방향 동기화**: 코드 수정 → 캔버스 반영 / 캔버스 수정 → 코드 반영
- **shadcn/ui 공식 UI 키트 포함** — BioHub 스택과 궁합이 좋음
- **에이전트 스웜 모드**: 최대 6개 AI 에이전트가 동시에 하나의 캔버스 작업
- Figma 대체 지향 — 핸드오프(handoff) 불필요

### Claude Code 설정

```bash
# Step 1: Claude Code CLI 설치 (이미 되어 있으면 생략)
# Claude Code가 설치된 상태라면 추가 설정 불필요

# Step 2: IDE에서 Pencil 확장 설치
# VS Code / Cursor → Extensions → "Pencil" 검색 → Install

# Step 3: 첫 실행 시 이메일 활성화
# Pencil 패널에서 이메일 입력 → 활성화 코드 이메일로 수신 → 입력

# Step 4: MCP 연결 확인
# Claude Code: /mcp 명령으로 Pencil 목록에 있는지 확인
```

> **주의**: `ANTHROPIC_API_KEY` 환경변수가 설정되어 있으면 Claude Code 로그인과 충돌 가능 — 환경변수 없이 `claude` 로그인 방식 권장

### 디자인 생성 방법 (3가지)

| 방법 | 설명 |
|------|------|
| 직접 그리기 | Figma와 유사한 벡터 툴로 캔버스에서 직접 제작 |
| AI 생성 | `Cmd/Ctrl + K` → 텍스트로 설명하면 Claude가 디자인 생성 |
| UI 키트 활용 | shadcn/ui, Halo, Lunaris, Nitro 등 사전 제작 컴포넌트 가져오기 |
| CSS/Figma 임포트 | 기존 `globals.css`에서 변수 추출 or Figma 변수 테이블 붙여넣기 |

### Claude Code 워크플로우

**A. AI로 디자인 생성 → 코드 변환**
```
[캔버스에서]
Cmd/Ctrl + K → "데이터 업로드 패널 만들어줘.
드래그앤드롭 영역 + CSV/Excel 배지 포함."
        ↓
Claude가 캔버스에 디자인 생성
        ↓
캔버스에서 시각적으로 검토/수정
        ↓
[Claude Code에서]
"이 컴포넌트를 Next.js + Tailwind 코드로 생성해줘."
        ↓
.pen 파일 읽어서 코드 생성
        ↓
프로젝트에 파일 저장
```

**B. 직접 그리고 코드 변환**
```
캔버스에서 직접 레이아웃 드로잉
        ↓
요소 선택 → Cmd/Ctrl + Option/Alt + K → 컴포넌트화
        ↓
Claude Code: "Generate React code for this component"
        ↓
코드 생성 → 프로젝트 파일로 저장
```

**C. 기존 코드 → 디자인 동기화 (역방향)**
```
Claude Code: "Update all React components
to match the Pencil designs"
        ↓
코드 수정 → 캔버스 자동 반영
```

### 실제 프롬프트 예시 (Pencil 캔버스에서)

```
"Create a login form with email and password"
"Add a navigation bar to this page"
"Design a card component for my design system"
"Generate React code for this component"
"Create Tailwind config from these variables"
```

### 사용자 후기 (2026년 1~2월)

**장점:**
- Figma 경험자라면 학습곡선 거의 없음
- 코드와 디자인이 같은 파일(.pen) — 핸드오프 과정 없음
- shadcn/ui 공식 포함으로 현대적 스택에 바로 적용 가능
- Claude Code와 가장 깊이 통합된 도구 (MCP 자동 연결)

**단점:**
- Claude Code 없으면 AI 기능 동작 안 함 (Anthropic 계정 필수)
- Early Access 단계 — 기능 완성도 미흡, 버그 가능성
- 유료 전환 시점/가격 미정
- 실제 코드 생성 품질은 직접 검증 필요 (공식 예시 부족)

---

## 3. 주요 대안 도구

| 도구 | 특징 | MCP/API | 가격 |
|------|------|---------|------|
| **Figma MCP** (공식) | 기존 Figma 자산 활용, 양방향 연동 | 공식 MCP | Dev Mode 유료 |
| **Subframe** | React+Tailwind 실제 컴포넌트 편집, 디자인시스템 동기화 | 공식 MCP 서버 | 유료 |
| **Builder.io Visual Copilot** | Figma→React/Vue/Angular 직접 변환 | Figma 플러그인 | 유료 |
| **Locofy.ai** | Figma/Penpot→Next.js, React Native | Figma 플러그인 | $399/년부터 |

### Figma MCP (공식) 주목

- Figma 공식 MCP 서버 (2025년 출시)
- Claude Code, Cursor, Windsurf, VS Code 연동
- 양방향: Figma → 코드, 코드 → Figma
- 2026년 3월 현재 커뮤니티 가장 활발, 설정 가이드 다수
- 기존 Figma 자산이 있는 팀에 최적

---

## 4. 도구 비교 요약

| 항목 | Google Stitch + stitch-mcp | Pencil.dev | Figma MCP |
|------|---------------------------|------------|-----------|
| 실행 환경 | 웹 브라우저 + CLI | IDE Extension | 웹 Figma + CLI |
| 디자인 생성 | 텍스트/이미지 → Gemini AI 생성 | 직접 그리기 or Claude AI 생성 | 기존 Figma 디자인 활용 |
| React/Next.js 품질 | Tailwind 기반, 추가 가공 필요 | Claude Code가 직접 생성 | 안정적, 커뮤니티 검증 |
| AI 에이전트 연동 | stitch-mcp (오픈소스) | 네이티브 MCP 자동 실행 | 공식 MCP |
| shadcn/ui 지원 | 간접 (Tailwind 기반) | **공식 UI 키트 포함** | 플러그인으로 가능 |
| 비용 | 완전 무료 | 무료 (Early Access) | Dev Mode 유료 |
| 성숙도 | 실험적, 활발히 업데이트 | 매우 초기 단계 | 가장 안정적 |
| BioHub 궁합 | 보통 (경로 조정 필요) | **좋음** (shadcn+Next.js) | 좋음 (Figma 있으면) |

---

## 5. BioHub 권장 사용 시나리오

### 신규 컴포넌트 프로토타이핑 (Stitch 또는 Pencil.dev)

**Stitch 방식:**
```
1. Claude에게 Stitch에 컴포넌트 디자인 생성 요청
2. /react:components 스킬로 변환
3. stats/components/ 경로로 수동 이동
4. store 연결 + 비즈니스 로직 추가
```

**Pencil.dev 방식:**
```
1. VS Code/Cursor에서 Pencil 확장 실행
2. 캔버스에서 Cmd+K → 컴포넌트 설명
3. shadcn/ui 키트 기반으로 디자인 생성
4. Claude Code에게 "stats/components/에 저장해줘"
5. store 연결 + 비즈니스 로직 추가
```

### 기존 Figma 디자인 → 코드 (Figma MCP)
```
1. Figma MCP 설정 (mcp.figma.com/mcp)
2. Claude에게 특정 프레임 참조하여 컴포넌트 변환 요청
3. shadcn/ui 기반으로 자동 매핑
```

---

## 6. 추천 (BioHub 기준)

| 상황 | 추천 도구 | 이유 |
|------|-----------|------|
| 지금 당장 써보기 | **Google Stitch** | 설정 간단, 무료, stitch-mcp 안정 |
| Claude Code 연동 극대화 | **Pencil.dev** | shadcn/ui 내장, MCP 자동, 양방향 동기화 |
| 팀/Figma 자산 이미 있음 | **Figma MCP** | 기존 자산 재활용, 가장 안정 |
| 비용 0원 고수 | **Stitch** | 완전 무료 유일 |

**현실적 권장**: Stitch로 먼저 시작 → Pencil.dev Early Access 병행 테스트 → 6개월 후 안정화되면 Pencil.dev 전환 고려

---

## 참고 링크

- [Stitch 공식](https://stitch.withgoogle.com/)
- [Stitch MCP 공식 가이드](https://stitch.withgoogle.com/docs/mcp/guide/)
- [stitch-mcp GitHub](https://github.com/davideast/stitch-mcp)
- [Pencil.dev 공식](https://pencil.dev/)
- [Pencil.dev 문서](https://docs.pencil.dev/)
- [Pencil.dev AI 연동 가이드](https://docs.pencil.dev/getting-started/ai-integration)
- [Figma MCP 공식 가이드](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Subframe MCP](https://docs.subframe.com/mcp-server)
