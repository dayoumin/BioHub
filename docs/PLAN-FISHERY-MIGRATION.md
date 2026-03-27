# FisheryON → BioHub 기능 이전 계획

**Status**: 계획 단계
**Last updated**: 2026-03-27
**Source**: `d:\Projects\fisheryON\apps\validator\`

---

## 1. 배경

BioHub를 주 프로젝트로 전환하면서, FisheryON의 고유 기능 중 BioHub에 없는 것을 흡수.

### BioHub에 없는 FisheryON 기능

| 기능 | FisheryON 상태 | BioHub 현황 |
|------|---------------|-------------|
| 연구동향 모니터링 | ✅ 구현 완료 | ❌ 없음 |
| 문헌 통합검색 (5소스) | ✅ 구현 완료 | ❌ 없음 (GenBank 검색만 있음) |
| 이메일 구독 (MailerSend) | ✅ 구현 완료 | ❌ 없음 |
| 법정관리종 수집기 (법제처 API) | ✅ 구현 완료 | ⬜ 스키마만 정의 예정 |

### 이전하지 않는 것

| 기능 | 이유 |
|------|------|
| 학명 검증 | species_checker에서 별도 통합 (`PLAN-SPECIES-INTEGRATION.md`) |
| OpenAlex 연동 | BioHub에서 독립적으로 추가 예정 |
| Turso/Drizzle ORM | BioHub는 D1 + raw SQL 패턴 사용 |

---

## 2. 아키텍처 호환성

### FisheryON 구조
```
Next.js 15 (App Router)
├── app/api/* → Next.js API Routes (서버사이드)
├── app/services/* → 비즈니스 로직
└── app/db/ → Turso + Drizzle ORM
```

### BioHub 구조
```
Next.js 15 (output: 'export' → 정적 HTML/JS)
├── stats/app/* → 정적 페이지만 (API Route 불가)
└── src/worker.ts → Cloudflare Worker가 모든 /api/* 처리
    ├── /api/ai/* → OpenRouter 프록시
    ├── /api/blast/* → NCBI BLAST 프록시
    ├── /api/ncbi/* → NCBI E-utilities 프록시
    ├── /api/projects/* → D1 CRUD
    └── /api/entities/* → D1 CRUD
```

### 핵심 변환 규칙

| FisheryON | BioHub |
|-----------|--------|
| `app/api/trends/route.ts` (Next.js API Route) | `src/handlers/trends.ts` (Worker 핸들러) |
| `app/services/*.ts` (import 가능) | Worker 내부 함수 또는 별도 핸들러 |
| Drizzle ORM `.select().from()` | `env.DB.prepare('SQL').all()` (D1 raw) |
| `process.env.API_KEY` | `env.API_KEY` (Worker Secrets) |
| `NextRequest/NextResponse` | `Request/Response` (Web API 표준) |

> **중요**: BioHub Worker에서 `fetch()`는 직접 사용 가능.
> OpenAlex, GBIF, OBIS 등 외부 API 호출에 제약 없음.

---

## 3. 이전 대상 파일 매핑

### Feature 1: 연구동향 모니터링

#### 백엔드 (Worker)

| FisheryON 소스 | BioHub 대상 | 변환 작업 |
|---------------|-------------|-----------|
| `services/trends/openalex-collector.ts` (173줄) | `src/handlers/trends.ts` | Drizzle→D1, NextResponse→Response |
| `services/trends/multi-source-collector.ts` (140줄) | `src/handlers/trends.ts` | searchLiterature 호출 → 직접 fetch |
| `services/trends/keyword-manager.ts` (4KB) | `src/handlers/keywords.ts` | Drizzle CRUD→D1 SQL |
| `api/trends/collect/route.ts` (100줄) | Worker 라우트 분기 | NextRequest→Request |
| `api/trends/route.ts` (1.2KB) | Worker 라우트 분기 | 동일 |
| `api/keywords/organization/route.ts` | Worker 라우트 분기 | 동일 |
| `api/subscriptions/route.ts` (189줄) | `src/handlers/subscriptions.ts` | Drizzle→D1 |
| `api/cron/daily-trends/route.ts` | wrangler.toml Cron Trigger | 별도 scheduled 핸들러 |

#### 프론트엔드 (정적 페이지)

| FisheryON 소스 | BioHub 대상 | 변환 작업 |
|---------------|-------------|-----------|
| `trends/page.tsx` (329줄) | `stats/app/trends/page.tsx` | import 경로만 수정 |
| `trends/following/` | `stats/app/trends/following/` | import 경로만 수정 |
| `trends/DESIGN.md` (644줄) | `docs/DESIGN-TRENDS.md` | 참고 문서로 보존 |
| `types/trends.ts` | `stats/lib/types/trends.ts` | 그대로 복사 |

#### DB 스키마 (D1 마이그레이션)

```sql
-- FisheryON schema.ts → BioHub D1 migration

CREATE TABLE IF NOT EXISTS trend_keywords (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  keyword TEXT NOT NULL,
  category TEXT DEFAULT 'personal',  -- 'personal' | 'organization'
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trend_keywords_user ON trend_keywords(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_keywords_unique ON trend_keywords(user_id, keyword);

CREATE TABLE IF NOT EXISTS trends (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'paper',
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  abstract TEXT,
  url TEXT NOT NULL,
  doi TEXT,
  authors TEXT NOT NULL DEFAULT '[]',
  journal TEXT,
  publisher TEXT,
  publication_date TEXT,
  publication_year INTEGER,
  citation_count INTEGER,
  matched_keywords TEXT NOT NULL DEFAULT '[]',
  metadata TEXT,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trends_source ON trends(source);
CREATE INDEX IF NOT EXISTS idx_trends_year ON trends(publication_year);
CREATE INDEX IF NOT EXISTS idx_trends_collected ON trends(collected_at);

CREATE TABLE IF NOT EXISTS user_trends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trend_id TEXT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_saved INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  saved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL UNIQUE,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  enabled INTEGER NOT NULL DEFAULT 1,
  custom_keywords TEXT,
  last_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Feature 2: 문헌 통합검색

#### 백엔드 (Worker)

| FisheryON 소스 | BioHub 대상 | 변환 작업 |
|---------------|-------------|-----------|
| `services/first-record/literature/collector.ts` (249줄) | `src/handlers/literature.ts` | 핵심 오케스트레이터 |
| `services/first-record/literature/clients/openalex.ts` (5.4KB) | 핸들러 내 함수 | fetch 로직 복사 |
| `services/first-record/literature/clients/gbif.ts` (7.6KB) | 핸들러 내 함수 | fetch 로직 복사 |
| `services/first-record/literature/clients/obis.ts` (8.3KB) | 핸들러 내 함수 | fetch 로직 복사 |
| `services/first-record/literature/clients/nanet.ts` (9.8KB) | 핸들러 내 함수 | Worker 프록시 (CORS) |
| `services/first-record/literature/clients/pubmed.ts` (10.6KB) | 핸들러 내 함수 | NCBI_API_KEY 활용 |
| `services/first-record/literature/keyword-filter.ts` (155줄) | 핸들러 내 유틸 | 그대로 복사 가능 |
| `services/first-record/literature/types.ts` (2.4KB) | `stats/lib/types/literature.ts` | 그대로 복사 |
| `api/first-record/literature/route.ts` | Worker 라우트 | 패턴 변환 |

#### 프론트엔드 (정적 페이지)

| FisheryON 소스 | BioHub 대상 | 변환 작업 |
|---------------|-------------|-----------|
| `literature/page.tsx` (542줄) | `stats/app/literature/page.tsx` | import 경로 수정 |
| `first-record/page.tsx` (1,222줄) | 향후 검토 | Ollama→Grok 전환 필요 |
| `config/first-record.ts` | `stats/lib/config/literature.ts` | Korea 키워드 28개 포함 |

---

## 4. Worker 파일 구조 개선

현재 `src/worker.ts`가 1,177줄로 비대. 핸들러 분리 권장:

```
src/
├── worker.ts                    # 라우터 + 공통 미들웨어만 (~100줄)
├── handlers/
│   ├── ai-proxy.ts              # 기존: OpenRouter 프록시
│   ├── blast.ts                 # 기존: NCBI BLAST
│   ├── ncbi.ts                  # 기존: NCBI E-utilities
│   ├── projects.ts              # 기존: 프로젝트 CRUD
│   ├── entities.ts              # 기존: 엔티티 연결
│   ├── trends.ts                # NEW: 연구동향 수집
│   ├── literature.ts            # NEW: 문헌 통합검색
│   ├── keywords.ts              # NEW: 키워드 CRUD
│   └── subscriptions.ts         # NEW: 이메일 구독
└── lib/
    ├── rate-limit.ts            # 공통 rate limiter
    ├── d1-utils.ts              # D1 헬퍼
    └── korea-keywords.ts        # Korea 필터 키워드 28개
```

### worker.ts 라우터 패턴

```typescript
// src/worker.ts (간결화 후)
import { handleTrendsApi } from './handlers/trends'
import { handleLiteratureApi } from './handlers/literature'
import { handleKeywordsApi } from './handlers/keywords'
// ... 기존 핸들러 import

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // 기존 라우트
    if (url.pathname.startsWith('/api/ai/')) return handleOpenRouterProxy(request, env, url)
    if (url.pathname.startsWith('/api/blast/')) return handleBlastProxy(request, env, url)
    if (url.pathname.startsWith('/api/ncbi/')) return handleNcbiProxy(request, env, url)
    if (url.pathname.startsWith('/api/projects')) return handleProjectsApi(request, env, url)
    if (url.pathname.startsWith('/api/entities')) return handleEntitiesApi(request, env, url)

    // NEW: FisheryON 이전 라우트
    if (url.pathname.startsWith('/api/trends')) return handleTrendsApi(request, env, url)
    if (url.pathname.startsWith('/api/literature')) return handleLiteratureApi(request, env, url)
    if (url.pathname.startsWith('/api/keywords')) return handleKeywordsApi(request, env, url)

    // Static Assets
    return env.ASSETS.fetch(request)
  },

  // NEW: Cron Trigger (연구동향 정기 수집)
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    // 매일 09:00 KST — 등록된 키워드로 동향 수집
    await collectDailyTrends(env)
  },
} satisfies ExportedHandler<Env>
```

---

## 5. 구현 단계

### Phase A: 문헌 통합검색 (1~2일) — 선행

문헌검색은 DB 불필요 (순수 API 호출 + 프록시), 가장 빠르게 이전 가능.

- [ ] `src/handlers/literature.ts` 생성
  - [ ] OpenAlex 클라이언트 (fetch 직접 호출, API 키 불필요)
  - [ ] GBIF 클라이언트 (species key lookup → occurrence)
  - [ ] OBIS 클라이언트 (AphiaID lookup → occurrence, Korean waters WKT)
  - [ ] NANET 프록시 (CORS 우회, `env.NANET_API_KEY` 필요)
  - [ ] PubMed 프록시 (NCBI API 키 보호, 기존 `env.NCBI_API_KEY` 재사용)
  - [ ] 통합 오케스트레이터 (병렬 검색 + 중복 제거)
  - [ ] 키워드 필터 (Korea 53개 포함, `src/lib/korea-keywords.ts` 재사용)
- [x] `stats/lib/types/literature.ts` 복사 (완료, validator 잔재 정리됨)
- [x] `src/lib/korea-filter-config.ts` 설정 이식 (완료, `LITERATURE_SEARCH_CONFIG`로 리네이밍)
- [x] `src/lib/korea-keywords.ts` 키워드 필터 이식 (완료)
- [ ] `stats/app/literature/page.tsx` 생성
- [ ] `worker.ts`에 `/api/literature` 라우트 추가
- [ ] 사이드바에 "문헌·동향" 메뉴 추가
- [ ] 로컬 테스트 (`wrangler dev`)

> **NANET HTTP 이슈 (2026-03-27 검증)**:
> - `https://losi-api.nanet.go.kr` — TLS 인증서 유효하나 API 라우팅 404 반환 (HTTPS 미지원)
> - `http://losi-api.nanet.go.kr` — 정상 동작 (HTTP만 가능)
> - Cloudflare Workers의 outbound `fetch()`는 HTTP도 지원하므로 **동작 가능성 높음**
> - `wrangler dev`로 실기 검증 후 확정. 실패 시 Phase A에서 NANET 제외 (4개 소스).

> **Progress UX (확정: Option C — 소스별 개별 fetch)**:
> - 프론트엔드에서 소스별 개별 `fetch('/api/literature/search?source=openalex')` 등 5개 병렬 호출
> - 각 소스가 독립적으로 완료/에러 표시 (실시간, 에러 격리, 개별 재시도 가능 (구조적 지원, UI 미구현))
> - Worker는 단일 소스 결과만 반환하는 단순 프록시 역할
> - 중복 제거: 모든 소스 완료 후 클라이언트 사이드에서 처리 (DOI → URL → title+year 3단계)

### Phase B: 연구동향 모니터링 (2~3일) — D1 필요

키워드+동향 저장이 필요하므로 D1 마이그레이션 선행.

- [ ] D1 마이그레이션 SQL 작성 (`migrations/0002_trends.sql`)
- [ ] `wrangler d1 migrations apply biohub-db` 실행
- [ ] `src/handlers/trends.ts` 생성
  - [ ] `POST /api/trends/collect` — 키워드별 수집 (문헌검색 인프라 재사용)
  - [ ] `GET /api/trends` — 수집된 동향 조회
  - [ ] `POST /api/trends/read` — 읽음 처리
  - [ ] `POST /api/trends/save` — 저장
- [ ] `src/handlers/keywords.ts` 생성
  - [ ] `GET /api/keywords` — 키워드 목록
  - [ ] `POST /api/keywords` — 추가
  - [ ] `DELETE /api/keywords/:id` — 삭제
- [ ] `stats/lib/types/trends.ts` 복사
- [ ] `stats/app/trends/page.tsx` 생성
- [ ] `stats/app/trends/following/page.tsx` 생성
- [ ] 사이드바에 "연구동향" 메뉴 추가
- [ ] 로컬 테스트

### Phase C: 이메일 구독 + Cron (1일) — 선택

Phase B 안정화 후 추가.

- [ ] D1에 `email_subscriptions` 테이블 추가
- [ ] `src/handlers/subscriptions.ts` 생성
- [ ] wrangler.toml에 Cron Trigger 추가:
  ```toml
  [triggers]
  crons = ["0 0 * * *"]  # 매일 UTC 00:00 (KST 09:00)
  ```
- [ ] Worker `scheduled()` 핸들러 구현
- [ ] MailerSend / Resend API 연동

### Phase D: 법정관리종 수집기 (후속)

species_checker 통합 시점에 함께 진행. `PLAN-SPECIES-INTEGRATION.md` 참조.

- [ ] `legalDataCollector.ts` → Worker 핸들러로 변환
- [ ] D1에 legal_status 스키마 추가
- [ ] 법제처 API 호출 (cheerio 대체 방법 필요 — Worker에서 cheerio 사용 불가)

---

## 6. Env 인터페이스 확장

```typescript
// src/worker.ts
interface Env {
  ASSETS: Fetcher
  DB: D1Database
  OPENROUTER_API_KEY: string
  NCBI_API_KEY?: string
  // NEW — Phase A
  NANET_API_KEY?: string            // 국회도서관 API (Phase A, HTTPS 확인 후)
  // NEW — Phase C
  MAILERSEND_API_KEY?: string       // 이메일 발송 (Phase C)
}
```

---

## 7. 사이드바 통합

`stats/components/layout/app-sidebar.tsx`에 추가할 항목:

```typescript
// 기존 navMain 배열에 추가
{
  title: '연구동향',
  url: '/trends',
  icon: TrendingUp,
  badge: 'NEW',
},
{
  title: '문헌검색',
  url: '/literature',
  icon: FileSearch,
  badge: 'NEW',
},
```

---

## 8. 주의사항

### Worker 환경 제약

| 제약 | 영향 | 해결 |
|------|------|------|
| Node.js API 미사용 | `crypto.randomUUID()` (Web API 지원) | ✅ 호환 |
| **NANET HTTP only** | HTTPS 404 반환 (TLS 있으나 라우팅 미지원) | Workers outbound fetch()는 HTTP 지원 — `wrangler dev` 실기 검증 |
| **Stateless (in-memory 불가)** | FisheryON의 `progressStore` 패턴 사용 불가 | ✅ 해결: 소스별 개별 fetch (Option C) |
| cheerio 사용 불가 | 법제처 HTML 파싱 불가 | RegExp 또는 별도 서비스로 분리 |
| 실행 시간 30초 | 5소스 병렬 검색은 충분 | ✅ 문제 없음 |
| 메모리 128MB | 대용량 결과 처리 시 주의 | 소스당 max 50건 제한 |

### FisheryON과의 호환성

- FisheryON은 향후 유지보수 모드로 전환
- 핵심 로직은 BioHub로 이전, FisheryON의 수산 특화 UI/프리셋은 참고만
- BioHub의 도메인은 수산 외 생명과학 전반을 커버하므로, 프리셋 키워드 범위 확장 필요

---

## 9. 참고 자료

- FisheryON 연구동향 설계 문서: `d:\Projects\fisheryON\apps\validator\app\trends\DESIGN.md` (644줄)
- FisheryON DB 스키마: `d:\Projects\fisheryON\apps\validator\app\db\schema.ts` (265줄)
- BioHub Worker: `d:\Projects\BioHub\src\worker.ts` (1,177줄)
- BioHub 프로젝트 시스템: `d:\Projects\BioHub\docs\PLAN-PROJECT-SYSTEM.md`
- 학명검증 통합: `d:\Projects\BioHub\docs\PLAN-SPECIES-INTEGRATION.md`
