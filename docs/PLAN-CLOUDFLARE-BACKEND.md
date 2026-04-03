# Cloudflare Workers Backend 계획

**최초 작성**: 2026-02-06
**마지막 검토**: 2026-03-26
**상태**: Phase A~B 부분 구현, 나머지 미착수

---

## 현재 구현 현황 (2026-03-26 기준)

### 이미 완료된 것

`src/worker.ts` 단일 파일에 모든 서버 로직이 구현되어 있다.

| 기능 | 상태 | 구현 위치 |
|------|------|----------|
| OpenRouter API 프록시 | **활성** | `/api/ai/*` → Worker Secret |
| Origin 검증 | **활성** | 같은 도메인만 허용 |
| Rate limit | **활성** | IP당 분당 30회 (메모리 기반) |
| AI 응답 D1 캐시 | **활성** | `env.DB` 캐시 테이블 |
| 연구과제 CRUD | **활성** | `/api/projects/*` → D1 |
| 엔티티 연결 | **활성** | `/api/entities/link` → D1 |
| BLAST 결과 저장 | **활성** | `/api/entities/blast` → D1 |
| 정적 파일 서빙 | **활성** | `env.ASSETS` → `stats/out/` |

### 아직 없는 것 (클라이언트에만 존재)

| 데이터 | 현재 저장 위치 | 문제 |
|--------|--------------|------|
| 통계 분석 히스토리 | IndexedDB (브라우저) | 기기 간 동기화 불가, 캐시 삭제 시 소실 |
| Bio-Tools 히스토리 | localStorage (브라우저) | 5MB 제한, 동기화 불가 |
| Graph Studio 프로젝트 | localStorage (브라우저) | 동기화 불가 |
| 사용자 설정 | localStorage (브라우저) | 동기화 불가 |
| 핀 고정 도구 | localStorage (브라우저) | 사소함 |

### 인증 현황

```
현재: X-User-Id 헤더를 클라이언트가 임의 전송 → 서버가 신뢰
문제: 누구든 다른 사람 ID를 넣으면 해당 프로젝트에 접근 가능
```

---

## 배포 아키텍처 (확정)

```
output: 'export' (정적 빌드) + Worker (API 서버) 하이브리드

브라우저 ──→ CDN (stats/out/ 정적 파일)     ← HTML/JS/CSS
       └──→ Worker (src/worker.ts)          ← API 요청만
              ├── env.DB (D1)               ← 관계형 데이터
              ├── env.ASSETS (정적 파일)     ← SPA 폴백
              └── Worker Secrets            ← API Key
```

**OpenNext 불필요** — 정적 export + Worker API로 충분.
SSR이 필요한 시점(동적 SEO 등)까지 현재 구조 유지.

### 비용 (현재 + 향후)

| 기능 | CPU/요청 | 일 1,000회 시 | 무료 한도 대비 |
|------|---------|-------------|-------------|
| AI 프록시 (현재) | ~0.5ms | 0.5초 | 0.05% |
| D1 CRUD (현재) | ~1ms | 1초 | 0.1% |
| 히스토리 동기화 (향후) | ~1ms | 1초 | 0.1% |
| **합계** | | ~2.5초/일 | **< 0.3%** |

**무료 플랜으로 충분.** Pyodide 계산은 브라우저에서 유지 (서버 이동 시 비용 폭발).

---

## 남은 구현 계획

### Phase 1: 인증 (우선순위 높음)

현재 `X-User-Id` 헤더 방식은 보안 없음. 최소한의 인증 필요.

**선택지:**

| 방식 | 복잡도 | 보안 | 비고 |
|------|--------|------|------|
| A. 기기 UUID 자동생성 | 낮음 | 낮음 | 현재와 비슷, 기기별 고유 ID만 보장 |
| B. 패스키/비밀번호 없는 인증 | 중간 | 중간 | 이메일 링크 또는 기기 패스키 |
| C. OAuth (Google/GitHub) | 중간 | 높음 | 외부 의존, 하지만 표준 |
| D. Cloudflare Access | 낮음 | 높음 | 설정만으로 완료, 하지만 팀용 |

**추천: A → C 순차 적용**
- 1단계: 기기 UUID 자동 생성 + localStorage 저장 (현재 대비 개선 없지만 구조 준비)
- 2단계: OAuth 추가 (로그인하면 기기 간 동기화 활성화)

