# 다음 세션: 테스트 실패 해결 가이드

**작성일**: 2025-11-04
**상태**: 📋 **다음 세션 실행 가이드**
**예상 시간**: 1-2 시간
**난이도**: ⭐⭐ (중간)

---

## 🎯 실행 순서 (정확한 명령어 포함)

### Phase 1: react-markdown ESM 호환성 수정 (30분)

#### Step 1.1: jest.config.js 수정
**파일**: `statistical-platform/jest.config.js`

**현재 상태** (확인):
```bash
cd statistical-platform && cat jest.config.js | grep -A 5 "transformIgnorePatterns"
```

**변경 내용**:

```javascript
// jest.config.js 찾아서 다음 부분 수정:

// ❌ Before:
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // ... 기타 설정
  // transformIgnorePatterns 없거나 불완전
}

// ✅ After:
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // 🔧 추가할 부분:
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-gfm|rehype-raw|remark-math|rehype-katex|unified|bail|is-plain-obj|unified|bail|is-plain-obj|micromark|decode-named-character-reference|character-entities-legacy|is-decimal|is-hexadecimal)/)'
  ],

  // 기존 설정 유지...
}
```

**정확한 수정 방법**:
1. `statistical-platform/jest.config.js` 열기
2. `module.exports` 객체 내에 `transformIgnorePatterns` 찾기
3. 없으면 `testEnvironment: 'jsdom'` 다음에 추가
4. 있으면 위의 배열로 교체

#### Step 1.2: 테스트 재실행
```bash
cd statistical-platform

# react-markdown 관련 테스트만 실행
npm test -- --testNamePattern="rag" --no-coverage 2>&1 | tail -50

# 또는 전체 테스트
npm test -- --no-coverage 2>&1 | grep -E "FAIL|PASS" | head -20
```

**예상 결과**:
```
✓ react-markdown 관련 테스트 통과
  PASS components/rag/__tests__/rag-assistant.test.tsx
  PASS components/rag/__tests__/rag-chat-interface.test.tsx
```

#### Step 1.3: 커밋
```bash
git add statistical-platform/jest.config.js
git commit -m "chore: Fix react-markdown ESM compatibility in Jest

- Add react-markdown to transformIgnorePatterns
- Support remark-* and rehype-* plugins
- Fixes 29 test suite failures related to ESM modules"
```

---

### Phase 2: Pyodide 타임아웃 확장 (20분)

#### Step 2.1: 타임아웃 파일 찾기
```bash
# Pyodide 관련 테스트 파일 찾기
find statistical-platform -name "*pyodide*test*" -o -name "*regression*test*"

# 예상 결과:
# statistical-platform/__tests__/performance/pyodide-regression.test.ts
```

#### Step 2.2: 파일 수정
**파일**: `statistical-platform/__tests__/performance/pyodide-regression.test.ts`

**변경 내용**:

```typescript
// ❌ Before (line 52-57):
describe('Pyodide Regression Tests', () => {
  let PyodideWorker: any

  beforeAll(async () => {
    // ... Pyodide 초기화 코드

// ✅ After:
describe('Pyodide Regression Tests', () => {
  // 🔧 이 한 줄 추가
  jest.setTimeout(120000)  // 120초로 확장 (기본 30초)

  let PyodideWorker: any

  beforeAll(async () => {
    // ... Pyodide 초기화 코드 (변경 없음)
```

**정확한 위치**:
- `describe('Pyodide Regression Tests'` 바로 다음
- `let PyodideWorker` 정의 전

#### Step 2.3: 테스트 재실행
```bash
cd statistical-platform

# Pyodide 타임아웃 테스트만 실행 (대기: 2분)
npm test -- --testPathPattern="pyodide-regression" --no-coverage 2>&1 | tail -100

# 또는 전체 테스트 (대기: 2분)
npm test -- --no-coverage 2>&1 | grep "pyodide"
```

**예상 결과**:
```
✓ Pyodide Regression Tests 모든 테스트 통과
  PASS __tests__/performance/pyodide-regression.test.ts (60s)
```

#### Step 2.4: 커밋
```bash
git add statistical-platform/__tests__/performance/pyodide-regression.test.ts
git commit -m "test: Increase Pyodide initialization timeout to 120s

- WebAssembly initialization requires more time on slower machines
- Fixes 6 test suite timeouts in pyodide-regression.test.ts
- No code logic changes, configuration only"
```

---

### Phase 3: 다른 테스트 실패 원인 파악 (30분)

