# Paper Package Assembly — 리뷰 요청

**브랜치**: `feat/paper-package-assembly`
**설계서**: [PLAN-PAPER-PACKAGE-ASSEMBLY.md](PLAN-PAPER-PACKAGE-ASSEMBLY.md)
**변경 파일**: 9개 (신규 7, 수정 2), +1,678 / -27 lines

---

## 1. 이 기능이 뭔가

BioHub에서 수행한 분석 결과(통계 + 그래프 + 문헌)를 **하나의 Markdown + JSON 패키지**로 조립해서, 사용자가 Claude/GPT/Gemini에 통째로 붙여넣으면 **논문 전체 초고가 나오도록** 하는 기능.

기존 `DocumentBlueprint`(BioHub 내부 WYSIWYG 편집기)과 역할이 다름:
- `DocumentBlueprint` → BioHub 안에서 편집하는 문서 모델
- `PaperPackage` → 외부 AI에 보내는 프롬프트 빌더 (export 전용)

---

## 2. 아키텍처

```
PaperPackage (타입) → localStorage 저장
     ↓
assemblePaperPackage() → Markdown + JSON 직렬화
     ↓
PackageBuilder (5단계 wizard UI) → 클립보드 복사 / .md 다운로드
```

**진입점**: `/papers` → PapersHub "AI 패키지 조립" 버튼 → `/papers?pkg=new&projectId=xxx`

**데이터 흐름**:
1. `ProjectEntityRef` 기반으로 프로젝트 소속 분석/그래프 자동 수집
2. `HistoryRecord` + `GraphProject`에서 메서드명, 결과, APA 포맷, 변수 매핑 등 추출
3. `JournalPreset`에 따라 저널별 섹션 순서/언어/스타일 적용
4. `PackageReference`의 요약 상태(`summaryStatus`)로 hallucination 위험 경고

---

## 3. 파일 구조

### 신규 파일 (7개)

| 파일 | 역할 | 라인 |
|------|------|------|
| `stats/lib/research/paper-package-types.ts` | `PaperPackage`, `PackageItem`, `PackageReference`, `JournalPreset` 타입 + `JOURNAL_PRESETS` 5개 | 172 |
| `stats/lib/research/paper-package-storage.ts` | localStorage CRUD (`createLocalStorageIO` 패턴) | 36 |
| `stats/lib/research/paper-package-assembler.ts` | `assemblePaperPackage()` 엔진 + `generateFigurePatternSummary()` | 289 |
| `stats/components/papers/PackageBuilder.tsx` | 5단계 wizard UI (Step 1~5 서브컴포넌트) | 774 |
| `stats/components/papers/PackagePreview.tsx` | 미리보기 + 클립보드 복사 + .md 다운로드 | 83 |
| `stats/lib/research/__tests__/paper-package-storage.test.ts` | storage CRUD 테스트 (7개) | 94 |
| `stats/lib/research/__tests__/paper-package-assembler.test.ts` | 조립 엔진 + 패턴 요약 테스트 (8개) | 154 |

### 수정 파일 (2개)

| 파일 | 변경 내용 |
|------|----------|
| `stats/app/papers/PapersContent.tsx` | `?pkg=<id>` 라우팅 분기 추가 |
| `stats/components/papers/PapersHub.tsx` | "AI 패키지 조립" 버튼 + `onOpenPackage` prop |

### 설계 문서 수정 (1개)

| 파일 | 변경 내용 |
|------|----------|
| `docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md` | 코드 리뷰 반영 6건 — 모델 역할 분리 선언, `analysisIds: string[]`, 패턴 요약 전략, `summaryStatus`, 섹션 매핑, displayPrecision |

---

## 4. 핵심 타입

```typescript
interface PaperPackage {
  id: string
  projectId: string
  version: number
  overview: { title, purpose, dataDescription, researchQuestion?, hypothesis? }
  items: PackageItem[]          // 분석/그래프 순서 배열
  references: PackageReference[] // 문헌 + 역할 + 요약
  journal: JournalPreset        // 저널별 섹션/스타일
  context: { priorWorkDiff?, limitations?, highlights?, ... }
}

interface PackageItem {
  type: 'analysis' | 'figure' | 'table'
  sourceId: string              // HistoryRecord.id 또는 GraphProject.id
  analysisIds: string[]         // cross-reference용 ("ANAL-01"), 다대다
  patternSummary?: string       // 그래프 패턴 요약 (자동 또는 수동)
  included: boolean
}

interface PackageReference {
  manualEntry?: { authors, year, title, journal, doi? }
  role: 'methodology' | 'comparison' | 'background' | 'theory' | 'other'
  summaryStatus: 'missing' | 'draft' | 'ready'  // export 시 'ready' 강제
  included: boolean
}
```

