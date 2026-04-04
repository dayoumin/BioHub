# Next Session Checklist

**Last updated**: 2026-04-04
**Status**: Phase 6a (자료 작성) + Genetics Phase A/B 완료 → Phase 6f/다음 도메인 진입

---

## 1. 작업 범위 요약

자료 작성 페이지 재구조화 3단계:
1. `/literature` 독립 페이지 → `/papers` 하위 탭으로 통합
2. Package Assembly MVP 기능 확정
3. 다음 도메인(GBIF/UniProt) 진입 준비

---

## 2. 자료 작성 탭 통합

**✅ 작업 완료** (2026-04-04)

구현 내용:
- `/literature` 리다이렉트 전용 페이지 변환
- MaterialPalette 링크 → `/papers?tab=literature`로 변경
- PapersContent에 tab 상태 추가 + LiteratureSearchContent 동적 로드
- handleBack → history.back()으로 단순화
- 라우팅 테스트 3건 추가 (우선순위, 탭 전환, 쿼리 보존)

커밋: `feat(papers): add literature tab integration + fix handleBack history`

참조: [2026-04-04-papers-tab-integration.md](docs/superpowers/plans/2026-04-04-papers-tab-integration.md)

---

## 3. Package Assembly 마무리

**이미 커밋됨** (2026-04-02)

진행 상황:
- AI 프롬프트 빌더 5단계 wizard ✅
- 조립 엔진 (ko/en 분기) ✅
- 20개 테스트 ✅
- DOCX/HWPX 내보내기 통합 ✅

추가 작업 불필요. [PLAN-PAPER-PACKAGE-ASSEMBLY.md](docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md)에서 완료 항목 참조.

---

## 4. 기술 부채 처리 우선순위

시간이 있을 경우 처리:

1. **IndexedDB 헬퍼 통합** — `txPut/txGetByIndex/txDelete` 3곳 중복 추출
   - 파일: `citation-storage.ts`, `document-blueprint-storage.ts`, `chart-snapshot-storage.ts`
   - 대상: `lib/utils/indexeddb-helpers.ts`
   - 예상 시간: 30분

2. **히스토리 사이드바 한글 하드코딩** — terminology 도입
   - 파일: `components/shared/HistorySidebar.tsx` (~15건)
   - 예상 시간: 45분

3. **기존 테스트 실패 수정** — 10건 (CSS 클래스 변경 미반영)
   - 파일: 7개 (`StatisticCard` 등)
   - 예상 시간: 60분

---

## 5. 권장 작업 순서

### 세션 1: 탭 통합 + 커밋 (완료)
- ✅ Task 1-4 구현
- ✅ Task 5 NEXT-SESSION.md 업데이트

### 세션 2: 기술 부채 (선택 사항)
- IndexedDB 헬퍼 추출
- 히스토리 사이드바 한글화
- 테스트 실패 수정

### 세션 3: 다음 도메인 진입
- GBIF 외부 DB 연동 스펙 작성
- species-validation 레코드 스키마 정의
- legal-status 레코드 스키마 정의

---

## 6. 참조 문서

- **진행 상황**: [TODO.md](TODO.md) · [ROADMAP.md](ROADMAP.md)
- **현재 구현**: [2026-04-04-papers-tab-integration.md](docs/superpowers/plans/2026-04-04-papers-tab-integration.md)
- **이전 완료**: [PLAN-PAPER-PACKAGE-ASSEMBLY.md](docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md) · [PLAN-GENETICS-IMPROVEMENT.md](docs/PLAN-GENETICS-IMPROVEMENT.md)
- **도메인 다음 단계**: [PLAN-FISHERY-MIGRATION.md](docs/PLAN-FISHERY-MIGRATION.md) · [docs/databases/](docs/databases/)
