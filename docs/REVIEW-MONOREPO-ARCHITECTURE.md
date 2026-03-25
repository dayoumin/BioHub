# 모노레포 아키텍처 검토 (2026-03-25)

BioHub 프로젝트에 대해 "모노레포 3층 구현 방법론"을 체계적으로 대입 검토한 결과.

---

## 1. 3층 구조 대입: 현재 BioHub 위치

### A. 전체 기반 구현 — 현황

| 항목 | 제안 | BioHub 현재 | 판정 |
|------|------|-------------|------|
| 앱 셸 | 필수 | `app/layout.tsx` + Sidebar + 라우팅 완성 | **완료** |
| 공통 디자인 시스템 | 필수 | shadcn/ui 40개 + `design-system/tokens.ts` + Bio 토큰 | **완료** |
| 공통 인증 | 필수 | **없음** (단일 사용자, Phase 16 예정) | **보류 (의도적)** |
| 공통 DB 연결 | 필수 | 스키마만 (`0001_init.sql`), IndexedDB/localStorage 사용 중 | **부분** |
| 공통 파일 구조 | 필수 | pnpm workspace + `packages/types`, `packages/db` | **완료** |
| 공통 권한 체계 | 필수 | **없음** | **보류 (의도적)** |
| 공통 잡/큐 인터페이스 | 필수 | `analysis-store` 상태머신 + Worker 8개 | **완료 (통계용)** |
| 공통 AI 호출 레이어 | 필수 | OpenRouter + Ollama + keyword fallback chain | **완료** |

**결론**: 인증/권한/DB를 제외하면 공통 기반이 이미 견고함. 3개는 SaaS 전환 시점(Phase 16)까지 의도적 보류.

### B. 도메인별 성숙도

| 도메인 | 성숙도 | 파일수 | 테스트 | 상태 |
|--------|--------|--------|--------|------|
| 통계 분석 | 95% | 200+ | 50+ | 프로덕션 (43개 메서드) |
| 시각화 | 90% | 35+ | 22 E2E | 프로덕션 (16+ 차트) |
| Bio-Tools | 50% | 30+ | 미진행 | 8/16 구현 |
| 유전분석 | 40% | 15+ | 기초 | DNA Barcoding만 |
| AI 채팅 | 60% | 40+ | 기초 | 1단계 완료 |
| 문헌/DB | 30% | 30+ | 3개 | RAG 인프라만 |

### C. 도메인 간 통합 현황

| 연결 | 상태 | 비고 |
|------|------|------|
| 통계 → 시각화 | **구현됨** | Analysis → Graph Studio 핸드오프 |
| 통계 → 리포트 | **구현됨** | DOCX/Excel/HTML export |
| Bio-Tools → 통계 | **없음** | 각자 독립 실행 |
| 유전분석 → 통계 | **없음** | |
| 문헌 → 분석 리포트 | **없음** | RAG는 채팅에만 연결 |
| 프로젝트 → 전체 결과 묶기 | **스텁** | ResearchProject 엔티티 있으나 실제 연결 약함 |

---

## 2. 핵심 갭 3개

### 갭 1: 공통 Result Object 구조 부재

현재 도메인별 결과 타입이 제각각:
- 통계: `AnalysisResult` (types/analysis.ts)
- Graph Studio: `ChartSpec` (lib/graph-studio/)
- Bio-Tools: 도구별 자체 타입
- Genetics: `BlastResult` (packages/types/)

"통합 리포트"나 "프로젝트별 결과 목록" 구현 시 이 불일치가 장벽.

**제안**: 새 도메인 추가 시 공통 Envelope 패턴 적용

```typescript
interface DomainResult<T> {
  id: string
  domain: 'statistics' | 'visualization' | 'bio-tools' | 'genetics' | 'literature'
  methodId: string
  status: 'pending' | 'running' | 'completed' | 'error'
  input: { fileName?: string; parameters: Record<string, unknown> }
  output: T
  metadata: { createdAt: string; duration?: number; projectId?: string }
}
```

### 갭 2: Job Status 모델이 통계 전용