### Phase 2: 히스토리 D1 동기화 (우선순위 높음)

브라우저 히스토리를 D1에 동기화. 오프라인 시 로컬 우선, 온라인 시 동기화.

**대상:**
- 통계 분석 히스토리 (현재 IndexedDB)
- Bio-Tools 히스토리 (현재 localStorage)

**API:**
```
GET    /api/history?type=analysis|bio-tool   → 히스토리 목록
POST   /api/history                          → 저장
DELETE /api/history/:id                      → 삭제
PATCH  /api/history/:id/pin                  → 핀 토글
```

**동기화 전략:**
```
저장 시: 브라우저 로컬 저장 (즉시) + D1 저장 (비동기)
로드 시: 인증됨 → D1에서 로드
         미인증 → 로컬에서 로드 (현재와 동일)
```

**의존성:** Phase 1 (인증) 완료 후 — 누구의 히스토리인지 식별 필요

### Phase 3: R2 데이터셋 보관 (우선순위 중간)

CSV를 R2에 저장하여 재업로드 없이 재사용.

```
POST   /api/datasets             → 파일 업로드
GET    /api/datasets             → 목록
GET    /api/datasets/:id         → 다운로드
DELETE /api/datasets/:id         → 삭제
```

**용량 제한:** 사용자당 1GB (R2 무료 10GB 내)

**의존성:** Phase 1 (인증) + Phase 2 (히스토리와 연결)

### Phase 4: 팀/공유 기능 (우선순위 낮음)

- 연구과제를 팀원과 공유
- 분석 결과 링크 공유 (읽기 전용)
- 팀 멤버 권한 관리

**의존성:** Phase 1-C (OAuth 인증) 완료 후

---

## 기술 결정 사항

### Worker 구조: 단일 파일 유지 vs 분리

현재 `src/worker.ts`가 ~960줄. 기능 추가 시:

- **1,500줄 이하**: 단일 파일 유지 (현재 패턴)
- **1,500줄 초과**: `src/handlers/` 분리 (패턴: [PLAN-FISHERY-MIGRATION.md §4](PLAN-FISHERY-MIGRATION.md)) + 필요 시 Hono 도입 고려

### D1 스키마 관리

현재: `ensureUser()`가 런타임에 테이블 존재 확인
향후: `wrangler d1 migrations` 사용 권장

```
src/schema/
├── 0001_initial.sql        ← users, projects, project_entity_refs
├── 0002_ai_cache.sql       ← ai_response_cache
├── 0003_history.sql        ← analysis_history, bio_tool_history (향후)
└── 0004_datasets.sql       ← datasets (향후)
```

### 클라이언트 코드 변경 최소화

현재 `localStorage` / `IndexedDB` 직접 호출 코드가 많음.
변경 시 어댑터 패턴 사용:

```typescript
// lib/services/storage-adapter.ts
interface StorageAdapter {
  saveHistory(entry: HistoryEntry): Promise<void>
  loadHistory(): Promise<HistoryEntry[]>
  deleteHistory(ids: string[]): Promise<void>
}

// 온라인 + 인증됨 → D1 API 호출
class CloudStorageAdapter implements StorageAdapter { ... }

// 오프라인 또는 미인증 → 로컬 저장 (현재 동작)
class LocalStorageAdapter implements StorageAdapter { ... }
```

기존 훅(`useBioToolAnalysis`, `history-store`)은 어댑터만 교체하면 됨.

---

## 내부망/폐쇄망 호환 (변경 없음)

기존 계획 유지:
- D1 → better-sqlite3
- R2 → 로컬 파일시스템 또는 MinIO
- Worker → Node.js/Bun + Hono
- Docker Compose로 패키징

상세: 이전 계획서 참조 (2026-02-06 버전)

---

## 우선순위 요약

```
현재 ────────────────────────────── 향후
  │                                   │
  ▼                                   ▼
[Phase 1] 인증          [Phase 3] R2 데이터셋
  │                       │
  ▼                       ▼
[Phase 2] 히스토리 D1   [Phase 4] 팀/공유
```

Phase 1-2가 핵심 (다기기 동기화 해결).
Phase 3-4는 사용자 규모 확대 시.

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-02-06 | 최초 작성 — 전체 계획 (미구현 상태) |
| 2026-03-26 | 현황 반영 — Worker/D1/Secret 이미 활성, 남은 갭(인증/히스토리/R2) 정리 |
