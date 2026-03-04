# 플랫폼 전략 계획서

**최종 업데이트**: 2026-03-03
**상태**: 운영 중 (지속 업데이트)

---

## 1. 제품 전략 개요

### 두 개의 별개 제품

```
[제품 A] 내부망 연구 도구            [제품 B] 외부 연구 플랫폼
───────────────────────────          ──────────────────────────────────
통계 분석 + 논문 그래프              통계 + 그래프 + Bio-Tools + 학명검증
정적 HTML (서버 없음)                웹 서비스 (서버 + DB)
AI 선택적 (Ollama 4B)               AI 핵심 (Grok 4.1 fast)
인증 없음                            회원가입 / 구독
내부 배포 (nginx/IIS 등)             Cloudflare Workers
단일 기관 전용                       공개 서비스 + 수익화
UI: 통계↔그래프 통합 워크플로우      UI: 멀티툴 플랫폼 (GraphPad 대체)
```

### 현재 앱(biohub.ecomarin.workers.dev)의 위치

현재 배포된 앱 = **제품 B의 통계 모듈** (Auth/DB 미포함 개발 중 상태)
- Grok 연결 완료 후 → 제품 B 기반으로 계속 발전
- 제품 A(내부망)는 현재 앱에서 `build:internal`로 파생

### 공유 코드베이스 전략

단일 저장소(`d:\Projects\BioHub`)에서 두 제품 빌드:

```bash
pnpm build:internal   # → 내부망 정적 HTML
pnpm build:web        # → Cloudflare 배포
```

---

## 2. 핵심 개발 전략: "Grok 먼저, 내부망 이식"

> **기존 계획의 문제**: 내부망(Ollama 4B)으로 먼저 시작하면
> 나쁜 AI 품질에 맞춰 UX가 설계되어 왜곡됨.

### 올바른 순서

```
Step 1: Grok 4.1 fast 연결 (지금 바로 가능)
         ↓ API key만 있으면 됨
         ↓ AI 기능 완성 + UX 검증 + 프롬프트 완성

Step 2: 검증된 UX → 내부망 이식
         ↓ Ollama 4B용 경량 프롬프트 버전 파생
         ↓ AI 없음 모드 추가 (graceful degradation)
         ↓ 정적 HTML 빌드

Step 3: 내부망 배포 + 실사용 피드백

Step 4: 외부 플랫폼 확장
         ↓ Grok 경험 그대로 활용
         ↓ 인증 / DB / 수익화 추가
```

### 이 전략의 장점

- 좋은 AI로 UX 완성 → 내부망은 "경량 버전"
- Grok 프롬프트를 이미 검증했으므로 이식이 빠름
- 외부 플랫폼은 Grok UX를 그대로 사용 (재작업 없음)

---

## 3. 현재 컴포넌트 현황

### 3-A. BioHub 통계 앱 (stats/)

| 항목 | 현황 |
|------|------|
| 통계 메서드 | 43개 Smart Flow 통합 ✅ |
| AI 추천 | OpenRouter (3단 폴백) ✅ |
| AI 해석 | 스트리밍 결과 해석 ✅ |
| Grok 4.1 fast 연동 | 미연결 (최우선 작업) |
| Ollama 연동 | 코드 존재, 비활성화 상태 |
| TypeScript 에러 | 0개 ✅ |
| 테스트 커버리지 | 88% (38/43) |
| 통계 신뢰성 | 98% (SciPy/statsmodels) |
| 결과 내보내기 | DOCX/Excel/CSV/클립보드 ✅ |
| Bio-Tools | 계획 수립, 미구현 |
| 배포 | Cloudflare (biohub.ecomarin.workers.dev) ✅ |

