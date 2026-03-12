# Code Review: APA Table Formatter (Layer 0, #8)

> **목적**: 다른 AI 또는 개발자가 이 구현을 비판적으로 리뷰할 수 있도록 맥락, 설계 결정, 알려진 한계를 정리한 문서.
> **작성일**: 2026-03-12
> **상태**: 구현 완료, 자체 리뷰 2회 완료 (1차: 버그 4개, 2차: 보안/규칙 위반 4개 → 모두 수정)

---

## 1. 구현 범위

### 목적
StatisticsTable 컴포넌트의 columns/data를 **APA 7th Edition** 서식의 HTML로 변환하여 Word/Google Docs에 붙여넣기 시 학술 논문 표준 테이블로 표시되도록 함.

### 변경 파일

| 파일 | 유형 | 역할 |
|------|------|------|
| `lib/utils/apa-table-formatter.ts` | 신규 (177줄) | APA HTML/텍스트 생성 + 클립보드 복사 |
| `components/statistics/common/StatisticsTable.tsx` | 수정 | 복사 드롭다운 UI (Excel/APA/CSV) |
| `__tests__/utils/apa-table-formatter.test.ts` | 신규 (205줄) | 19개 테스트 |

### 변경하지 않은 것
- Python Worker 코드
- 기존 StatisticsTable의 렌더링 로직
- 다른 컴포넌트의 복사 기능 (ResultsActionStep, rag-chat 등)

---

## 2. APA 7th Edition 규칙 → 코드 매핑

| APA 규칙 | 코드 위치 | 구현 방식 |
|----------|----------|----------|
| **3-line rule** (상단 2px, 구분선 1px, 하단 2px) | `generateApaHtml` L85-86, L101, L117 | `border-top:2px solid black` (헤더 th), `border-bottom:1px solid black` (헤더 th), `border-bottom:2px solid black` (마지막 행 td) |
| **수직선 없음** | 전체 | `border-left`, `border-right` 미사용 (테스트로 검증) |
| **Times New Roman, 12pt** | `generateApaHtml` L88 | `font-family:Times New Roman,serif;font-size:12pt` |
| **통계 기호 이탤릭** | `italicizeStats` L24-29 | 단일 패스 regex로 `<em>` 래핑 |
| **p-value 선행 0 제거** | `formatCellValue` pvalue case L48-50 | `0.045 → .045`, `< .001 → < .001` |
| **정수(n, df)는 소수점 없이** | `formatCellValue` number case L52-56 | `isIntegerValue()` 판별 → `String(num)` |
| **실수는 소수점 3자리** | `formatCellValue` number case L56 | `num.toFixed(3)` |
| **테이블 제목 이탤릭** | `generateApaHtml` L91-93 | `<caption style="font-style:italic">` |
| **null/undefined → em dash** | `formatCellValue` L42 | `\u2014` (—) |

---

## 3. 핵심 설계 결정

### 3-1. inline CSS 사용 (외부 CSS 아님)

**이유**: 클립보드 HTML은 `<style>` 블록이나 외부 CSS를 참조할 수 없음. Word/Google Docs에 붙여넣기 시 inline style만 유지됨.

**영향**: HTML 문자열이 장황하지만, 클립보드 용도이므로 성능 이슈 없음.

### 3-2. `StatisticsTable`의 타입 재사용

```typescript
import type { TableColumn, TableRow } from '@/components/statistics/common/StatisticsTable'
```

**이유**: APA 포맷터가 StatisticsTable과 동일한 데이터 구조를 소비하므로, 별도 타입 정의는 불필요한 중복.

**위험**: StatisticsTable의 `TableColumn.type`에 새 값이 추가되면 `formatCellValue`의 switch가 `default`로 빠짐 → 새 타입에 대한 APA 포맷이 누락될 수 있음. (exhaustive check 미적용)

### 3-3. 단일 `formatCellValue` 함수 (HTML/Plain 공용)

초기 구현에는 `formatCellHtml`과 `formatCellPlain` 두 함수가 있었으나, HTML 버전이 사실상 동일 로직이라 dead code였음. 통합하여 단일 함수로 변경.

**근거**: APA 셀 값은 순수 텍스트 (HTML 태그 불필요). `< .001` 같은 특수 문자도 HTML에서 이스케이프 불필요 (`<` in text node is valid).

### 3-4. `italicizeStats` 단일 패스 regex

```typescript
/(ηp²|η²|ω²|ε²|χ²|\b(?:SD|SE|df|R²|t|F|p|r|M|n|N|d|f|W|U|H|Z)\b)/g
```