`analysis-store.ts`의 `isAnalyzing + analysisProgress` 패턴이 통계에만 존재. Bio-Tools는 `useBioToolAnalysis` 내부에 별도 상태, Genetics는 또 다른 패턴.

**제안**: 새 비동기 작업은 4상태 통일
- `pending → running → completed | error`
- `progress: number` (0-100)
- `cancellable: boolean`

### 갭 3: 프로젝트 엔티티 연결 약함

`ResearchProject` 존재하고 localStorage 기반 `ProjectEntityRef` 연결이 history-store, graph-studio-store, analysis-history, 사이드바 등 7곳에서 사용 중. 다만 D1 Worker API(`/api/entities/link`)는 구현만 되어 있고 프론트에서 미호출. Bio-Tools 결과는 아직 프로젝트 연결 없음.

**제안**: 새 결과 타입에 `projectId?: string` opt-in 포함 (타입 필드 추가는 지금, DB 연동 강화는 Phase 16)

---

## 3. "전체 기반 먼저" 체크리스트

| 신호 | BioHub | 해당 |
|------|--------|------|
| 기능 3개 이상 | 6개 도메인 | O |
| 기능끼리 데이터 주고받음 | 통계→시각화 | O |
| 사용자/프로젝트/파일 공유 | ResearchProject 개념 | O |
| 결과 저장 형식 비슷 | 입력→실행→결과 패턴 공통 | O |
| 공통 UI 많음 | shadcn + 디자인 토큰 | O |
| 인증/과금 공통 | Phase 16 예정 | O |
| 긴 실행 작업 있음 | Pyodide, BLAST API | O |
| SaaS 확장 예정 | Workers 동적 배포 | O |

**8/8 해당** — 공통 기반 정비가 맞다는 결론. 단, 대부분 이미 완료.

---

## 4. 과잉 추상화 위험 체크

| 위험 | 현재 상태 | 판정 |
|------|----------|------|
| 거대한 shared schema | statistics.ts 실제 816줄 (43개 메서드분) | 양호 |
| 지나친 추상화 | Worker 분리, 훅 패턴 = 적절 | 양호 |
| 불필요한 plugin system | 없음 | 양호 |
| 이른 microservice | 모놀리식 Next.js 유지 | 양호 |
| 과도한 일반화 | Bio-Tools 공통 패턴 적절 | 양호 |

**결론**: 현재 추상화 수준 적절. 더 올리지 말 것.

---

## 5. 확정된 설계 결정 (2026-03-25)

### 결정 A: DomainResult<T> — 만들지 않는다
- **이유**: `ProjectEntityRef`가 이미 도메인 간 통합 레이어 역할 (entityKind로 구분)
- DomainResult<T>는 기존 타입 위에 래핑만 추가할 뿐 실제 동작 불변
- **대신**: Bio-Tools 결과 타입을 `types/bio-tools-results.ts`로 중앙화 (Fisheries 구현 시 함께)
- `ProjectEntityRef.entityKind`에 `'bio-tool-result'` 추가 (Bio-Tools 히스토리 저장 시)

### 결정 B: 구현 순서 — Fisheries 먼저 → HW/Fst
- **핵심 발견**: HW Equilibrium과 Fst는 CSV+Pyodide 패턴 = **사실상 Bio-Tools**
  - HW: CSV (유전자형 빈도) → scipy.stats.chisquare
  - Fst: CSV (집단별 대립유전자) → Weir & Cockerham (numpy)
  - 둘 다 `useBioToolAnalysis<T>` 재사용 가능
- DNA Barcoding만 독자 패턴 (FASTA + API 폴링)
- **순서**: Fisheries 3개 (Worker 7 재사용, 확실한 가치) → HW/Fst (같은 Bio-Tools 패턴) → Genetics vertical slice
- **위치**: `app/bio-tools/hardy-weinberg/`, `app/bio-tools/fst/` — 기존 레지스트리 설계 유지
- **유전분석 vertical slice**: Fisheries/HW/Fst 이후 Barcoding 흐름을 끝까지 관통 검증 (섹션 6 참조)

