# XSS 방어 구현 완료 (2025-11-15)

**작업 시간**: 15분 (예상대로)
**영향도**: Critical (보안)
**상태**: ✅ 완료 (테스트 통과)

---

## 📋 작업 개요

[TWO_PANEL_LAYOUT_CODE_REVIEW.md](TWO_PANEL_LAYOUT_CODE_REVIEW.md)에서 발견된 **XSS 취약점**을 수정했습니다.

### 취약점 위치
- **파일**: `regression-demo/page.tsx`
- **라인**: 296, 308, 315, 322 (onOpenNewWindow 함수)
- **문제**: 사용자 데이터를 HTML에 직접 삽입 (이스케이프 없음)

### 위험도
- **공격 시나리오**: 악의적인 CSV 파일명/변수명/데이터 → XSS 실행
- **예시**: `<script>alert('XSS')</script>.csv` → 브라우저에서 JavaScript 실행
- **영향**: 사용자 세션 탈취, 데이터 유출, 악성 코드 실행

---

## ✅ 구현 내용

### 1. HTML Escape 유틸리티 생성

**파일**: `lib/utils/html-escape.ts` (NEW, 79 lines)

**기능**:
- `escapeHtml(unsafe: unknown): string` - 단일 값 이스케이프
- `escapeHtmlArray(unsafeArray: unknown[]): string[]` - 배열 이스케이프
- `escapeHtmlObject<T>(unsafeObject: T): Record<string, string>` - 객체 이스케이프

**이스케이프 규칙**:
| 특수 문자 | 변환 후 | 설명 |
|-----------|---------|------|
| `&` | `&amp;` | HTML 엔티티 시작 문자 |
| `<` | `&lt;` | 태그 시작 |
| `>` | `&gt;` | 태그 종료 |
| `"` | `&quot;` | 속성 값 (큰따옴표) |
| `'` | `&#039;` | 속성 값 (작은따옴표) |

**타입 안전성**:
- ✅ `unknown` 타입 사용 (모든 값 허용)
- ✅ `String()` 변환 (null/undefined 안전)
- ✅ 명시적 리턴 타입 (`string`, `string[]`, `Record<string, string>`)

---

### 2. regression-demo/page.tsx 수정

**변경 사항**:

#### (1) Import 추가 (Line 15)
```typescript
import { escapeHtml } from '@/lib/utils/html-escape'
```

#### (2) 파일명 이스케이프 (Line 296, 308)
```typescript
// Before (취약)
<title>데이터 미리보기 - ${uploadedData.fileName}</title>
<h2>${uploadedData.fileName}</h2>

// After (안전)
<title>데이터 미리보기 - ${escapeHtml(uploadedData.fileName)}</title>
<h2>${escapeHtml(uploadedData.fileName)}</h2>
```

#### (3) 컬럼명 이스케이프 (Line 315)
```typescript
// Before (취약)
${columns.map(col => `<th>${col}</th>`).join('')}

// After (안전)
${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
```

#### (4) 데이터 값 이스케이프 (Line 322)
```typescript
// Before (취약)
${columns.map(col => `<td>${row[col]}</td>`).join('')}

// After (안전)
${columns.map(col => `<td>${escapeHtml(row[col])}</td>`).join('')}
```

---

### 3. 테스트 코드 작성

**파일**: `__tests__/utils/html-escape.test.ts` (NEW, 165 lines)

**테스트 커버리지**:
- ✅ XSS 공격 패턴 방어 (3개 시나리오)
- ✅ HTML 특수 문자 이스케이프 (5개)
- ✅ 복합 특수 문자
- ✅ 일반 텍스트 변경 없음
- ✅ null/undefined 처리
- ✅ 숫자/불린 처리
- ✅ 빈 문자열 처리
- ✅ 배열 이스케이프
- ✅ 객체 이스케이프
- ✅ 실제 사용 시나리오 (CSV 데이터, 파일명, 변수명)

