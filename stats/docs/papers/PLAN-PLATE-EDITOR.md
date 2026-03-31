# Phase 3: Plate 리치 텍스트 에디터 구현 계획

**상태**: 설계 완료  
**선행**: Phase 1-2 완료 (DocumentBlueprint + 마크다운 에디터)  
**목표**: 마크다운 Textarea → Plate WYSIWYG 에디터 전환

---

## 1. 현황 요약

### 현재 에디터 (`DocumentEditor.tsx`)
- **편집**: `<Textarea>` + `font-mono` (마크다운 직접 입력)
- **미리보기**: `<ReactMarkdown>` 토글 (remark-gfm, remark-math, rehype-katex)
- **저장**: `DocumentSection.content: string` (마크다운)
- **삽입**: `s.content + "\n\n### ..."` (문자열 연결)
- **표/그림**: `content`(마크다운 텍스트)와 `section.tables`/`section.figures`(sidecar 배열)에 이중 저장. export는 둘 다 출력.

### 전환 후
- **편집**: Plate WYSIWYG (bold/italic/heading/list/table/math 인라인 편집)
- **미리보기**: 유지 (수식 렌더링용 — WYSIWYG에서 $...$ 원문 표시 방지)
- **저장**: `content`(마크다운) + `plateValue?`(Slate JSON) 양방향
- **삽입**: `DocumentEditor`가 소유한 editor ref를 통한 Plate API 노드 삽입
- **표/그림**: sidecar 배열 유지 (Phase 3에서 canonical source 변경 안 함)

---

## 2. 핵심 설계 결정

### 2.1 양방향 저장 전략

```
DocumentSection {
  content: string        // 마크다운 (기존 유지 — assembler/export가 사용)
  plateValue?: unknown   // Slate JSON (Plate 에디터 전용)
  tables?: DocumentTable[]   // sidecar 유지 (변경 없음)
  figures?: FigureRef[]      // sidecar 유지 (변경 없음)
}
```

**장점**:
- assembler 변경 0줄 (계속 마크다운 생성 → `content`에 할당)
- export 변경 0줄 (`documentToMarkdown/Html`이 `content` + `tables` + `figures` 사용)
- 테스트 28개+ 그대로 동작 (`expect(section?.content).toContain(...)`)
- 기존 IndexedDB 문서 하위호환 (plateValue 없으면 content에서 파싱)

**동기화 규칙**:
- 에디터 열기: `plateValue` 있으면 사용, 없으면 `content`에서 `editor.api.markdown.deserialize()`
- 에디터 저장: `plateValue` = 에디터 값, `content` = `editor.api.markdown.serialize()`

### 2.2 표/그림 canonical source 결정

**결정: Phase 3에서는 sidecar 유지**

현재 구조:
- assembler가 `section.tables[]`, `section.figures[]` 배열에 구조화된 데이터 저장
- `section.content`에 마크다운 텍스트로 표/그림 참조 포함
- export가 `content` 출력 후 `tables`/`figures`를 별도로 붙임

Phase 3 방침:
- Plate 에디터는 **텍스트 content만** 편집 (마크다운 본문)
- 표/그림은 기존처럼 에디터 아래에 읽기 전용으로 표시 (현재 패턴 유지)
- Plate 테이블 플러그인은 **새 표 작성**에만 사용 — 기존 sidecar 표를 Plate로 마이그레이션하지 않음
- 후속(Phase 4+)에서 표/그림 canonical source를 Plate로 통합 검토

**근거**: export가 `content` + `tables` + `figures`를 별도로 출력하는 현재 구조를 유지하면 assembler/export 변경이 불필요. 통합은 DOCX export(Phase 4)와 함께 검토하는 것이 안전.

### 2.3 수식 렌더링 전략

**결정: `@platejs/math` 포함 + 미리보기 모드 유지**

- Plate WYSIWYG에서 `$...$`는 인라인 수식 노드로 표시 (`@platejs/math`)
- 미리보기 모드는 **제거하지 않음** — KaTeX 완전 렌더링 fallback으로 유지
- 편집 모드: Plate WYSIWYG (수식은 인라인 블록으로 표시)
- 미리보기 모드: ReactMarkdown + remark-math + rehype-katex (수식 완전 렌더링)

