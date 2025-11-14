# Worker 테스트 한계 분석 및 해결 방안

**날짜**: 2025-11-14
**문제**: handleInit 호출 경로 회귀 방지 불가
**결론**: Jest 한계 인정 + 브라우저 통합 테스트 필수

---

## 🚨 근본적 문제

### **현재 테스트의 한계**

```typescript
// pyodide-worker.ts (Line 238)
await registerHelpersModule(pyodide, helpersCode)

// ❌ 이 줄을 제거해도 pyodide-init-logic.test.ts는 통과
// 왜? registerHelpersModule 함수 자체만 테스트하기 때문
```

**pyodide-init-logic.test.ts**는:
- ✅ `registerHelpersModule` **함수 로직** 검증 (함수 내부 변경 감지)
- ❌ `handleInit`이 `registerHelpersModule`을 **호출하는지** 검증 못함 (호출 경로 누락 감지 불가)

---

## 📊 테스트 커버리지 분석

### **현재 Jest 테스트가 잡는 것**

| 시나리오 | 감지 가능 | 테스트 파일 |
|---------|---------|-----------|
| `registerHelpersModule` 함수 내부에서 `FS.writeFile` 제거 | ✅ **가능** | pyodide-init-logic.test.ts |
| `registerHelpersModule` 함수 내부에서 `runPythonAsync` 제거 | ✅ **가능** | pyodide-init-logic.test.ts |
| `getAdditionalPackages(3)`에서 `statsmodels` 제거 | ✅ **가능** | pyodide-init-logic.test.ts |
| `getWorkerFileName(1)` 반환값 변경 | ✅ **가능** | pyodide-init-logic.test.ts |

### **현재 Jest 테스트가 못 잡는 것**

| 시나리오 | 감지 가능 | 이유 |
|---------|---------|------|
| `handleInit`에서 `registerHelpersModule` 호출 제거 | ❌ **불가** | Worker 실행 경로 테스트 못함 |
| `handleInit`에서 `fetch('/workers/python/helpers.py')` 제거 | ❌ **불가** | Worker 실행 경로 테스트 못함 |
| `handleLoadWorker`에서 `getAdditionalPackages` 호출 제거 | ❌ **불가** | Worker 실행 경로 테스트 못함 |
| Worker 3 로드 시 `loadPackage` 호출 안 함 | ❌ **불가** | Worker 실행 경로 테스트 못함 |

---

## 🎯 왜 Jest로 Worker 테스트가 안 되는가?

### **1. Web Worker 아키텍처**

```typescript
// pyodide-worker.ts는 별도 스레드에서 실행
/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope

// 메인 스레드와 분리됨
// - import 불가
// - 직접 함수 호출 불가
// - postMessage로만 통신
```

### **2. Jest/jsdom 한계**

```javascript
// Jest는 Node.js 환경
// jsdom은 Worker API를 제한적으로만 지원
// - new Worker() 작동 안 함
// - importScripts() 작동 안 함
// - postMessage/onmessage만 Mock 가능
```

### **3. Mock의 근본적 한계**

```typescript
// ❌ Mock으로는 호출 경로 검증 불가
const mockWorker = {
  postMessage: jest.fn(),
  onmessage: null
}

// 이렇게 해도 handleInit이 실제로 실행되지 않음
mockWorker.postMessage({ type: 'init' })

// handleInit 내부의 registerHelpersModule 호출 여부를 알 수 없음
```

---

## ✅ 실제 가능한 테스트 수준

### **Level 1: 함수 로직 검증** (현재 pyodide-init-logic.test.ts)

```typescript
// ✅ 가능: 함수 내부 로직 변경 감지
import { registerHelpersModule } from '@/lib/services/pyodide/core/pyodide-init-logic'

it('should call FS.writeFile', async () => {
  const spy = jest.fn()
  mockPyodide.FS.writeFile = spy

  await registerHelpersModule(mockPyodide, 'code')

  expect(spy).toHaveBeenCalledWith('/helpers.py', 'code')
})

// ✅ 이 테스트는 registerHelpersModule 함수 내부에서
//    FS.writeFile 호출을 제거하면 실패
```

**장점**: 함수 로직 변경 즉시 감지
**단점**: handleInit이 이 함수를 호출하는지는 모름

---

### **Level 2: Worker 실행 경로 검증** (브라우저 필수)

```typescript
// ❌ Jest 불가능, ✅ Playwright 가능
test('Worker should call registerHelpersModule', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/statistics/cluster')

  // Worker 로그 모니터링
  const logs = []
  page.on('console', msg => {
    if (msg.text().includes('[PyodideWorker]')) {
      logs.push(msg.text())
    }
  })

  await page.waitForTimeout(5000)

  // handleInit이 실제로 registerHelpersModule을 호출했는지 확인
  expect(logs).toContain('[PyodideWorker] ✓ helpers.py loaded and registered')
})

// ✅ 이 테스트는 handleInit에서 registerHelpersModule 호출을 제거하면 실패
```