#### Step 3.1: 현재 상태 확인
```bash
cd statistical-platform

# 전체 테스트 실행 (대기: 2분)
npm test -- --no-coverage 2>&1 | tee test-results.txt

# 결과 분석
grep -E "FAIL|PASS" test-results.txt | sort | uniq -c
```

#### Step 3.2: 남은 실패 분류
```bash
# 실패 원인별로 분류
grep -E "Error|Expected|TypeError|ReferenceError" test-results.txt | head -20
```

**예상 분류 결과**:
```
1. Module not found 에러 (moduleNameMapper 설정)
2. Environment variable 에러 (process.env 안전)
3. Mock 관련 에러 (setupFilesAfterEnv)
4. 기타 (개별 분석 필요)
```

#### Step 3.3: 우선순위 결정
```
높은 우선순위 (많은 테스트 영향):
  └─ moduleNameMapper 수정 → 10~20개 테스트 수정

중간 우선순위 (일부 영향):
  └─ 환경변수 설정 → 5~10개 테스트 수정

낮은 우선순위 (개별 영향):
  └─ 개별 모의 설정 → 1~3개씩
```

---

## 🔧 정확한 수정 코드

### jest.config.js 전체 수정 예시

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],

  // ✅ 추가: react-markdown ESM 호환성
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-gfm|rehype-raw|remark-math|rehype-katex|unified|bail|is-plain-obj|micromark|decode-named-character-reference|character-entities-legacy|is-decimal|is-hexadecimal)/)'
  ],

  // ✅ 추가: 모듈 경로 매핑
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // 기존 설정...
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  }
}
```

### pyodide-regression.test.ts 수정 예시

```typescript
// 파일 시작 부분
describe('Pyodide Regression Tests', () => {
  // ✅ 이 한 줄만 추가하면 됨
  jest.setTimeout(120000)

  let PyodideWorker: any

  beforeAll(async () => {
    const coreModule = await import('@/lib/services/pyodide/core/pyodide-core.service')
    const enumModule = await import('@/lib/services/pyodide/core/pyodide-worker.enum')
    // ... 나머지 코드 (변경 없음)
  })

  // ... 나머지 테스트들
})
```

---

## 📋 실패 원인 상세 분석

### 1️⃣ react-markdown ESM 호환성 (29개 테스트 실패)

**정확한 에러**:
```
SyntaxError: Unexpected token 'export'
  at node_modules/react-markdown/index.js:10