**설계 원칙**:
- **그리스 기호를 ASCII보다 앞에 배치** — regex alternation은 좌측 우선이므로, `ηp²`가 `p`보다 먼저 매칭
- **긴 패턴을 짧은 패턴보다 앞에** — `ηp²`가 `η²`보다 먼저 (부분 매칭 방지)
- **`\b` (word boundary)는 ASCII에만 적용** — 그리스 문자는 `\W`로 분류되어 `\b`가 작동하지 않으므로, 그리스 기호는 리터럴로 직접 매칭

**이전 시도 (실패):**
1. 2-pass 방식 (Greek 먼저 → ASCII 따로): `ηp²` 내부의 `p`가 2차 패스에서 재매칭 → `<em>η<em>p</em>²</em>`
2. 그리스 기호만 별도 regex: 동일한 이중 래핑 문제

### 3-5. ClipboardItem API + fallback

```typescript
if (typeof ClipboardItem !== 'undefined') {
  // text/html + text/plain 동시 복사
} else {
  // text/plain만 복사
}
```

**이유**: `ClipboardItem`은 Chrome 66+, Edge 79+, Safari 13.1+에서 지원. Firefox는 2023년부터 지원. 미지원 환경에서는 탭 구분 텍스트만 복사.

---

## 4. 테스트 커버리지 상세 (19 tests)

### `generateApaHtml` (12 tests)

| # | 테스트 | 검증 내용 | 부정 단언 |
|---|--------|----------|----------|
| 1 | HTML 구조 | `<table>`, `<thead>`, `<tbody>` 존재 | — |
| 2 | Times New Roman | 폰트 스타일 | — |
| 3 | APA 3-line rule | `border-top:2px`, `border-bottom:1px`, `border-bottom:2px` | — |
| 4 | 수직선 없음 | — | `border-left`, `border-right` 부재 |
| 5 | ASCII 이탤릭 | `<em>n</em>`, `<em>M</em>`, `<em>SD</em>`, `<em>p</em>` | — |
| 6 | Greek 이탤릭 | `<em>η²</em>`, `<em>ηp²</em>`, `<em>χ²</em>`, `<em>ω²</em>` | — |
| 7 | p-value 선행 0 제거 | `.032` 존재, `< .001` 존재 | `0.032` 부재 |
| 8 | 정수 소수점 없음 | `>30<`, `>28<` 존재 | `30.000` 부재 |
| 9 | 실수 3자리 | `12.345`, `2.567`, `10.123` | — |
| 10 | caption 있음 | `<caption`, `Table 1`, `font-style:italic` | — |
| 11 | caption 없음 | — | `<caption` 부재 |
| 12 | null → em dash | `\u2014` 존재 | — |

### `generateApaPlainText` (5 tests)

| # | 테스트 | 검증 내용 |
|---|--------|----------|
| 13 | 탭 구분 헤더 | `집단\tn\tM\tSD\tp` 정확히 일치 |
| 14 | 행 수 | 1 header + 2 data = 3줄 |
| 15 | p-value APA | `.032`, `< .001` |
| 16 | 정수 소수점 없음 | `\t30\t` 존재, `30.000` 부재 |
| 17 | null → em dash | `\u2014` 존재 |

### 특수 타입 (2 tests)

| # | 테스트 | 검증 내용 |
|---|--------|----------|
| 18 | CI 배열 | `[1.234, 5.678]` (HTML + plain 모두) |
| 19 | 백분율 | `85.6%` (0.856 → 85.6%) |

### 미테스트 영역

| 항목 | 이유 |
|------|------|
| `copyApaTable` (클립보드 복사) | `navigator.clipboard` 브라우저 API → Vitest(jsdom)에서 미지원 |
| StatisticsTable 드롭다운 UI | React 컴포넌트 → 별도 컴포넌트 테스트 또는 E2E 영역 |
| `custom` 타입 컬럼 | `formatCellValue`에서 `default` → `String(value)` 처리 |
| 빈 data 배열 | `data = []` 시 빈 `<tbody>` 생성 (크래시 없음, 미테스트) |
| XSS (title에 HTML 삽입) | ~~위험~~ → 2차 리뷰에서 수정됨 (escapeHtml 적용) |

---

## 5. 발견 → 수정 이력

### Bug #1: 복사 드롭다운 노출 조건

**증상**: `actions` prop이 없고 `title`만 있는 테이블에서 APA 복사 버튼이 표시되지 않음.

**원인**: 기존 코드에서 `{actions && (<div>...dropdown + action buttons</div>)}` 조건으로 감싸져 있었음. `actions`가 undefined이면 드롭다운 전체가 렌더링되지 않음.

**수정**: 조건을 제거하고 드롭다운을 항상 표시. `actions?.map()`으로 action 버튼만 조건부 렌더링.