**장점**: 실제 실행 경로 검증
**단점**: 브라우저 환경 필요 (느림, 설정 복잡)

---

## 🔧 현실적인 해결 방안

### **Option 1: Jest + Playwright 조합** (권장)

#### **Jest**: 함수 로직 검증 (빠름)
```typescript
// pyodide-init-logic.test.ts
✅ registerHelpersModule 함수 로직
✅ getAdditionalPackages 함수 로직
✅ getWorkerFileName 함수 로직
```

**회귀 방지**: 함수 내부 로직 변경 감지

#### **Playwright**: Worker 실행 경로 검증 (느림)
```typescript
// e2e/pyodide-worker.spec.ts
✅ handleInit이 registerHelpersModule 호출하는지
✅ Worker 3가 statsmodels를 로드하는지
✅ helpers.py import 성공하는지
```

**회귀 방지**: 함수 호출 누락 감지

---

### **Option 2: 문서화 + 수동 테스트**

#### **코드 리뷰 체크리스트**
```markdown
## handleInit 수정 시 확인 사항

- [ ] registerHelpersModule 호출 유지
- [ ] fetch('/workers/python/helpers.py') 유지
- [ ] loadPackage(['numpy', 'scipy']) 유지
- [ ] 브라우저 Console 확인: "[PyodideWorker] ✓ helpers.py loaded and registered"
```

#### **브라우저 통합 테스트 가이드**
```markdown
## 수동 테스트 절차

1. http://localhost:3000/dashboard/statistics/cluster 접속
2. Console 확인:
   - "[PyodideWorker] ✓ helpers.py loaded and registered"
   - "[PyodideWorker] ✓ Worker3 loaded"
3. Cluster Analysis 실행 → 에러 없음
4. Factor Analysis 실행 → 에러 없음
```

---

## 📊 최종 테스트 전략

### **현재 구조**

| 테스트 레벨 | 도구 | 검증 내용 | 회귀 방지 |
|-----------|------|---------|----------|
| **Level 1: 함수 로직** | Jest | registerHelpersModule 내부 | ✅ 높음 |
| **Level 2: 실행 경로** | 브라우저 | handleInit → registerHelpersModule | ❌ 없음 (수동) |

### **이상적인 구조** (Playwright 도입 시)

| 테스트 레벨 | 도구 | 검증 내용 | 회귀 방지 |
|-----------|------|---------|----------|
| **Level 1: 함수 로직** | Jest | registerHelpersModule 내부 | ✅ 높음 |
| **Level 2: 실행 경로** | Playwright | handleInit → registerHelpersModule | ✅ 높음 |

---

## 🎯 결론

### **달성한 것**
1. ✅ **함수 로직 회귀 방지**: `registerHelpersModule` 내부 변경 감지
2. ✅ **테스트 구조 개선**: Mock 제거, 실제 함수 import
3. ✅ **코드 품질 향상**: Worker 로직 추출 (pyodide-init-logic.ts)

### **못 달성한 것**
1. ❌ **실행 경로 회귀 방지**: `handleInit`에서 함수 호출 누락 감지
2. ❌ **자동화된 통합 테스트**: Worker 실행 검증

### **한계 인식**
- Jest는 Web Worker 완전 테스트 불가능 (기술적 한계)
- handleInit 호출 경로는 브라우저 환경에서만 검증 가능

### **보완책**
1. **문서화**: 브라우저 통합 테스트 가이드 작성
2. **코드 리뷰**: handleInit 수정 시 체크리스트
3. **향후 도입**: Playwright E2E 테스트 (권장)

---

## 📝 관련 문서

1. [pyodide-init-logic.test.ts](statistical-platform/__tests__/pyodide/pyodide-init-logic.test.ts) - 함수 로직 테스트
2. [pyodide-worker-integration.test.ts](statistical-platform/__tests__/pyodide/pyodide-worker-integration.test.ts) - 통합 테스트 가이드
3. [FINAL_CODE_REVIEW_SUMMARY.md](FINAL_CODE_REVIEW_SUMMARY.md) - 브라우저 테스트 절차
4. [PYODIDE_TEST_REFACTORING_SUMMARY.md](PYODIDE_TEST_REFACTORING_SUMMARY.md) - 리팩토링 과정

---

**작성일**: 2025-11-14
**작성자**: Claude Code
**현재 테스트**: Jest 56/56 통과 (함수 로직만)
**누락**: Worker 실행 경로 검증 (브라우저 필요)
**권장**: Playwright E2E 테스트 도입