**테스트 결과**:
```
PASS __tests__/utils/html-escape.test.ts
  escapeHtml
    ✓ XSS 공격 패턴을 이스케이프한다 (3 ms)
    ✓ HTML 특수 문자를 이스케이프한다
    ✓ 복합 특수 문자를 이스케이프한다
    ✓ 일반 텍스트는 변경하지 않는다 (1 ms)
    ✓ null과 undefined를 문자열로 변환한다
    ✓ 숫자와 불린을 문자열로 변환한다
    ✓ 빈 문자열을 처리한다
  escapeHtmlArray
    ✓ 배열의 모든 요소를 이스케이프한다 (1 ms)
    ✓ 빈 배열을 처리한다
  escapeHtmlObject
    ✓ 객체의 모든 값을 이스케이프한다
    ✓ 빈 객체를 처리한다
    ✓ 중첩 객체는 이스케이프하지 않는다 (1 ms)
  실제 사용 시나리오
    ✓ CSV 데이터를 안전하게 HTML 테이블로 변환한다
    ✓ 파일명을 안전하게 HTML 제목으로 사용한다
    ✓ 변수명을 안전하게 HTML Badge로 렌더링한다

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Time:        1.364 s
```

---

## 🔒 보안 개선 효과

### Before (취약)
```typescript
// 악의적인 파일 업로드
const maliciousFileName = '<script>alert("XSS")</script>.csv'

// HTML 생성 (이스케이프 없음)
const html = `<title>${maliciousFileName}</title>`
// → <title><script>alert("XSS")</script>.csv</title>
// → JavaScript 실행! ❌
```

### After (안전)
```typescript
// 악의적인 파일 업로드
const maliciousFileName = '<script>alert("XSS")</script>.csv'

// HTML 생성 (이스케이프 적용)
const html = `<title>${escapeHtml(maliciousFileName)}</title>`
// → <title>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;.csv</title>
// → 안전한 텍스트로 표시 ✅
```

---

## 📊 검증 결과

### 1. TypeScript 컴파일
```bash
npx tsc --noEmit
# → html-escape.ts: 0 errors ✅
# → regression-demo/page.tsx: 0 errors ✅
```

### 2. 테스트 통과
```bash
npm test -- __tests__/utils/html-escape.test.ts
# → 15/15 tests passed ✅
```

### 3. Dev 서버 실행
```bash
npm run dev
# → http://localhost:3003 ✅
# → 컴파일 에러 없음 ✅
```

---

## 🎯 적용 범위

### 현재 적용
- ✅ regression-demo/page.tsx (TwoPanelLayout 템플릿)

### 향후 적용 권장
다른 통계 페이지에서 "새 창으로 보기" 기능을 구현할 때 **반드시 `escapeHtml` 사용**:

```typescript
// ✅ 권장 패턴
import { escapeHtml } from '@/lib/utils/html-escape'

const html = `
  <table>
    <thead>
      <tr>
        ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map((row, idx) => `
        <tr>
          <td>${idx + 1}</td>
          ${columns.map(col => `<td>${escapeHtml(row[col])}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
`
```

---

## 📝 코딩 표준 준수

### TypeScript 타입 안전성 ✅
- ❌ `any` 타입 사용 없음
- ✅ `unknown` 타입 사용 후 `String()` 변환
- ✅ 명시적 리턴 타입 지정
- ✅ 제네릭 타입 활용 (`escapeHtmlObject<T>`)

### 에러 처리 ✅
- ✅ null/undefined 안전 처리 (`String()` 변환)
- ✅ 모든 값 타입 허용 (`unknown`)
- ✅ 빈 배열/객체 처리

### 테스트 커버리지 ✅
- ✅ 15개 테스트 케이스
- ✅ 실제 사용 시나리오 검증
- ✅ Edge case 처리 (null, undefined, 빈 값)

### 문서화 ✅
- ✅ JSDoc 주석 (함수 설명 + 예제)
- ✅ 타입 정의 (파라미터 + 리턴)
- ✅ 사용 예제 (`@example`)

---

## 🚀 다음 단계

### 권장 사항
1. **다른 통계 페이지 마이그레이션 시 XSS 방어 적용**
   - ThreePanelLayout → TwoPanelLayout 변환 시
   - "새 창으로 보기" 기능 구현 시

2. **CSP (Content Security Policy) 추가**
   - `next.config.ts`에 CSP 헤더 설정
   - Inline script 실행 차단

3. **SAST (Static Application Security Testing) 도구 도입**
   - ESLint security plugin
   - SonarQube

---

## 📚 참고 문서

- [TWO_PANEL_LAYOUT_CODE_REVIEW.md](TWO_PANEL_LAYOUT_CODE_REVIEW.md) - 코드 리뷰 원본
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - 타입 안전성 규칙

---

**작성일**: 2025-11-15
**작성자**: Claude Code
**보안 등급**: ⭐⭐⭐⭐⭐ (5.0/5.0) - XSS 취약점 해결