**근거**: 논문 편집기에서 수식은 핵심 기능. WYSIWYG만으로는 복잡한 수식 렌더링 품질을 보장할 수 없으므로 미리보기를 유지.

### 2.4 에디터 인스턴스 소유권

**결정: `DocumentEditor`가 `usePlateEditor()` 소유, `PlateEditor`는 controlled**

```
DocumentEditor (owner)
  ├── usePlateEditor() → editor 인스턴스
  ├── PlateEditor (editor prop 수신, 렌더링 전담)
  ├── MaterialPalette (onInsert 콜백 수신)
  │     └── 클릭 시 → DocumentEditor의 핸들러 → editor.tf.insertNodes()
  └── DocumentSectionList (섹션 전환 시 → editor 값 교체)
```

- `DocumentEditor`가 `usePlateEditor()`로 인스턴스 생성
- 섹션 전환 시 `editor.children = deserialize(newSection.content)`
- `MaterialPalette`의 삽입 콜백에서 `editor.tf.insertNodes()` 호출
- `PlateEditor.tsx`는 `editor` prop을 받아 `<Plate editor={editor}>` 래핑만 담당

### 2.5 패키지 선택

```
platejs                    # 코어 엔진 + React 바인딩
@platejs/basic-nodes       # bold, italic, underline, heading, blockquote, code
@platejs/list              # ordered/unordered list
@platejs/indent            # list 의존성 (indent/outdent)
@platejs/table             # 논문 표 편집
@platejs/math              # KaTeX 수식 인라인 블록
@platejs/markdown          # 마크다운 ↔ Plate Value 직렬화
```

**Phase 3 제외**:
- `@platejs/ai` — Phase 5 LLM 생성에서 검토
- `@platejs/media` — 이미지 삽입은 후속

---

## 3. 구현 단계

### Step 1: 의존성 설치 + 에디터 인스턴스 구조

**작업**:
1. `stats/` 디렉토리에서 패키지 설치:
   ```bash
   cd stats
   pnpm add platejs @platejs/basic-nodes @platejs/list @platejs/indent @platejs/table @platejs/math @platejs/markdown
   pnpm dlx shadcn@latest add @plate/editor
   ```
2. `components/papers/plate-plugins.ts` 생성 — 플러그인 설정 (BasicNodes, List, Indent, Table, Math, Markdown)
3. `components/papers/PlateEditor.tsx` 생성 — `editor` prop을 받는 controlled 컴포넌트
4. `DocumentEditor.tsx`에서 `usePlateEditor()` 호출 + editor 인스턴스 소유
5. Textarea를 PlateEditor로 교체 (편집 모드)
6. 미리보기 모드 유지 (ReactMarkdown — 수식 렌더링)

**검증**: Plate 에디터에서 텍스트 입력 + 볼드/이탤릭/헤딩/수식 동작 확인

### Step 2: 마크다운 직렬화 연동

**작업**:
1. `MarkdownPlugin` 설정 (`plate-plugins.ts`) — `remark-gfm`, `remark-math` 포함
2. 에디터 열기: `plateValue` 있으면 사용, 없으면 `editor.api.markdown.deserialize(content)`
3. 자동 저장: `plateValue` = editor 값, `content` = `editor.api.markdown.serialize()`
4. `DocumentSection` 타입에 `plateValue?: unknown` 추가
5. `document-blueprint-types.ts` 변경 (1줄)
6. 기존 문서 열기 테스트 (plateValue 없는 경우 content에서 파싱)

**검증**: 기존 마크다운 문서 열기 → 편집 → 저장 → content 필드에 마크다운 유지 확인

### Step 3: 분석/그래프 삽입 연동

**작업**:
1. `handleInsertAnalysis` — `editor.tf.insertNodes()` 사용:
   - heading 노드 (`### methodName`) + paragraph 노드 (results 텍스트)
   - 표/그림은 기존대로 sidecar 배열에 추가 (Plate 노드로 넣지 않음)
2. `handleInsertFigure` — 동일 패턴
3. `DocumentEditor`의 editor 인스턴스를 통해 삽입 (MaterialPalette는 콜백만 호출)

**검증**: 재료 팔레트에서 분석 클릭 → Plate에 노드 삽입 + sidecar 배열 업데이트 + content 마크다운 동기화

### Step 4: 툴바