**위치**: `d:\Projects\BioHub\stats\`

---

### 3-B. 학명 검증기 (Scientific Name Validator)

| 항목 | 현황 |
|------|------|
| 버전 | v2.3.0 |
| 배포 | Vercel 프로덕션 운영 중 ✅ |
| 기능 | WoRMS / LPSN / CoL 3개 DB 검증 ✅ |
| 국명 검색 | NIBR 61,230종 ✅ |
| 배치 처리 | Excel/CSV 최대 1,000개 ✅ |
| 데스크탑 | Tauri (Windows .exe) ✅ |
| DB | Supabase (LPSN, NIBR, WoRMS 캐시) ✅ |
| BioHub 통합 | 미통합 (Phase 5 예정) |

**위치**: `d:\Projects\scientific-name-validator\`
**기술**: Next.js 15 + TypeScript + Supabase + Tauri

---

### 3-C. Graph Studio (논문 그래프 시각화)

| 항목 | 현황 |
|------|------|
| 기술 | ECharts |
| 로컬 연결 | 완료 (집 PC) |
| Git 커밋 | 미완료 — 커밋 후 경로 업데이트 필요 |
| BioHub 통합 | 미통합 (Phase 5 예정) |
| 논문 스타일 | APA / Nature / Science 등 |

**위치**: 미확인 (집 PC에서 커밋 후 확인)

---

### 3-D. Bio-Tools

| 항목 | 현황 |
|------|------|
| 계획 | 12개 생물학 분석, 5페이지 |
| 구현 | 미시작 (Phase 4 예정) |
| 상세 계획 | `stats/study/PLAN-BIO-STATISTICS-AUDIT.md` |

---

## 4. 개발 로드맵

### Phase 1: UI/UX 설계 (2개 별도) ← **현재 집중**

**목표**: 코드 작성 전 두 제품의 설계를 확정한다

#### 제품 A — 내부망 (통계 + 그래프 통합 워크플로우)

```
핵심 UX: 분석 → 즉시 시각화 연결
경쟁 포지션: SPSS/JASP의 불편함을 없앤 전문가 도구
사용자: 연구자/분석가 (설치 없음, 내부망)
```

| 설계 항목 | 내용 | 상태 |
|-----------|------|------|
| 레이아웃 | 3컬럼 워크벤치 (데이터·분석·AI) | 🔜 |
| 통계↔그래프 연결 | 결과 → 그래프 1클릭 전달 흐름 | 🔜 |
| AI 없음 모드 UI | Ollama 미연결 시 graceful 처리 | 🔜 |
| 와이어프레임 | 주요 화면 스케치 | 🔜 |

#### 제품 B — 외부 플랫폼 (멀티툴 연구 플랫폼)

```
핵심 UX: GraphPad Prism + SPSS + AI를 하나로
경쟁 포지션: GraphPad Prism 대체 (웹 기반, AI 포함, 저렴)
사용자: 연구자 (논문 작성, 데이터 분석)
```

| 설계 항목 | 내용 | 상태 |
|-----------|------|------|
| 플랫폼 Shell | 사이드바 + 툴 전환 + AI 패널 | 🔜 |
| 랜딩 페이지 | 경쟁 제품 대비 차별화 소구 | 🔜 |
| 툴별 UX | 통계 / 그래프 / Bio-Tools / 학명 각각 | 🔜 |
| 와이어프레임 | 주요 화면 스케치 | 🔜 |

**완료 기준**: 두 제품의 주요 화면 흐름이 확정됨

---

### Phase 2: Grok 4.1 fast 연동 + AI 기능 검증

**목표**: 확정된 UX 위에서 최고 품질 AI로 기능 완성

| 작업 | 설명 | 상태 |
|------|------|------|
| AI 프로바이더 추상화 | OpenRouter → xAI 전환 가능한 구조 | 🔜 |
| Grok 4.1 fast 연결 | OpenRouter에서 Grok 모델로 전환 | 🔜 |
| AI 추천 품질 검증 | 43개 메서드 추천 정확도 확인 | 🔜 |
| AI 해석 품질 검증 | 결과 해석 스트리밍 품질 확인 | 🔜 |
| 프롬프트 최적화 | 추천/해석/Q&A 프롬프트 완성 | 🔜 |

**완료 기준**: 43개 메서드 AI 추천·해석·Q&A 모두 정상 작동 확인

---

### Phase 3: 내부망 이식 + 배포

**목표**: Grok에서 검증한 UX → Ollama 4B 경량 버전 + 정적 HTML

| 작업 | 설명 | 상태 |
|------|------|------|
| AI 없음 모드 | Ollama 미연결 시 graceful degradation | 🔜 |
| Ollama 4B 연동 | 경량 프롬프트 (500토큰 이내) + 타임아웃 30초 | 🔜 |
| AI 연결 상태 UI | 헤더에 AI 상태 표시 (연결됨/미연결) | 🔜 |
| Graph Studio 통합 | `/graph-studio` 라우트 (내부망용) | 🔜 |
| 빌드 분리 | `.env.internal` + `build:internal` 스크립트 | 🔜 |
| 내부망 배포 테스트 | 정적 HTML 실제 내부 서버 검증 | 🔜 |

**완료 기준**: 내부 서버에서 Ollama 없이도 통계+그래프 100% 작동

---

### Phase 4: Bio-Tools 구현

**목표**: 12개 생물학 분석 도구 (`/bio-tools/`) — 외부 플랫폼 차별화 핵심

| 작업 | 설명 | 상태 |
|------|------|------|
| Bio-Tools UI/UX | Phase 1 설계 기반 구현 | 🔜 |
| Worker 5-6 구현 | Python 분석 로직 (NumPy/SciPy) | 🔜 |
| `/bio-tools/` 라우트 | 5개 페이지 구현 | 🔜 |
| 테스트 | Golden Values 테스트 | 🔜 |

상세 계획: `stats/study/PLAN-BIO-STATISTICS-AUDIT.md`

---

### Phase 5: 외부 플랫폼 기반 + 툴 통합

**목표**: 웹서비스 인프라 + 모든 도구를 하나의 플랫폼으로

| 작업 | 설명 | 상태 |
|------|------|------|
| 인증 시스템 | NextAuth.js 또는 Supabase Auth | 🔜 |
| 서버 DB | Turso 또는 Supabase (결정 필요) | 🔜 |
| 랜딩 페이지 | GraphPad 대비 차별화 소구 포함 | 🔜 |
| Shell 레이아웃 | 공통 사이드바 + AI 패널 | 🔜 |
| 학명 검증기 통합 | `/species` 라우트 (방식 미결정) | 🔜 |
| Graph Studio 통합 | `/graph-studio` 라우트 (외부망) | 🔜 |
| 도구 간 연결 | 통계 결과 → 그래프 자동 전달 | 🔜 |
| 구독 관리 | Stripe 연동 | 🔜 |

---

### Phase 6: 수익화

**목표**: 유료 기능 + 광고 + 기관 계약 (사용자 확보 후)

| 작업 | 설명 | 상태 |
|------|------|------|
| 사용량 제한 로직 | 무료 티어 한도 | 🔜 |
| 프리미엄 기능 게이트 | 구독 확인 미들웨어 | 🔜 |
| 광고 컴포넌트 | 무료 사용자 비필수 영역 | 🔜 |
| 기관 라이선스 | 내부망 전용 엔터프라이즈 요금제 | 🔜 |

---

## 5. 수익화 구조 (예정 — 사용자 확보 후 결정)

```
무료 (사용자 확보 우선)
  - 통계 기본 20개 메서드
  - 학명 검증 하루 30건
  - 그래프 월 10개 (PNG)
  - AI 해석 하루 5회