**영향 범위**: StatisticsTable을 사용하는 모든 곳. title이 있으면 무조건 복사 드롭다운 노출.

### Bug #2: `formatCellHtml` dead code

**증상**: HTML용 포맷 함수가 존재했으나, 모든 분기에서 `formatCellPlain`과 동일한 결과를 반환.

**원인**: 초기 설계에서 HTML 셀에 `<em>` 등 마크업을 넣을 계획이었으나, 실제로는 이탤릭은 헤더에만 적용 (본문 셀은 순수 텍스트).

**수정**: 삭제하고 `formatCellValue` 하나로 통합.

### Bug #3: 정수값 30 → `30.000`

**증상**: `n=30`, `df=15` 같은 정수가 `30.000`, `15.000`으로 표시됨.

**원인**: `number` 타입 일괄 `num.toFixed(3)` 적용.

**수정**: `isIntegerValue()` 함수 추가. `Number.isFinite(value) && Math.floor(value) === value` → 정수면 `String(num)`, 실수면 `num.toFixed(3)`.

**엣지 케이스**: `30.0`은 JavaScript에서 `30 === Math.floor(30)` → 정수로 판별됨. 이는 의도된 동작 (소수점 없이 표시).

### Bug #4 + #4': 그리스 기호 이탤릭 + 이중 래핑