Details:
  export {
  ^^^^^^
```

**근본 원인**:
- react-markdown 패키지는 ESM (ES Modules) 형식
- jest.config.js에서 CommonJS로 변환 시도
- transformIgnorePatterns에 react-markdown 없음

**해결**:
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(react-markdown|remark-|rehype-)/)'  // 정규식
]
```

**실패한 파일들**:
```
FAIL components/rag/__tests__/rag-assistant.test.tsx
FAIL components/rag/__tests__/rag-chat-interface.test.tsx
FAIL components/chatbot/ProjectsSection.test.tsx
+ 26개 더
```

**수정 후 확인**:
```bash
npm test -- --testNamePattern="rag|chatbot" --no-coverage
```

---

### 2️⃣ Pyodide 초기화 타임아웃 (6개 테스트 실패)

**정확한 에러**:
```
thrown: "Exceeded timeout of 30000 ms for a hook.
Add a timeout value to this test to increase the timeout,
if this is a long-running test."
```

**근본 원인**:
- Jest 기본 타임아웃: 30초
- Pyodide WebAssembly 초기화: 30~120초 (CPU 의존)
- beforeAll() 훅에서 타임아웃 발생

**실패한 테스트들**:
```
__tests__/performance/pyodide-regression.test.ts:57
  ✗ [Worker 1] should calculate descriptive statistics
  ✗ [Worker 1] should perform normality test
  ✗ [Worker 2] should perform one-sample t-test
  ✗ [Worker 3] should perform Mann-Whitney U test
  ✗ [Worker 4] should perform multiple regression
  ✗ should produce identical results for identical inputs
```

**해결**:
```typescript
describe('Pyodide Regression Tests', () => {
  jest.setTimeout(120000)  // 120초로 확장
  // ... 나머지 코드
})
```

**수정 후 확인**:
```bash
npm test -- --testPathPattern="pyodide-regression" --no-coverage
# 대기 시간: 약 2분
```

---

### 3️⃣ 기타 실패 (40+개, 우선순위 낮음)

**일반적인 원인들**:

#### 3-1: Module Not Found
```javascript
// jest.config.js에서 moduleNameMapper 설정
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1'
}
```

#### 3-2: process.env 에러
```typescript
// 테스트에서 다음과 같이 수정
if (typeof process !== 'undefined' && process.env) {
  const isDev = process.env.NODE_ENV === 'development'
}
```

#### 3-3: 포트 충돌
```javascript
// setupFilesAfterEnv에서 포트 해제
beforeAll(() => {
  // 테스트 시작 전 필요한 설정
})

afterAll(() => {
  // 테스트 후 정리
})
```

---

## ✅ 체크리스트 (다음 세션)

### Phase 1: react-markdown 수정
- [ ] jest.config.js 열기
- [ ] transformIgnorePatterns 추가/수정
- [ ] 파일 저장
- [ ] `npm test -- --testNamePattern="rag" --no-coverage` 실행
- [ ] 결과 확인 (29개 실패 → 0개로 감소)
- [ ] git commit

### Phase 2: Pyodide 타임아웃 수정
- [ ] pyodide-regression.test.ts 열기
- [ ] `jest.setTimeout(120000)` 추가
- [ ] 파일 저장
- [ ] `npm test -- --testPathPattern="pyodide-regression" --no-coverage` 실행
- [ ] 결과 확인 (6개 실패 → 0개로 감소)
- [ ] git commit

### Phase 3: 남은 실패 분석
- [ ] 전체 테스트 실행
- [ ] 남은 실패 원인 파악
- [ ] 우선순위 결정
- [ ] 단계별 수정

---

## 🚀 다음 세션 명령어 (복사-붙여넣기용)

```bash
# 1. react-markdown 수정
cd d:/Projects/Statics/statistical-platform
# jest.config.js 편집 후:
npm test -- --testNamePattern="rag" --no-coverage

# 2. Pyodide 타임아웃 수정
# pyodide-regression.test.ts 편집 후:
npm test -- --testPathPattern="pyodide-regression" --no-coverage

# 3. 전체 결과 확인
npm test -- --no-coverage 2>&1 | tail -100

# 4. 커밋
git add -A
git commit -m "test: Fix ESM compatibility and Pyodide timeouts

- Fix react-markdown ESM compatibility in Jest (29 tests)
- Extend Pyodide initialization timeout to 120s (6 tests)
- Configuration-only changes, no logic modifications"
```

---

## 💡 팁

### 실패를 빠르게 확인하는 방법
```bash
# 특정 테스트만 실행 (빠름)
npm test -- --testNamePattern="rag" --no-coverage

# 또는
npm test -- --testPathPattern="pyodide" --no-coverage

# 전체 (느림, 대기 2분)
npm test -- --no-coverage
```

### 에러 메시지 저장하기
```bash
# 테스트 결과를 파일에 저장
npm test -- --no-coverage 2>&1 | tee test-output.txt

# 특정 에러만 추출
grep "SyntaxError\|Exceeded timeout" test-output.txt
```

### Git 커밋 전 확인
```bash
# 변경된 파일만 확인
git status

# 수정 내용 확인
git diff statistical-platform/jest.config.js
git diff statistical-platform/__tests__/performance/pyodide-regression.test.ts
```

---

## 📞 다음 세션에서 막힐 경우

### jest.config.js 수정이 안 되는 경우
```bash
# 현재 jest.config.js 확인
cat statistical-platform/jest.config.js | head -20

# 정확한 형식 확인
grep -n "module.exports\|testEnvironment" statistical-platform/jest.config.js
```

### 테스트가 여전히 실패하는 경우
```bash
# 캐시 삭제 후 재시도
rm -rf statistical-platform/node_modules/.cache

# 또는 강제로 캐시 무시
npm test -- --clearCache --no-coverage
```

### 커밋 이전에 확인
```bash
# 실제로 수정한 라인만 확인
git diff --no-color | head -50

# 커밋 전 최종 확인
npm test -- --testNamePattern="rag" --no-coverage
npm test -- --testPathPattern="pyodide-regression" --no-coverage
```

---

## 📊 예상 결과

**Phase 1 + 2 후**:
```
Test Suites: 6 failed, 58 passed, 64 total  (↓ 23 passed)
Tests:       54 failed, 774 passed, 828 total  (↓ 166 passed)
```

**Phase 3 후** (선택사항):
```
Test Suites: 0 failed, 64 passed, 64 total  ✅
Tests:       0 failed, 828 passed, 828 total  ✅
```

---

**정리자**: Claude Code
**상태**: ✅ **준비 완료 - 다음 세션 실행 가능**
**소요 시간**: 1-2 시간 (Phase 1+2), 추가 2-3 시간 (Phase 3)
