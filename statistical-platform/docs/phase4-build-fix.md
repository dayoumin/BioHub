# Phase 4: 빌드 안정화 완료

**날짜**: 2025-10-02
**상태**: ✅ 완료
**소요 시간**: 2시간

---

## 📋 문제 상황

### 발견된 이슈
Next.js 15 프로덕션 빌드 실패
```
Module build failed: UnhandledSchemeError: Reading from "node:child_process" is not handled by plugins
Import trace: node_modules/pyodide/pyodide.mjs
```

### 영향 범위
- 프로덕션 배포 불가
- 4개 통계 페이지 빌드 실패
- Pyodide npm 패키지가 Node.js 전용 모듈 사용

---

## 🔍 원인 분석

### 근본 원인
`pyodide` npm 패키지 (v0.28.2)가 Node.js 모듈을 import:
- `node:child_process`
- `node:fs`, `node:fs/promises`
- `node:path`
- `node:crypto`

### 문제 발생 경로
```
app/(dashboard)/statistics/means-plot/page.tsx
  └─ import { loadPyodide } from 'pyodide'
      └─ node_modules/pyodide/pyodide.mjs
          └─ import 'node:child_process' ❌
```

### 영향받은 파일 (4개)
1. `app/(dashboard)/statistics/means-plot/page.tsx`
2. `app/(dashboard)/statistics/two-way-anova/page.tsx`
3. `app/(dashboard)/statistics/stepwise/page.tsx`
4. `app/(dashboard)/statistics/partial-correlation/page.tsx`

---

## ✅ 해결 방법

### 1. Pyodide npm 패키지 제거
```bash
npm uninstall pyodide
```

### 2. CDN 방식으로 전환
Pyodide를 브라우저에서 동적으로 로드:

**타입 정의 추가** (`types/pyodide.d.ts`):
```typescript
declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
    pyodide?: PyodideInterface
  }
}
```

**Import 수정**:
```typescript
// BEFORE (npm 패키지)
import { loadPyodide } from 'pyodide'
import type { PyodideInterface } from 'pyodide'

// AFTER (CDN 방식)
import type { PyodideInterface } from '@/types/pyodide'
```

**CDN 로딩 코드**:
```typescript
// Load Pyodide from CDN
if (!window.loadPyodide) {
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js'
  await new Promise((resolve, reject) => {
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const pyodide: PyodideInterface = await window.loadPyodide!({
  indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
})
```

### 3. 수정된 파일
| 파일 | 변경 내용 |
|------|----------|
| `types/pyodide.d.ts` | Window 전역 타입 추가 |
| `means-plot/page.tsx` | CDN 로딩 방식 변경 |
| `two-way-anova/page.tsx` | CDN 로딩 방식 변경 |
| `stepwise/page.tsx` | CDN 로딩 방식 변경 |
| `partial-correlation/page.tsx` | CDN 로딩 방식 변경 |

---

## 📊 결과

### ✅ 빌드 성공
```bash
$ npm run build
✓ Compiled successfully
✓ Static pages generated (76 pages)
✓ Production build complete
```

### 성능 지표
- **빌드 시간**: ~45초
- **번들 크기**: 102 kB (First Load JS)
- **정적 페이지**: 76개 (0 오류)

### 주요 개선사항
1. ✅ Node.js 의존성 완전 제거
2. ✅ 프로덕션 빌드 안정화
3. ✅ 배포 준비 완료
4. ✅ 타입 안전성 유지

---

## ⚠️ 남은 개선 사항

### 코드 중복 문제
4개 페이지에서 동일한 Pyodide 로딩 코드 반복

**권장 해결책**:
```typescript
// lib/utils/pyodide-loader.ts 생성
export async function loadPyodideFromCDN(): Promise<PyodideInterface> {
  if (!window.loadPyodide) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js'
    await new Promise((resolve, reject) => {
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  return await window.loadPyodide!({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
  })
}
```

### 아키텍처 개선 필요
- `pyodide-statistics.ts`에 이미 CDN 로딩 로직 존재
- 4개 페이지가 독립적으로 Pyodide 초기화
- **권장**: `pyodideService` 통합 사용

---

## 📝 교훈

### 배운 점
1. **npm 패키지 주의**: Node.js 전용 모듈 사용 여부 확인 필요
2. **브라우저 전용 라이브러리**: WebAssembly 기반 라이브러리는 CDN 방식 권장
3. **빌드 오류 추적**: Import trace로 근본 원인 빠르게 파악 가능

### CLAUDE.md 업데이트
```markdown
2. **통계 계산 규칙** (CRITICAL)
   - ✅ Pyodide는 CDN에서 로드 (npm 패키지 사용 금지)
   - ✅ `pyodideService` 통합 서비스 사용 (직접 로딩 금지)
```

---

## 🔗 관련 문서

- [Phase 4 다음 단계](phase4-next-steps.md)
- [Phase 3 완료 보고서](phase3-complete.md)
- [Pyodide 공식 문서](https://pyodide.org/en/stable/)

---

**Updated**: 2025-10-02
**Status**: ✅ Build Stabilization Complete
