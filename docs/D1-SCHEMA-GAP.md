# D1 스키마 갭 분석

**작성일**: 2026-03-22
**DB**: `biohub-db` (APAC/ICN, `c176058f-cf48-4659-a08f-b151f357ae55`)
**스키마**: `migrations/0001_init.sql`

## 현황

프론트엔드는 localStorage + IndexedDB 기반. D1은 Worker API 뒤에 있으나 프론트엔드가 아직 대부분 직접 호출하지 않음.

## 현재 7개 테이블 상태

| 테이블 | 프론트 저장소 | Worker API | D1 활용도 |
|--------|-------------|-----------|----------|
| `users` | 없음 (인증 미구현) | 없음 | 준비만 |
| `projects` | localStorage | `/api/projects` 있음 | 미사용 |
| `project_entity_refs` | localStorage | `/api/entities/link` 있음 | 미사용 |
| `analysis_results` | IndexedDB (HistoryRecord) | 없음 | 미사용 |
| `blast_results` | localStorage (max 20) | `/api/entities/blast` 있음 | 연결됨 |
| `graph_projects` | localStorage | 없음 | 미사용 |
| `blast_cache` | Worker 내부 | Worker 내부 | 연결됨 |

## 누락 테이블

| 데이터 | 프론트 타입 | 현재 저장소 | 필요 D1 테이블 |
|--------|-----------|-----------|--------------|
| 채팅 세션 | `ChatSession` | IndexedDB | `chat_sessions` |
| 채팅 메시지 | `ChatMessage[]` (세션 내장) | IndexedDB | `chat_messages` |
| 채팅 폴더 | `ChatProject` | IndexedDB | `chat_projects` |
| Evidence | `EvidenceRecord` | 타입만 정의 | `evidence_records` |
| DataPackage | `DataPackage` | 메모리 (새로고침 시 소실) | `data_packages` |
| 사용자 설정 | `ChatSettings` | IndexedDB | `user_settings` |

## 스키마 불일치

### 1. `graph_projects` — `dataPackageId` 누락
프론트엔드 `GraphProject.dataPackageId`는 필수 필드이나 D1 스키마에 없음.

```sql
-- 필요한 마이그레이션
ALTER TABLE graph_projects ADD COLUMN data_package_id TEXT;
```

### 2. 타임스탬프 타입 불일치
- D1: `INTEGER` (Unix ms)
- 프론트 `ResearchProject`: `string` (ISO 8601)
- 통일 필요 — D1 마이그레이션 시 결정

### 3. `analysis_results` 컬럼 부족
프론트 `HistoryRecord`에는 `variables`, `options`, `interpretationChat`, `paperDraft`, `evidenceRecords` 등 10+개 필드가 추가로 필요. 현재 D1 테이블은 최소 필드만 있음.

## 마이그레이션 우선순위

| 단계 | 작업 | 트리거 |
|------|------|--------|
| 1 | `graph_projects`에 `data_package_id` 추가 | 즉시 (스키마 불일치) |
| 2 | `evidence_records` 테이블 | Trust/Provenance 구현 시 |
| 3 | `chat_sessions` + `chat_messages` | 챗봇 역할 확정 + 인증 구현 시 |
| 4 | `data_packages` | 그래프 재현성/공유 필요 시 |
| 5 | `user_settings` | 인증 구현 시 |
| 6 | `analysis_results` 확장 | 분석 클라우드 동기화 시 |

## 전략: Turso → D1 통합

- **결정**: D1 하나로 통합 (2026-03-22)
- **이유**: Turso는 `NEXT_PUBLIC_*` 토큰이 브라우저에 노출, D1은 Worker 뒤에서 보호
- **경로**: 프론트 → Worker API → D1 (브라우저가 DB 직접 호출하지 않음)
- **Turso 제거**: 마이그레이션 완료 후 `turso-adapter.ts`, `hybrid-adapter.ts`, 환경변수 제거