Pro (월 요금 미정)
  - 모든 통계 메서드 (43개+)
  - 학명 검증 무제한
  - 그래프 무제한 (SVG/EPS/PDF)
  - AI 해석 무제한
  - 히스토리 무제한

기관/연구실 (연간 계약)
  - 팀 계정
  - 내부망 전용 라이선스 포함
  - 우선 기술 지원
```

---

## 6. 기술 아키텍처 결정사항

### AI 프로바이더 구조

```
lib/ai/
├── providers/
│   ├── grok.ts         ← Grok 4.1 fast (주력)
│   ├── ollama.ts       ← 4B 경량 (내부망)
│   ├── openrouter.ts   ← 현재 (유지 or 제거 미결정)
│   └── none.ts         ← AI 없음 폴백
└── index.ts            ← 환경변수로 자동 선택
```

### AI 전략 요약

| 상황 | 프로바이더 | 역할 범위 |
|------|-----------|----------|
| 개발/테스트 | Grok 4.1 fast (OpenRouter → 추후 xAI 직접) | 추천 + 해석 + Q&A 전체 |
| 내부망 (AI 있음) | Ollama 4B | 결과 요약 설명만 |
| 내부망 (AI 없음) | none.ts | 통계 계산만 (완전 작동) |
| 외부 플랫폼 | Grok 4.1 fast | 추천 + 해석 + Q&A 전체 |

### Ollama 4B 제약사항 대응

- 컨텍스트 4K~8K → 원시 데이터 전송 금지, 요약 통계값만 전달
- 응답 30초~2분 → 로딩 UI + 타임아웃 30초 처리
- 실패율 높음 → 폴백 시 "AI 해석 없음" graceful 처리
- 프롬프트 최대 500토큰 제한 (Grok 프롬프트 축약본 사용)

### 배포

| 제품 | 방식 | 서버 |
|------|------|------|
| 내부망 | `pnpm build:internal` → 정적 HTML | nginx/IIS/파일 서버 |
| 외부 플랫폼 | `pnpm build:web` → Cloudflare Workers | Cloudflare CDN |

### 코드베이스 관리

| 결정 | 내용 | 이유 |
|------|------|------|
| 단일 저장소 유지 | BioHub 하나 | 지금 규모에 충분 |
| 환경변수 분기 | `.env.internal` / `.env.web` | 빌드 시 결정 |
| Monorepo 전환 | Phase 5 이후 필요 시 검토 | 지금은 불필요 |

---

## 7. 연관 프로젝트 현황

| 프로젝트 | 경로 | 배포 | 상태 |
|----------|------|------|------|
| BioHub (통계) | `d:\Projects\BioHub\stats\` | Cloudflare | 운영 중 |
| 학명 검증기 | `d:\Projects\scientific-name-validator\` | Vercel | 운영 중 |
| Graph Studio | **확인 필요** | 미정 | 로컬 완성 |
| Bio-Tools | BioHub 내 예정 | - | 미시작 |

---

## 8. 미결정 사항 (결정 필요)

| 항목 | 옵션 | 비고 |
|------|------|------|
| Grok API 경로 | ~~xAI 직접 vs OpenRouter 경유~~ → **OpenRouter 먼저, 추후 xAI 직접 전환** | provider 추상화로 전환 비용 최소 |
| OpenRouter 유지 여부 | Grok 전환 후 제거 vs 폴백으로 유지 | |
| 내부망 배포 환경 | nginx / IIS / 다른 방식 | 확인 필요 |
| Graph Studio 경로 | - | 위치 확인 필요 |
| 학명 통합 방식 | iframe embed vs API 호출 vs 코드 통합 | Supabase 공유 여부 |
| 외부 플랫폼 DB | Turso (현재 사용) vs Supabase (학명에서 사용) | 통일 여부 |

---

## 9. 하지 않을 것

- 프로젝트 복사 (내부망 전용 별도 폴더 금지)
- Monorepo 전환 (Phase 5 이후 검토)
- 유료 기능 구현 (사용자 확보 전)
- 광고 시스템 (서비스 안정화 후)
- 학명 검증기 전면 재작성 (통합만)
- Ollama로 UX 설계 시작 (Grok 먼저, Ollama는 이식)

---

## 10. 다음 액션 (우선순위 순)

1. **UI/UX 설계 — 제품 A (내부망)** — 통계+그래프 통합 워크플로우, 3컬럼 레이아웃
2. **UI/UX 설계 — 제품 B (외부)** — 플랫폼 Shell, 경쟁 제품 대비 차별화 포인트
3. **AI 프로바이더 추상화** — `lib/ai/` 구조 정리 (OpenRouter → xAI 전환 가능)
4. **Grok 4.1 fast 연결** — OpenRouter에서 Grok 모델로 전환
5. **AI 기능 전체 검증** — 추천·해석·Q&A 품질 확인
6. **내부망 빌드 분리** — `.env.internal` + `build:internal`
7. **Graph Studio 커밋** — 집 PC에서 커밋 후 통합
8. **Ollama 4B 이식** — Grok 프롬프트 경량화
9. **내부망 배포 테스트**