**작업**:
1. 고정 툴바 추가 (bold/italic/underline/heading/list)
2. 테이블 삽입 버튼 — Plate 테이블 노드로 새 표 생성 (sidecar와 별도)
3. 수식 삽입 버튼 — `$...$` 인라인 수식 노드

**검증**: 툴바 버튼으로 서식/표/수식 적용

### Step 5: 정리 + 테스트

**작업**:
1. `DocumentSectionList` — `section.content.length > 0` → `section.content || section.plateValue` 체크
2. `previewMode` state를 기본값 `false`로 유지 (Plate가 기본 편집, 미리보기는 토글로 전환)
3. 단위 테스트: PlateEditor 마운트, 마크다운 왕복 변환, 삽입 동작
4. 기존 assembler 테스트 통과 확인

**검증**: 전체 플로우 (새 문서 → 편집 → 재조립 → 내보내기 → 기존 문서 열기)

---

## 4. 파일 변경 매트릭스

| 파일 | Step | 변경 내용 |
|------|------|----------|
| **신규** `plate-plugins.ts` | 1 | 플러그인 설정 (basic-nodes, list, indent, table, math, markdown) |
| **신규** `PlateEditor.tsx` | 1 | controlled Plate 에디터 (`editor` prop 수신) |
| `document-blueprint-types.ts:40` | 2 | `plateValue?: unknown` 필드 추가 |
| `DocumentEditor.tsx` | 1-3 | `usePlateEditor()` 소유, Textarea→PlateEditor 교체, 삽입 로직 전환 |
| `DocumentSectionList.tsx:59` | 5 | content 비어있음 체크 수정 |

**변경 없음** (양방향 + sidecar 유지 덕분):
- `document-assembler.ts` — 계속 `content` 마크다운 + `tables`/`figures` sidecar 생성
- `document-preset-registry.ts` — `content: ''` 유지
- `DocumentExportBar.tsx` — `content` + `tables` + `figures` 출력 유지
- `DocumentAssemblyDialog.tsx` — content 직접 접근 없음
- `document-blueprint-storage.ts` — IndexedDB schemaless
- `__tests__/document-assembler.test.ts` — string 단언 유지

---

## 5. 리스크 + 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Plate v52 + Tailwind v4 호환 | 빌드 실패 | plate-template(React 19 + TW4) 존재 확인됨 |
| 마크다운 ↔ Plate 변환 손실 | 서식 깨짐 | `remark-gfm` + `remark-math`로 GFM + 수식 지원 |
| 번들 크기 증가 | 초기 로드 | `/papers`는 이미 `dynamic(ssr: false)` — 추가 lazy 로드 |
| 기존 문서 하위호환 | 데이터 손실 | plateValue 없으면 content 파싱 fallback |
| static export 호환 | 빌드 실패 | Plate는 순수 클라이언트 — `'use client'` 패턴 |
| sidecar 표 + Plate 표 이중 존재 | 사용자 혼란 | Phase 3에서는 sidecar=읽기 전용, Plate 표=새 작성. Phase 4에서 통합 |

---

## 6. 의존성 요약

### 신규 설치 (`stats/` 디렉토리에서 실행)
```bash
cd stats
pnpm add platejs @platejs/basic-nodes @platejs/list @platejs/indent @platejs/table @platejs/math @platejs/markdown
pnpm dlx shadcn@latest add @plate/editor
```

### 유지 (제거하지 않음)
- `react-markdown` — 미리보기 모드 + AiInterpretationCard 등에서 사용
- `remark-math`, `rehype-katex`, `katex` — 수식 렌더링 유지

### 버전 호환
- React 19.1.0 ✓
- Next.js 15.5.2 ✓
- TypeScript 5 + `moduleResolution: "bundler"` ✓
- Tailwind CSS v4 ✓ (plate-template 확인)

---

## 7. 후속 Phase와의 관계

| 항목 | Phase 3 (현재) | Phase 4 (DOCX) | Phase 5 (LLM) | Phase 6 (인용) |
|------|---------------|----------------|---------------|---------------|
| 표 canonical | sidecar 유지 | Plate로 통합 검토 | — | — |
| 수식 | `@platejs/math` 기본 | DOCX 수식 변환 | — | — |
| LLM 생성 | — | — | `@platejs/ai` 검토 | — |
| 인용 | — | — | — | citation 노드 |