---

## 5. 조립 엔진 (`assemblePaperPackage`)

**입력**: `PaperPackage` + `{ historyRecords, graphProjects }`
**출력**: `{ markdown: string, tokenEstimate: number, warnings: string[] }`

출력 구조:
1. 역할 + 핵심 규칙 7개 (수치 변경 금지, hallucination 금지 등)
2. 저널 설정 + 한국어 작성 규칙 (해당 시)
3. 연구 개요
4. 분석 결과 — JSON 블록 (method, result, effectSize, groupStats, apaFormat 등 구조화 추출)
5. 그래프 — Markdown (패턴 요약 + 관련 분석 ID)
6. 참고문헌 — 역할 태그 + 요약
7. 추가 맥락 (선행연구 차이, 한계, 시사점 등)
8. 검증 체크리스트 (핵심 수치 대조표)

**경고 생성**: `summaryStatus !== 'ready'`인 포함 문헌이 있으면 경고 추가

---

## 6. 설계 결정 + 근거

| 결정 | 근거 |
|------|------|
| `PaperPackage` ≠ `DocumentBlueprint` 병렬 존재 | 목적이 다름 (AI 프롬프트 vs WYSIWYG 편집) |
| `analysisIds: string[]` (배열) | 그림/표가 여러 분석을 동시 참조 (예: ANOVA + Post-hoc) |
| `summaryStatus` 3단계 | `included=true`인데 `'missing'`이면 UI 경고 → export 시 hallucination 방지 |
| 패턴 요약 = HistoryRecord 기반 자동 시도 + 수동 fallback | DataPackage는 세션 메모리만 (Phase 16에서 R2 저장 후 완전 자동 예정) |
| localStorage 저장 | GraphProject와 동일 패턴, 텍스트 기반이라 용량 부담 없음 |
| `getAllHistory()` 결과를 `useRef`로 캐시 | Step 2 → Step 5 사이 동일 데이터를 2번 IndexedDB 호출 방지 |

---

## 7. 테스트 (15개 통과)

**paper-package-storage** (7개):
- 빈 스토리지, 저장/조회, projectId 필터, 덮어쓰기, 삭제

**paper-package-assembler** (8개):
- `generateFigurePatternSummary`: HistoryRecord 없음 → undefined, groupStats 있음 → 요약 생성, groupStats 없음 → undefined
- `assemblePaperPackage`: 기본 구조, excluded 아이템 필터, included 아이템 포함, summaryStatus missing 경고, tokenEstimate 양수

---

## 8. 알려진 한계 + 향후 과제

| 한계 | 해결 시점 |
|------|----------|
| 이미지 zip export 미구현 | Phase 2 |
| AI 자동 요약 제안 (`summaryStatus: 'draft'`) | Citation Manager (Phase 6a) 이후 |
| DataPackage 기반 완전 자동 패턴 요약 | Phase 16 (Cloudflare R2 저장) |
| `displayValue` 수치 정밀도 필드 | 문제 발생 시 추가 |
| 커스텀 저널 섹션 ID 매핑 규약 | 구현 시 정의 |

---

## 9. `/simplify` 리뷰에서 수정한 7건

1. `generateFigurePatternSummary` 문자열 로직 버그 (`.split('(')` → `.some()`)
2. `useEffect` 의존성 `[step, pkg]` → `[step, projectId, hasItems]` (race condition 방지)
3. `getAllHistory()` 이중 호출 → `useRef` 캐시
4. `collectItems` `.find()` 루프 → `Map` 전환 (O(M×N) → O(M+N))
5. `Record<string, string>` → `Record<ReferenceRole/SummaryStatus, string>` 타입 강화
6. inline lambda → `handleAssemble` 직접 전달 (useCallback bypass 방지)
7. `updateManualEntry` 중복 spread 정리

---

## 10. 리뷰 시 중점 확인 요청

1. **조립 엔진 출력 품질** — `assemblePaperPackage()`가 생성하는 Markdown이 실제 AI에 붙여넣었을 때 논문 초고 생성에 충분한 구조/정보를 제공하는지
2. **타입 안전성** — `HistoryRecord.results`가 `Record<string, unknown>`이라 defensive 추출하는 부분이 실제 결과 구조와 맞는지
3. **UI 완성도** — 5단계 wizard의 UX 흐름, 누락된 인터랙션
4. **기존 코드와의 정합성** — `PapersContent` 라우팅 패턴, `PapersHub` props 확장이 기존 패턴과 일관적인지
