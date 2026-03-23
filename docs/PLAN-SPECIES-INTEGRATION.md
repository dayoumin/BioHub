# 학명검증(Species Checker) BioHub 통합 계획

**Status**: 계획 단계 (species_checker 별도 개발 진행 중)
**Last updated**: 2026-03-22

---

## 1. 현황

### Species Checker (`d:\Projects\species_checker`)

- **v1.0.0**, 별도 프로젝트로 개발 중
- **스택**: Next.js 15 + TypeScript + shadcn/ui + Turso/Drizzle + CF Workers (BioHub와 동일)
- **배포**: Vercel(수산 모드) + CF Workers(연구자 모드) 이중 배포

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 4-DB 병렬 검증 | WoRMS(해양) + CoL(전체) + LPSN(원핵) + Turso 캐시 |
| 법적 보호 상태 | 11개 카테고리 (멸종위기 I/II, 해양보호, CITES, IUCN 등), 11,222종 |
| 한국명↔학명 | NIBR 62,604종 + MBRIS 12,000+ 해양종, 양방향 검색 |
| 배치 검증 | Excel/CSV 파일 업로드, 500행 제한 |
| 오타 감지 | Recall@5 97.9%, 클라이언트+서버 이중 |
| 종 모니터링 | Watch list + Web Push 알림 + 변경 감지 |
| 관리자 대시보드 | 검색 통계, 법적 종 관리, API 보호 |
| 데스크탑 | Tauri 2.8 (Windows MSI) |

### BioHub 연결 지점

- `ProjectEntityKind`에 `'species-validation'`, `'legal-status'` 이미 정의됨
- TODO.md `[domain]` 항목: species-validation / legal-status 레코드 스키마
- 사이드바에 "학명 유효성 검증" 항목 있음 (현재 disabled, badge: "준비 중")

---

## 2. 통합 계획 (3단계)

### Phase A. API 연동 (species_checker 안정화 후)

- BioHub `/species-validation` 페이지 활성화
- species_checker API를 직접 호출 (별도 서비스 유지)
- 검증 결과를 BioHub UI에 표시
- **장점**: 코드 변경 최소, 독립 배포 유지
- **단점**: 네트워크 지연, 이중 인프라

### Phase B. ResearchProject 연결

- 검증 결과를 `upsertProjectEntityRef` (entityKind: `'species-validation'`)로 연결
- `/projects` 페이지에서 검증 결과 조회 가능
- 법적 보호 상태도 별도 entityKind (`'legal-status'`)로 연결 가능

### Phase C. 모노레포 패키지 추출 (장기)

- 핵심 validator 로직을 `packages/species-validator`로 추출
- UI 컴포넌트는 `stats/components/species-validation/`으로 이식
- DB 통합 (Turso 단일 인스턴스)
- species_checker 독립 배포 종료

---

## 3. 알림 시스템 통합

### 현재 상태

- species_checker: Web Push 기반 종 모니터링 알림 (VAPID + Service Worker)
- BioHub: 알림 시스템 없음 (toast만 사용)

### 통합 방향

species_checker의 알림 인프라를 BioHub 전체로 확장:

| 모듈 | 알림 대상 |
|------|----------|
| 학명 검증 | 종 상태 변경 (Watch) |
| 통계 분석 | 장시간 분석 완료 |
| 유전적 분석 | BLAST 결과 도착 (현재 폴링 → Push 전환 가능) |
| 논문 | 리뷰 상태 변경, 체크리스트 완료 |
| 프로젝트 | 공유 프로젝트 업데이트 (협업 기능 추가 시) |

### 설계 원칙

- 단일 Service Worker + 알림 라우터
- 알림 유형별 구독 설정 (사용자 선택)
- 공통 알림 UI (알림 센터 또는 드롭다운)
- species_checker 통합 시 함께 구현

---

## 4. DB 전략: Turso → D1 마이그레이션

### 결정

- **D1 단일** — Vercel 사용 안 함, CF Workers 통일
- species_checker 통합 시 Turso → D1 마이그레이션
- Turso 의존 완전 제거

### 마이그레이션 대상

| 테이블 | 행 수 | 비고 |
|--------|-------|------|
| nibr_species | 62,604 | 한국 생물종 |
| mbris_species | 12,000+ | 해양 한국명 |
| lpsn_names | 20,000+ | 원핵생물 |
| lpsn_metadata | — | 분류, 권위 |
| worms_cache | 가변 | 7일 TTL → D1 또는 KV |
| legal_protected_species | 11,222 | 법적 보호종 |
| watched_species | 사용자별 | 종 모니터링 |
| species_snapshots | 이력 | 변경 감지용 |
| search_logs | 분석용 | 검색 로그 |

### 고려 사항

- worms_cache는 D1보다 **KV**가 적합할 수 있음 (TTL 네이티브 지원)
- GitHub Actions 자동 동기화(LPSN, legal-species)를 D1 write API로 전환 필요
- Drizzle ORM은 D1 지원 — 스키마 마이그레이션 도구 재사용 가능
- BioHub 기존 D1 테이블(`projects`, `project_entity_refs`)과 같은 DB 인스턴스 사용

---

## 5. 선행 조건

- [ ] species_checker v1.x 안정화 완료
- [ ] BioHub CF Workers 동적 배포 전환 (Phase 16)
- [ ] `[domain]` species-validation 레코드 스키마 확정
- [ ] `[domain]` legal-status 레코드 스키마 확정
- [ ] Turso → D1 마이그레이션 스크립트 작성

---

## 5. 참고

- species_checker 소스: `d:\Projects\species_checker`
- species_checker ROADMAP: `d:\Projects\species_checker\ROADMAP.md`
- BioHub 사이드바: `stats/components/layout/app-sidebar.tsx` (line 60-61, disabled)
- `@biohub/types` ProjectEntityKind: `packages/types/src/project.ts` (line 22-23)
