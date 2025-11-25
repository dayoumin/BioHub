# Design System 메타데이터 동기화 규칙

**목적**: AI-Native Design System 메타데이터를 코드 변경 시 자동으로 동기화하여 드리프트 방지

**작성일**: 2025-11-24
**최종 수정**: 2025-11-24
**대상**: Claude Code AI, 개발자

---

## 📋 목차

1. [개요](#개요)
2. [트리거 파일 및 대응 메타데이터](#트리거-파일-및-대응-메타데이터)
3. [업데이트 체크리스트](#업데이트-체크리스트)
4. [예제: Before/After](#예제-beforeafter)
5. [자동화 도구](#자동화-도구)

---

## 1. 개요

### 문제 인식
- 코드는 변경되지만 Design System 메타데이터는 수동 업데이트 필요
- AI가 트리거 파일 수정 시 메타데이터 업데이트를 잊으면 **드리프트 발생**
- 사용자가 Design System을 참조하면 오래된 정보 노출

### 해결 방안
**이 문서의 규칙을 CLAUDE.md에 링크**하여 AI가 항상 확인하도록 함

### 메타데이터 위치
```
statistical-platform/app/(dashboard)/design-system/
├── metadata/
│   ├── type-guards.json              (18개 타입 가드 함수)
│   ├── rag-components.json           (9개 RAG 컴포넌트 + 서비스)
│   ├── statistics-page-pattern.json  (통계 페이지 코딩 표준)
│   └── test-snippets.json            (12개 테스트 패턴)
├── sections/
│   ├── TypeGuardsSection.tsx
│   ├── RAGComponentsSection.tsx
│   ├── StatisticsPagePatternSection.tsx
│   └── TestSnippetsSection.tsx
└── page.tsx (메인 페이지, NODE_ENV 체크)
```

---

## 2. 트리거 파일 및 대응 메타데이터

### 트리거 1: Type Guards

**파일**: `lib/utils/type-guards.ts`

**메타데이터**: `metadata/type-guards.json`

**업데이트 조건**:
- ✅ 새 타입 가드 함수 추가 시
- ✅ 함수 시그니처 변경 시
- ✅ 함수 목적/사용 예제 변경 시
- ✅ Best Practice 발견 시

**업데이트 필드**:
```json
{
  "lastUpdated": "2025-11-24",  // 항상 업데이트
  "categories": [
    {
      "functions": [
        {
          "name": "isRecord",
          "signature": "function isRecord(...)",
          "purpose": "객체 타입 가드",
          "example": "if (isRecord(data)) { ... }",
          "returns": "boolean"
        }
      ]
    }
  ]
}
```

---

### 트리거 2: RAG Components

**파일**:
- `components/rag/*.tsx`
- `lib/rag/*.ts`
- `docs/RAG_ARCHITECTURE.md`

**메타데이터**: `metadata/rag-components.json`

**업데이트 조건**:
- ✅ 새 RAG 컴포넌트 추가 시
- ✅ 컴포넌트 Props 변경 시
- ✅ 새 서비스/유틸리티 추가 시
- ✅ 아키텍처 변경 시 (레이어, 데이터 흐름)

**업데이트 필드**:
```json
{
  "lastUpdated": "2025-11-24",
  "categories": [
    {
      "name": "Core RAG Components",
      "components": [
        {
          "name": "RAGAssistantCompact",
          "path": "components/rag/rag-assistant-compact.tsx",
          "props": {
            "method": "string (선택)",
            "className": "string (선택)"
          },
          "features": [...],
          "usage": "..."
        }
      ]
    }
  ],
  "architecture": {
    "diagram": "...",
    "layers": [...]
  }
}
```

---

### 트리거 3: Statistics Page Pattern

**파일**:
- `docs/STATISTICS_CODING_STANDARDS.md`
- `docs/TROUBLESHOOTING_ISANALYZING_BUG.md`
- `hooks/use-statistics-page.ts`

**메타데이터**: `metadata/statistics-page-pattern.json`

**업데이트 조건**:
- ✅ 새 필수 규칙 추가 시 (mandatory rules)
- ✅ 새 Critical Bug 발견 시
- ✅ 템플릿 코드 변경 시 (constants-dev.ts)
- ✅ API 변경 시 (hooks, utilities, types)

**업데이트 필드**:
```json
{
  "lastUpdated": "2025-11-24",
  "mandatoryRules": [
    {
      "id": "use-statistics-page-hook",
      "rule": "useStatisticsPage Hook 사용 필수",
      "correct": "...",
      "forbidden": "...",
      "severity": "critical"
    }
  ],
  "criticalBugs": [
    {
      "name": "isAnalyzing 상태 누락",
      "symptom": "...",
      "cause": "...",
      "fix": "..."
    }
  ]
}
```

---

### 트리거 4: Test Snippets

**파일**: `__tests__/**/*.test.{ts,tsx}`

**메타데이터**: `metadata/test-snippets.json`

**업데이트 조건**:
- ✅ 새 테스트 패턴 발견 시 (특히 반복 사용되는 패턴)
- ✅ Best Practice 발견 시
- ✅ 자주 발생하는 에러 발견 시

**업데이트 필드**:
```json
{
  "lastUpdated": "2025-11-24",
  "categories": [
    {
      "name": "React Component Tests",
      "patterns": [
        {
          "name": "기본 렌더링 테스트",
          "purpose": "...",
          "code": "...",
          "keywords": ["render", "screen"]
        }
      ]
    }
  ],
  "bestPractices": [...],
  "commonErrors": [...]
}
```

---

## 3. 업데이트 체크리스트

### AI 워크플로우

**Step 1: 파일 수정 감지**
```typescript
// AI 내부 로직 (개념적)
const TRIGGERS = {
  'lib/utils/type-guards.ts': 'metadata/type-guards.json',
  'components/rag/*.tsx': 'metadata/rag-components.json',
  'lib/rag/*.ts': 'metadata/rag-components.json',
  'docs/STATISTICS_CODING_STANDARDS.md': 'metadata/statistics-page-pattern.json',
  'hooks/use-statistics-page.ts': 'metadata/statistics-page-pattern.json',
  '__tests__/**/*.test.tsx': 'metadata/test-snippets.json'
};

if (modifiedFile matches TRIGGERS) {
  console.log('⚠️ Design System Update Required');
  // 다음 단계 진행
}
```

**Step 2: 메타데이터 업데이트**
1. **Read** 트리거 파일 (전체 또는 변경 부분)
2. **Read** 대응 메타데이터 JSON
3. **Edit** 메타데이터 JSON:
   - `lastUpdated` 필드 업데이트 (필수)
   - 관련 필드 추가/수정 (함수, 컴포넌트, 규칙 등)
4. **사용자에게 보고**: "메타데이터 업데이트 완료"

**Step 3: 검증**
```bash
# TypeScript 체크
cd statistical-platform
npx tsc --noEmit

# 개발 서버 확인
npm run dev
# → http://localhost:3000/design-system
```

---

## 4. 예제: Before/After

### 예제 1: 새 타입 가드 함수 추가

**Before** (`lib/utils/type-guards.ts`):
```typescript
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
```

**After** (새 함수 추가):
```typescript
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// ✅ 새 함수
export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
```

**메타데이터 업데이트** (`metadata/type-guards.json`):
```json
{
  "lastUpdated": "2025-11-24",  // ✅ 날짜 업데이트
  "categories": [
    {
      "name": "Basic Type Guards",
      "functions": [
        {
          "name": "isRecord",
          "signature": "function isRecord(value: unknown): value is Record<string, unknown>",
          "purpose": "객체 타입 가드 (배열 제외)",
          "example": "if (isRecord(data)) { ... }"
        },
        {
          "name": "isNumeric",
          "signature": "function isNumeric(value: unknown): value is number",
          "purpose": "숫자 타입 가드 (NaN, Infinity 제외)",
          "example": "if (isNumeric(value)) { ... }"
        },
        // ✅ 새 함수 추가
        {
          "name": "isValidEmail",
          "signature": "function isValidEmail(value: unknown): value is string",
          "purpose": "이메일 형식 검증 타입 가드",
          "example": "if (isValidEmail(input)) {\n  sendEmail(input);\n}",
          "returns": "value가 유효한 이메일 형식인지 여부"
        }
      ]
    }
  ]
}
```

---

### 예제 2: RAG 컴포넌트 Props 변경

**Before** (`components/rag/rag-assistant-compact.tsx`):
```typescript
interface RAGAssistantCompactProps {
  method?: string;
  className?: string;
}
```

**After** (새 Prop 추가):
```typescript
interface RAGAssistantCompactProps {
  method?: string;
  className?: string;
  onSessionChange?: (sessionId: string) => void;  // ✅ 새 Prop
}
```

**메타데이터 업데이트** (`metadata/rag-components.json`):
```json
{
  "lastUpdated": "2025-11-24",
  "categories": [
    {
      "name": "Core RAG Components",
      "components": [
        {
          "name": "RAGAssistantCompact",
          "props": {
            "method": "string (선택) - 현재 통계 메서드",
            "className": "string (선택) - 스타일 클래스",
            "onSessionChange": "((sessionId: string) => void) (선택) - 세션 변경 콜백"  // ✅ 추가
          }
        }
      ]
    }
  ]
}
```

---

### 예제 3: Critical Bug 발견

**Before**: 새 버그 발견 없음

**After**: Runs Test에서 median 계산 버그 발견

**메타데이터 업데이트** (`metadata/statistics-page-pattern.json`):
```json
{
  "lastUpdated": "2025-11-24",
  "criticalBugs": [
    {
      "name": "isAnalyzing 상태 누락",
      "symptom": "분석 중 버튼 클릭 가능 → 중복 실행",
      "cause": "actions.startAnalysis() 호출 누락",
      "fix": "runAnalysis 시작 시 actions.startAnalysis() 호출",
      "reference": "TROUBLESHOOTING_ISANALYZING_BUG.md"
    },
    // ✅ 새 버그 추가
    {
      "name": "Runs Test median 계산 오류",
      "symptom": "median이 항상 0으로 계산됨",
      "cause": "Python Worker에서 median 계산 시 정렬 누락",
      "fix": "sorted_data = sorted(data_values) 추가",
      "reference": "statistical-platform/public/workers/python/worker2-non-parametric.py:156"
    }
  ]
}
```

---

## 5. 자동화 도구

### 5.1 Pre-commit Hook (향후 구현)

**목적**: Git 커밋 시 메타데이터 동기화 강제

**파일 구조**:
```
.husky/
├── pre-commit                        (셸 스크립트, Git이 실행)
└── check-design-system-sync.js       (Node.js 스크립트, 실제 검증 로직)
```

---

#### Step 1: 검증 스크립트 생성

**파일**: `.husky/check-design-system-sync.js`

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 트리거 매핑 (6개 전체)
const TRIGGERS = {
  // 1. Type Guards
  'statistical-platform/lib/utils/type-guards.ts':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/type-guards.json',

  // 2. RAG Components
  'statistical-platform/components/rag/':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/rag-components.json',
  'statistical-platform/lib/rag/':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/rag-components.json',

  // 3. Statistics Page Pattern
  'statistical-platform/docs/STATISTICS_CODING_STANDARDS.md':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/statistics-page-pattern.json',
  'statistical-platform/hooks/use-statistics-page.ts':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/statistics-page-pattern.json',

  // 4. Test Snippets (새 패턴 발견 시만 - 자주 체크 안 됨)
  'statistical-platform/__tests__/':
    'statistical-platform/app/(dashboard)/design-system/coding-patterns/test-snippets.json',
};

// 스테이징된 파일 확인
let stagedFiles;
try {
  stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch (error) {
  console.error('❌ ERROR: git diff 실행 실패');
  process.exit(1);
}

let hasError = false;

// 각 트리거 체크
for (const [trigger, metadataPath] of Object.entries(TRIGGERS)) {
  const matchedFiles = stagedFiles.filter(file => file.includes(trigger));

  if (matchedFiles.length > 0) {
    console.log(`\n🔍 트리거 감지: ${trigger}`);
    console.log(`   변경된 파일: ${matchedFiles.join(', ')}`);

    // 메타데이터도 스테이징되었는지 확인
    if (!stagedFiles.includes(metadataPath)) {
      console.error(`\n❌ ERROR: ${trigger} 수정됨, 하지만 ${metadataPath} 업데이트 안 됨!`);
      console.error(`   → 메타데이터 파일도 함께 커밋하세요.`);
      hasError = true;
      continue;
    }

    // lastUpdated 날짜 확인
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const today = new Date().toISOString().split('T')[0];

      if (metadata.lastUpdated !== today) {
        console.error(`\n❌ ERROR: ${metadataPath}의 lastUpdated가 오늘 날짜가 아님!`);
        console.error(`   현재: ${metadata.lastUpdated}`);
        console.error(`   예상: ${today}`);
        hasError = true;
      } else {
        console.log(`   ✅ 메타데이터 업데이트 확인됨 (${today})`);
      }
    } catch (error) {
      console.error(`\n❌ ERROR: ${metadataPath} 읽기 실패`);
      console.error(`   ${error.message}`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n💡 Tip: statistical-platform/docs/DESIGN_SYSTEM_SYNC_RULES.md 참조');
  process.exit(1);
}

console.log('\n✅ Design System 메타데이터 동기화 확인 완료');
```

---

#### Step 2: Pre-commit 훅 생성

**파일**: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Design System 메타데이터 동기화 체크
node .husky/check-design-system-sync.js
```

---

#### Step 3: 설치

```bash
# 1. Husky 설치
npm install husky --save-dev
npx husky install

# 2. 스크립트 생성
# .husky/check-design-system-sync.js 파일 생성 (위 Step 1 코드 복사)

# 3. Pre-commit 훅 생성
npx husky add .husky/pre-commit "node .husky/check-design-system-sync.js"

# 4. 실행 권한 부여 (Linux/Mac)
chmod +x .husky/check-design-system-sync.js
chmod +x .husky/pre-commit
```

---

#### Step 4: 테스트

```bash
# 1. 트리거 파일 수정 (메타데이터 업데이트 없이)
echo "// test" >> statistical-platform/lib/utils/type-guards.ts
git add statistical-platform/lib/utils/type-guards.ts

# 2. 커밋 시도 (차단되어야 함)
git commit -m "test"
# 예상 출력:
# ❌ ERROR: lib/utils/type-guards.ts 수정됨, 하지만 type-guards.json 업데이트 안 됨!

# 3. 메타데이터 업데이트
# metadata/type-guards.json의 lastUpdated를 오늘 날짜로 변경
git add statistical-platform/app/(dashboard)/design-system/coding-patterns/type-guards.json

# 4. 다시 커밋 시도 (성공해야 함)
git commit -m "feat: add new type guard"
# 예상 출력:
# ✅ Design System 메타데이터 동기화 확인 완료
```

---

### 5.2 자동 생성 스크립트 (미래)

**목적**: 코드에서 메타데이터 자동 추출

**한계**:
- ✅ 함수 시그니처 자동 추출 가능
- ❌ 함수 목적, 사용 예제는 **수동 작성 필수**
- ❌ JSDoc 주석 규칙 필요

**예제** (간단한 버전):
```bash
npm run design-system:sync
```

```javascript
// scripts/design-system/sync-type-guards.js
const fs = require('fs');

// 1. type-guards.ts 파싱 (간단한 정규표현식)
const code = fs.readFileSync('lib/utils/type-guards.ts', 'utf8');
const functionNames = code.match(/export function (\w+)/g)
  .map(match => match.replace('export function ', ''));

// 2. 메타데이터 확인
const metadata = require('../app/(dashboard)/design-system/coding-patterns/type-guards.json');
const metadataFunctions = metadata.categories
  .flatMap(c => c.functions)
  .map(f => f.name);

// 3. 누락된 함수 경고
const missing = functionNames.filter(name => !metadataFunctions.includes(name));
if (missing.length > 0) {
  console.error('❌ 다음 함수가 메타데이터에 없습니다:', missing);
  console.error('   → metadata/type-guards.json에 수동 추가 필요');
  process.exit(1);
}

console.log('✅ 모든 함수가 메타데이터에 존재합니다.');
```

---

## 📌 요약

**AI가 지켜야 할 핵심 규칙**:

1. **트리거 파일 수정 시 즉시 메타데이터 업데이트**
   - `lib/utils/type-guards.ts` → `type-guards.json`
   - `components/rag/*.tsx` → `rag-components.json`
   - `docs/STATISTICS_CODING_STANDARDS.md` → `statistics-page-pattern.json`
   - `__tests__/**/*.test.tsx` (새 패턴) → `test-snippets.json`

2. **항상 `lastUpdated` 필드 업데이트** (YYYY-MM-DD 형식)

3. **사용자에게 명확히 보고**:
   ```
   ✅ type-guards.json 업데이트 완료
      - isValidEmail 함수 추가
      - lastUpdated: 2025-11-24
   ```

4. **검증**:
   - TypeScript 컴파일 체크
   - 개발 서버에서 Design System 페이지 확인

---

**Updated**: 2025-11-24 | **Version**: 1.0.0