### 결정 C: statistics.ts — 분할하지 않는다
- **핵심 발견**: 실제 816줄 (21,571줄이 아님)
- 카테고리별 그룹화 이미 우수, 섹션별 주석 명확
- 수정 빈도 월 3-4회로 안정적
- **재검토 트리거**: 1,500줄 초과 시 또는 팀 확장 시

### 결정 D: CLAUDE.md — 추가하지 않는다
- 적용 빈도가 낮아 모든 대화에 로드할 가치 없음
- 메모리에 저장됨 (관련 작업 시 자동 참조)
- docs/에 상세 문서 존재

### 유지하는 기존 원칙
- 새 비동기 작업: `pending/running/completed/error` 4상태 통일 (설계 규약)
- 새 결과 타입: `projectId?: string` opt-in 포함 (지금 적용하는 설계 규약)
- 프로젝트 연결 DB 동기화: Phase 16에서 D1 연동과 함께 (현재 localStorage 레이어는 이미 동작 중)

---

## 6. 향후 모노레포 전환 시 고려사항

### `domains/` 디렉토리 분리 시기

**지금 분리하면 안 되는 이유:**
- 통계(95%), 시각화(90%)가 이미 프로덕션
- 라우팅, 레이아웃, 사이드바가 하나의 Next.js 앱에 통합
- 분리 비용 > 현재 이점

**분리가 필요해지는 신호:**
- 빌드 시간 5분 이상
- 도메인별 독립 배포 필요 시
- 팀원이 도메인별로 나뉠 때

### `packages/` 승격 후보

| 현재 위치 | 승격 후보 | 조건 |
|-----------|----------|------|
| `lib/services/export/` | `packages/export` | 다른 앱에서도 필요 시 |
| `lib/design-system/` | `packages/ui-tokens` | admin 앱 등 추가 시 |
| `lib/services/pyodide/` | `packages/pyodide-bridge` | Worker 재사용 필요 시 |

원칙: "2번 이상 쓰일 게 확실한 것만 승격" — 현재 `stats/` 하나뿐이므로 불필요.

### 유전분석 Vertical Slice 검증

심화 전에 끝까지 관통 필요:
```
FASTA 업로드 → 서열 QC → marker 선택 → DB 매칭 → 결과 요약 → 프로젝트 저장
```
이 흐름을 한 번 관통해야 유전분석 공통 구조 검증됨.

### 도메인 간 통합 로드맵

| 연결 | 우선순위 | 시기 |
|------|---------|------|
| Bio-Tools 결과 → 시각화 | 중 | Bio-Tools 심화 시 |
| 유전분석 → 통계 | 중 | Genetics 확장 시 |
| 전체 결과 → 통합 리포트 | 높 | Phase 16 전후 |
| 문헌 → 결과 해석 보강 | 낮 | 학술 DB 연결 후 |

---

## 7. 이미 잘 되어 있는 것 (유지)

1. 도메인별 디렉토리 분리 (`app/analysis/`, `app/bio-tools/` 등)
2. 레지스트리 패턴 (statistical-methods 43개, bio-tool-registry 16개)
3. 공통 훅 패턴 (`useStatisticsPage`, `useBioToolAnalysis<T>`)
4. Worker 도메인별 분리 (8개)
5. 과잉 추상화 안 하고 있음
6. pnpm workspace + packages/ 구조 확립

---

## 8. 판단 이력 (확정됨, 2026-03-25)

4개 판단 사항에 대한 심층 검토 후 확정. 상세 근거는 섹션 5 참조.

| 판단 | 결론 | 핵심 근거 |
|------|------|----------|
| A: DomainResult<T> | 만들지 않음 | ProjectEntityRef가 이미 통합 레이어 |
| B: 구현 순서 | Fisheries → HW/Fst → Genetics vertical slice | HW/Fst는 Bio-Tools 패턴, 이후 구조 검증 |
| C: statistics.ts 분할 | 분할 안 함 | 실제 816줄, 구조 양호 |
| D: CLAUDE.md 반영 | 추가 안 함 | 빈도 낮음, 메모리+docs 충분 |