**증상 (#4)**: `η²`, `χ²` 등 그리스 기호가 이탤릭 처리되지 않음.

**원인**: `\b` (word boundary)는 `\w`↔`\W` 전환점에서만 작동. 그리스 문자(η, χ, ω, ε)는 `\W`로 분류되므로, `\bη²\b`는 절대 매칭되지 않음.

**증상 (#4')**: 2-pass 방식으로 수정 시도 → `ηp²`가 `<em>ηp²</em>`로 래핑된 후, 2차 ASCII 패스에서 `\bp\b`가 내부 `p`를 재매칭 → `<em>η<em>p</em>²</em>`.

**근본 원인**: `η`는 `\W`, `²`도 `\W`이므로, `ηp²`에서 `p` 주변에 word boundary가 존재함.

**수정**: 단일 패스 결합 regex. 그리스 기호(리터럴)를 ASCII 기호(`\b` 래핑)보다 앞에 배치하여 `ηp²`가 `p`보다 먼저 매칭되도록 함.

**검증**: `ηp²` → `<em>ηp²</em>` (단일 `<em>`, 이중 래핑 없음)

### 2차 리뷰 (2026-03-12) — 보안 + APA 규칙 정합성

### Bug #A: XSS 취약점

**증상**: `title`, `col.header`, 셀 값이 HTML에 이스케이프 없이 삽입됨.

**원인**: `${title}`, `italicizeStats(col.header)`, `String(value)` — 모두 raw 삽입.

**위험**: CSV 컬럼명에 `<script>` 등이 포함되면 APA HTML에 전파. 단, 클립보드 HTML이 Word/Docs에서 스크립트 실행되는 경우는 극히 드물지만, 방어적 코딩 필요.

**수정**: 기존 `lib/utils/html-escape.ts`의 `escapeHtml()` 적용. title → `escapeHtml(title)`, header → `escapeHtml(col.header)` 후 `italicizeStats()`, 셀 값 → NaN/default fallback에서 `escapeHtml(value)`. 숫자 포맷 결과(`.032`, `12.345` 등)는 안전하므로 이스케이프 불필요.

### Bug #B: 이중 이탤릭 (APA 규칙 위반)

**증상**: `<th style="font-style:italic">` + `<em>n</em>` = 모든 헤더가 이탤릭 + 통계 기호도 이탤릭 → 이중 적용.

**APA 7th 규칙**: 컬럼 헤더 자체는 이탤릭이 아님. **통계 기호만** 이탤릭 (`M`, `SD`, `p`, `n`, `η²` 등). "집단", "항목" 같은 비통계 헤더는 일반체.

**Word 위험**: 일부 워드프로세서에서 italic parent 안의 `<em>`이 이탤릭을 **토글**(해제)할 수 있음 → 통계 기호가 오히려 일반체로 표시되는 역효과.

**수정**: `<th>`에서 `font-style:italic` 제거. `italicizeStats()`만으로 통계 기호에 `<em>` 적용.

### Bug #C: `column.align` 무시

**증상**: `col.type === 'text' ? 'left' : 'center'` 하드코딩. `column.align: 'right'` 등 명시적 설정 무시.

**수정**: `resolveAlign()` 헬퍼 추가. `col.align` 우선, 미설정 시 type 기반 기본값.

### Bug #D: `type` undefined 시 동작 불일치

**증상**: ResultsActionStep에서 type 미지정 컬럼 존재. `formatCellValue`는 `default` → `String(value)`, 정렬은 `center`.

**수정**: `resolveAlign()` 동일 로직으로 해결. type undefined인 컬럼은 `center` 정렬 + `escapeHtml(String(value))` 포맷.

---

## 6. 리뷰어에게 묻는 질문

### ~~보안~~ (2차 리뷰에서 해결됨)

1. ~~XSS 위험~~ → `escapeHtml()` 적용 완료. title, header, 셀 값 모두 이스케이프.

2. **클립보드 HTML의 XSS**: 클립보드에 쓰는 HTML이 Word/Docs에서 실행될 가능성은? (일반적으로 없지만, 확인 필요)

### 정확성

3. **APA `< .001` 표기**: 현재 `num < .001`로 판별. `p = .001` 정확히 일치하는 경우 `.001`로 표시되는가? → 현재 코드: `0.001 < 0.001`은 false → `.001`로 표시됨. 정확.

4. **소수점 3자리 고정**: APA는 대부분 소수점 2~3자리를 권장하지만, 통계량에 따라 다름 (예: Cohen's d는 2자리, p-value는 3자리). 현재 일괄 3자리 — 충분한가?

### 아키텍처

5. **`StatisticsTable` 의존성 방향**: `apa-table-formatter.ts` → `import type` (StatisticsTable) → 런타임 순환 없음. 구조적 커플링은 존재하나 허용 범위.

6. **`type?: 'custom'` 처리**: `formatCellValue`에서 `custom` → `default` → `escapeHtml(value)`. `column.formatter`는 React component 반환이므로 HTML string 생성에 사용 불가. **의도된 한계**.

7. ~~헤더의 이중 이탤릭~~ → 2차 리뷰에서 해결됨. `<th>`에서 `font-style:italic` 제거.

### 테스트

8. **border 검증이 너무 느슨**: `toContain('border-top:2px solid black')` — 요소 구분 안 함. 허용 가능한 수준 (현재 border-top은 `<th>`에만 적용됨).

9. **`>30<` 패턴의 취약성**: 현재 데이터 범위에서 OK. 강화하려면 regex 매칭 필요하나 과잉.

10. ~~Greek 이중 래핑 부정 테스트 없음~~ → 2차 리뷰에서 테스트 추가 완료 (`not.toContain('<em><em>')`, `not.toContain('<em>η<em>p</em>')`).

---

## 7. Word/Google Docs 호환성 체크리스트

| 항목 | Word | Google Docs | 비고 |
|------|------|------------|------|
| `border-collapse:collapse` | ✅ | ✅ | 필수 — 없으면 이중 테두리 |
| `border-top/bottom` inline | ✅ | ✅ | 클립보드 HTML 표준 |
| `font-family:Times New Roman` | ✅ | ⚠️ | Docs에서 가장 가까운 폰트로 대체될 수 있음 |
| `font-size:12pt` | ✅ | ✅ | |
| `<em>` on stat symbols only | ✅ | ✅ | 2차 리뷰: `<th>`에서 `font-style:italic` 제거, 통계 기호만 `<em>` |
| `<caption>` | ✅ | ❌ | Google Docs는 caption을 무시할 수 있음 |
| `text-align:right` on `<td>` (숫자) | ✅ | ✅ | APA: 소수점 정렬 근사 (right align) |
| `min-width:400px` | ✅ | ⚠️ | Docs에서 무시될 수 있음 |

---

## 8. 실행 방법

```bash
# 테스트 실행
cd stats
pnpm test __tests__/utils/apa-table-formatter.test.ts

# 타입 체크
node node_modules/typescript/bin/tsc --noEmit

# 실제 동작 확인 (브라우저)
# 1. 통계 분석 실행 → 결과 테이블의 복사 드롭다운 → "APA 서식 복사 (Word용)"
# 2. Word/Google Docs에 Ctrl+V
# 3. 3-line 테이블, 이탤릭 기호, p-value 서식 확인
```

---

## 9. 관련 파일 (참고용)

| 파일 | 역할 |
|------|------|
| `lib/statistics/formatters.ts` | StatisticsTable의 UI 렌더링용 포맷터 (APA와 별개) |
| `components/statistics/common/PValueBadge.tsx` | UI용 p-value 배지 (APA에서는 미사용) |
| `docs/IDEAS-PAPER-DRAFT-ENHANCEMENTS.md` | 전체 아이디어 문서 (Layer 0~4 로드맵) |
| `docs/PLAN-PAPER-DRAFT-GENERATION.md` | Layer 1 논문 초안 계획서 |
