# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 현재 중요 규칙 (2025-11-11 업데이트)

**상태**: ✅ Phase A-3-R1 완료 (변수 role 매핑 표준화 + Critical 버그 수정)

**해결된 문제**:
- ✅ **변수 role 일치**: variable-requirements.ts === types/statistics.ts (6개 인터페이스 수정)
- ✅ **타입 중앙화**: Section 18 준수 (mood-median 중복 정의 제거)
- ✅ **Critical 버그 수정**: chi-square-independence, binomial-test, runs-test (3개)
- 🟡 **공통 컴포넌트 미활용**: 향후 개선 예정 (우선순위 낮음)

**반드시 지킬 것** (CRITICAL):
1. ✅ **변수 role 일치**: variable-requirements.ts의 `role`을 types/statistics.ts에 정확히 반영
   ```typescript
   // variable-requirements.ts: role: 'factor'
   // types/statistics.ts: factor: string[]  ✅
   // types/statistics.ts: groups: string[]  ❌ 금지!
   ```

2. ✅ **타입 단일 정의**: types/statistics.ts에만 정의 (페이지별 재정의 절대 금지)
   ```typescript
   // ❌ 금지: mann-whitney/page.tsx에서 interface PostHocComparison {...}
   // ✅ 권장: import { PostHocComparison } from '@/types/statistics'
   ```

3. ✅ **공통 컴포넌트 우선**: StatisticsTable, EffectSizeCard, VariableSelectorSimple 등 사용 (`<table>` 직접 사용 금지)

**표준 Role 매핑** (SPSS/R/SAS 표준):
| variable-requirements.ts | types/statistics.ts | ❌ 금지 |
|-------------------------|---------------------|---------|
| `role: 'factor'` | `factor: string[]` | `groups`, `independent` |
| `role: 'within'` | `within: string[]` | `conditions` |
| `role: 'covariate'` | `covariate: string[]` | `covariates` |
| `role: 'blocking'` | `blocking?: string[]` | `randomEffects` |

**예외 케이스** (2개 role을 별도 필드로 사용):
- **chi-square-independence**: `role: 'independent'` + `role: 'dependent'` → `row: string` + `column: string`
  - 컨버터: `independent||row`, `dependent||column` fallback 적용

**필드명 규칙**: camelCase (pValue, ciLower, ciUpper) ✅ | snake_case (p_value, ci_lower) ❌

**상세**: [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - Section 17-19

---

## 🔧 UTF-8 인코딩 문제 해결 방법 (2025-11-23 신규)

**문제**: Claude Code의 Edit Tool과 Write Tool은 한글(UTF-8) 파일 수정 시 인코딩 손상 발생

**증상**:
- 한글 텍스트가 `M-pM-^_M-^S` 같은 바이트 시퀀스로 변환됨
- Read Tool은 자동 보정하여 정상으로 표시하지만, 실제 파일은 손상 상태
- TypeScript 컴파일은 통과하지만 브라우저에서 깨진 텍스트 표시

**해결 방법**: Node.js 스크립트 사용 (UTF-8 기본 지원)

```javascript
// example-fix.mjs
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'path/to/file.tsx';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// 문자열 치환 (정규표현식 사용 가능)
content = content.replace('old text', 'new text');

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('완료: UTF-8 인코딩 보존됨');
```

**실행**:
```bash
node example-fix.mjs
```

**검증 방법**:
```bash
# 1. 인코딩 손상 확인 (0이어야 정상)
cat -A file.tsx | grep -E "(M-|�)" | wc -l

# 2. TypeScript 컴파일
cd statistical-platform
npx tsc --noEmit

# 3. 테스트 실행
npm test -- __tests__/path/to/test.tsx
```

**주의사항**:
- ❌ Edit Tool: 한글 파일 수정 시 사용 금지
- ❌ Write Tool: 한글 파일 수정 시 사용 금지
- ❌ Python 스크립트: Windows cp949 인코딩 문제
- ✅ Node.js 스크립트 (.mjs): UTF-8 기본 지원으로 안전

**예제**: `statistical-platform/components/smart-flow/steps/ResultsActionStep.tsx` 수정 시 사용됨 (2025-11-23)

---

## 🎨 공통 컴포넌트 전략 (2025-11-21 신규)

**목표**: 컴포넌트 재사용성 극대화 + 일관된 UX + 유지보수 효율화

### 📦 현재 공통 컴포넌트 목록

**1. 분석 관련 컴포넌트** (`components/common/analysis/`)
- ✅ **PurposeCard** - 선택 가능한 카드 (분석 목적, 방법 선택)
- ✅ **AIAnalysisProgress** - AI 분석 진행 표시 (프로그레스 바 + 단계)
- ✅ **DataProfileSummary** - 데이터 요약 표시 (표본 크기, 변수 타입)

**2. 변수 선택 컴포넌트** (`components/common/`)
- ✅ **VariableSelectorSimple** - 초간단 변수 선택 (버튼 클릭만, 드래그앤드롭 제거)
  - 사용처: 스마트 분석, 개별 통계 페이지 (2변수 분석)
  - 디자인 철학: 드래그앤드롭 없음, 할당 개념 없음, 버튼 클릭만

**3. 통계 결과 컴포넌트** (`components/common/statistics/`)
- ✅ **StatisticsTable** - 통계 결과 테이블 (내보내기, 정렬 기능)
- ✅ **EffectSizeCard** - 효과 크기 표시
- ✅ **AssumptionTestCard** - 가정 검정 결과 표시

### 🔧 공통 컴포넌트 개발 워크플로우

**⚠️ CRITICAL: 모든 컴포넌트 작업은 Design System 쇼케이스를 참조하세요!**

**Design System 쇼케이스 접속**:
```bash
npm run dev
# → http://localhost:3000/design-system
```

**파일 위치**: `statistical-platform/app/(dashboard)/design-system/page.tsx`

**현재 쇼케이스 구성** (4개 섹션):
- 🎨 **Colors**: shadcn/ui 색상 팔레트 (6가지)
- 🔘 **Buttons**: 라이브 플레이그라운드 (variant + size)
- 📝 **Typography**: Headings, Body Text 스타일
- 🧩 **Components**: 공통 컴포넌트 실시간 테스트
  - PurposeCard (선택 가능한 카드)
  - AIAnalysisProgress (진행률 표시)
  - DataPreviewTable (데이터 미리보기)
  - VariableSelectorSimple (변수 선택)

**1단계: Design System에서 개발**
- 새 컴포넌트 작성
- Design System 페이지에 새 섹션/카드 추가
- 다양한 Props 조합 테스트
- 실시간 확인 (HMR 지원)

**2단계: 실제 페이지에 적용**
- 스마트 분석 먼저 적용 (가장 많이 사용)
- 개별 통계 페이지에 점진적 적용
- 피드백 수집 → Showcase 업데이트

**3단계: 문서화**
- Showcase 페이지에 Props 테이블 추가
- 사용 예제 코드 추가
- 디자인 특징/사용 시나리오 명시

### 📋 공통 컴포넌트 작성 규칙

**필수 규칙**:
1. ✅ **TypeScript 엄격 모드**: `any` 금지, 모든 Props 타입 명시
2. ✅ **shadcn/ui 기반**: 기존 디자인 시스템 준수
3. ✅ **접근성 고려**: ARIA 속성, 키보드 네비게이션
4. ✅ **반응형 디자인**: 모바일/태블릿/데스크탑 모두 지원
5. ✅ **에러 처리**: 잘못된 Props에 대한 fallback

**파일 위치**:
- 분석 관련: `components/common/analysis/`
- 변수 선택: `components/common/`
- 통계 결과: `components/common/statistics/`
- UI 기본: `components/ui/` (shadcn/ui)

### 🚀 향후 계획

**우선순위 높음**:
- [ ] **VariableSelectorAdvanced** - 다중 변수 선택 (ANOVA, MANOVA용)
- [ ] **StatisticsChart** - 공통 차트 컴포넌트 (Box Plot, Histogram)
- [ ] **ResultExportButton** - 통합 내보내기 버튼 (CSV, PNG, PDF)

**우선순위 중간**:
- [ ] **DataValidationAlert** - 데이터 검증 결과 표시
- [ ] **MethodComparisonCard** - 통계 방법 비교 카드
- [ ] **PostHocTable** - 사후 검정 결과 테이블

**참고**: 모든 새 컴포넌트는 `/design-system` 페이지에 먼저 추가!

---

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **현재**: Phase 9 완료 (95%) - 계산 방법 표준화 + 데이터 도구 분리
- **전체 페이지**: 45개 (통계 43개 + 데이터 도구 2개)

## ⚠️ AI 코딩 엄격 규칙 (CRITICAL)

### 1. TypeScript 타입 안전성 (최우선)

**필수 규칙**:
- ❌ `any` 타입 절대 금지 → `unknown` 사용 후 타입 가드
- ✅ 모든 함수에 명시적 타입 지정 (파라미터 + 리턴)
- ✅ null/undefined 체크 필수 (early return 패턴)
- ✅ 옵셔널 체이닝 (`?.`) 적극 사용
- ❌ Non-null assertion (`!`) 절대 금지

**상세 예제**: [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md)

### 2. Pyodide 통계 계산 규칙 (CRITICAL)

**통계 계산 구현 원칙**:
- ❌ **JavaScript/Python으로 통계 알고리즘 직접 구현 절대 금지**
- ✅ **반드시 검증된 통계 라이브러리 사용** (SciPy, statsmodels, pingouin)
- ✅ 직접 구현 시 사용자 사전 승인 필수

### 3. 통계 페이지 코딩 표준 (CRITICAL)

**43개 통계 페이지 일관성 유지 필수!**
- **전체 프로젝트**: 45개 (통계 43개 + 데이터 도구 2개)
- **통계 페이지**: PyodideCore 표준 (41/43 = 95%)
- **데이터 도구**: JavaScript 단순 카운팅 (2개: frequency-table, cross-tabulation)

⚠️ **상세 규칙**: [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md)

**핵심 원칙**:
- ✅ `useStatisticsPage` hook 사용 (useState 금지)
- ✅ `useCallback` 모든 이벤트 핸들러에 적용
- ✅ **await 패턴 사용** (setTimeout 사용 금지)
- ✅ `any` 타입 절대 금지 (unknown + 타입 가드)
- ✅ TypeScript 컴파일 에러 0개
- ✅ **변수 role 매핑**: variable-requirements.ts와 types/statistics.ts 일치 (위 "현재 중요 규칙" 참조)
- ✅ **타입 중앙 정의**: types/statistics.ts 단일 정의 (페이지별 재정의 금지)
- ✅ **공통 컴포넌트 사용**: StatisticsTable, EffectSizeCard 등 활용
- ✅ **PyodideCore 사용**: 모든 통계 계산은 검증된 라이브러리 (SciPy, statsmodels, sklearn)

**참고 문서**:
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방

---

### 4. AI 코딩 품질 보증 워크플로우 (CRITICAL)

**핵심 원칙**: 수정 → 검증 → 리뷰 + 테스트 → 커밋 → (사용자 승인) → 푸시

#### 📍 Step 1: 코드 수정
- Write/Edit Tool 사용
- 문법 에러 자동 감지 (VSCode TypeScript 서버)

#### 📍 Step 2: 검증 (필수/선택)

**2-1. TypeScript 체크** (✅ 필수)
```bash
cd statistical-platform
npx tsc --noEmit
```

**2-2. 빌드 체크** (🟡 선택 - 10+ 파일 수정 시)
```bash
npm run build
```

**2-3. 테스트 실행** (🟡 선택 - 로직 변경 시)
```bash
npm test [파일명]
```

#### 📍 Step 3: 코드 리뷰 + 테스트 (필수)

**🔍 AI 자체 코드 리뷰**:
1. 수정 파일 목록 정리 (파일명 + 라인 번호)
2. 주요 변경 사항 요약 (무엇을, 왜, 어떻게)
3. 예상 영향 범위 분석
4. 알려진 이슈 문서화

**📋 리뷰 체크리스트**:
- [ ] 타입 안전성: `any` 타입 사용 없음
- [ ] 에러 처리: try-catch 적절히 사용
- [ ] Null 체크: Optional chaining (`?.`) 사용
- [ ] 일관성: 기존 코드 패턴 준수
- [ ] 부작용: 다른 파일에 영향 없음
- [ ] 변수 role 매핑: variable-requirements.ts와 일치
- [ ] 타입 정의: types/statistics.ts에만 정의 (페이지 재정의 없음)

**✅ 테스트 검증**:

**통합 테스트** (✅ 필수 - 모든 작업 완료 시)
```bash
npm run dev
# → 브라우저에서 실제 동작 확인
```

**통합 테스트 체크리스트**:
1. **UI 렌더링**
   - [ ] 새 컴포넌트가 화면에 표시되는가?
   - [ ] 레이아웃이 깨지지 않는가?

2. **기능 동작**
   - [ ] 버튼/드롭다운 클릭 시 정상 작동하는가?
   - [ ] 상태 변경이 UI에 반영되는가?

3. **에러 처리**
   - [ ] 잘못된 입력 시 에러 메시지가 표시되는가?
   - [ ] 콘솔에 에러가 없는가?

---

#### 📍 Step 4: Git 커밋 (검증 통과 후)

```bash
git add -A
git commit -m "커밋 메시지"
```

**커밋 메시지 형식**:
```
feat/fix/refactor: 작업 요약 (1줄)

변경 내역:
- 파일 1 (Line X-Y): 변경 내용

검증 결과:
- TypeScript: 0 errors ✓

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

#### 📍 Step 5: 푸시 (사용자 승인 필요)

**❌ AI가 자동으로 푸시하지 않음**
- 커밋 완료 후 사용자에게 보고
- 사용자가 명시적으로 "푸시해" 요청 시에만 푸시


### 5. 테스트 프레임워크 규칙 (CRITICAL)

**이 프로젝트는 Jest를 사용합니다 (Vitest 아님!)**

**필수 규칙**:
- ✅ **테스트 파일은 항상 Jest 문법 사용**
- ❌ Vitest import 절대 금지 (`import { describe, it } from 'vitest'` ❌)
- ✅ Jest import 사용 (`import { describe, it } from '@jest/globals'` 또는 전역 사용)

**테스트 파일 작성 예시**:
```typescript
// ✅ 올바른 방법 (Jest)
import { render, screen } from '@testing-library/react'

describe('Component', () => {
  it('should render', () => {
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})

// ❌ 잘못된 방법 (Vitest)
import { describe, it, expect, vi } from 'vitest'  // ❌ 금지!
```

**테스트 실행**:
```bash
npm test              # 모든 테스트
npm test [파일명]     # 특정 파일
npm test:watch        # watch 모드
npm test:coverage     # 커버리지
```

---

### 6. 테스트 자동화 철학 (CRITICAL)

**핵심 원칙**: "정직한 테스트 > 이상적인 테스트"

#### 규칙 1: 테스트는 현실을 반영해야 한다

**❌ 잘못된 접근**:
```typescript
// 목표: 45개 스냅샷 파일이 필요함
it('Meta: 정확히 45개의 스냅샷 파일이 있어야 함', () => {
  expect(snapshots.size).toBe(45)  // ❌ 실제 3개만 존재 (거짓 주장)
})
```

**✅ 올바른 접근**:
```typescript
// 현재 상태: 3개 완료, 42개 대기
it('Meta: 현재 스냅샷 파일 개수 확인 (Phase 1-B 완료 기준)', () => {
  // 현재 실제 상태: 3개 (t-test, anova, correlation)
  // 최종 목표: 45개 (전체 통계 방법)
  // 진행률: 3/45 = 6.7%
  expect(snapshots.size).toBe(3)  // ✅ 현실 반영
})

// Phase 1-C에서 작성할 테스트는 .skip()으로 명시
describe.skip('Golden Snapshot Tests (JSON-based - Phase 1-C 대기)', () => {
  // 42개 스냅샷 추가 시 활성화
})
```

**교훈**:
- 테스트는 코드의 **실제 상태**를 검증해야 함 (이상 상태 X)
- 미완성 작업은 `.skip()` + 주석으로 명시
- 거짓 통과 테스트는 신뢰성을 파괴함

---

#### 규칙 2: Zod 스키마의 Trade-off 이해하기

**문제**: `passthrough() + optional()`로 인한 검증 우회

```typescript
// ❌ 느슨한 검증 (Union + fallback)
export const AdditionalFieldsSchema = z.union([
  AdditionalRegressionSchema,  // passthrough() 허용
  z.record(z.string(), z.unknown())  // fallback: 모든 것 허용
]).optional()

// 결과: NaN/Infinity 값도 통과 가능 (Union의 fallback이 먼저 매칭)
const result = AnalysisResultSchema.parse({
  method: 'Linear Regression',
  statistic: 5.2,
  pValue: 0.03,
  additional: { rSquared: NaN }  // ✅ 통과! (fallback으로 매칭)
})
```

**해결책 1**: 개별 스키마 직접 테스트
```typescript
// contracts.test.ts
it('rSquared가 NaN이면 에러', () => {
  expect(() => {
    AdditionalRegressionSchema.parse({ rSquared: NaN })  // 직접 테스트
  }).toThrow()  // ✅ 에러 발생
})
```

**해결책 2**: Discriminated Union (향후 개선)
```typescript
// 이상적: method 필드 기준 엄격 검증
export const AnalysisResultSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('Linear Regression'),
    additional: AdditionalRegressionSchema.required()  // 엄격
  }),
  z.object({
    method: z.literal('One-way ANOVA'),
    additional: AdditionalANOVASchema.required()
  })
  // ... (43개 통계)
])
```

**Trade-off 문서화**:
```typescript
/**
 * 🚨 알려진 한계 (Trade-off):
 *
 * 1. **passthrough() 효과**: 정의되지 않은 필드도 허용
 *    - 장점: 유연성 (새 통계 필드 추가 시 스키마 수정 불필요)
 *    - 단점: 엄격한 검증 불가
 *
 * 2. **optional() 효과**: Union의 fallback이 먼저 매칭
 *    - 결과: 특정 스키마 범위 검증이 완벽히 강제되지 않음
 *
 * 3. **개선 방향**: discriminated union (method 필드 기준)
 */
```

**교훈**:
- Zod의 `passthrough() + optional()`은 유연성과 엄격성의 trade-off
- Union 스키마는 fallback으로 인해 범위 검증이 우회될 수 있음
- 한계를 명시적으로 문서화하고, 개별 스키마 직접 테스트로 보완

---

#### 규칙 3: 문서 일관성 유지하기

**문제**: 43개 vs 45개 혼재

**원인**:
- **통계 페이지**: 43개 (app/(dashboard)/statistics/)
- **해석 블록**: 45개 (lib/interpretation/engine.ts `title:` 블록)
- **고유 title**: 40개 (중복 title 존재)

**해결**:
```markdown
# 해석 엔진 커버리지 분석

**용어 정리** (중요!):
- **통계 페이지**: 43개 (폴더 기준)
- **해석 블록**: 45개 (engine.ts 블록 기준)
- **고유 title**: 40개 (중복 제외)

**검증 기준**: 해석 블록 45개 기준으로 문서 작성
```

**교훈**:
- 문서 작성 시 "무엇을 기준으로 센 숫자인지" 명시
- 혼란을 방지하려면 용어 정의 섹션 필수
- 여러 문서에서 동일한 용어 사용 시 일관성 체크

---

#### 규칙 4: 테스트 자동화 단계별 접근

**Phase 1-A**: 인프라 구축
- [x] 디렉토리 생성
- [x] 테스트 러너 작성
- [x] 3개 대표 통계 선정

**Phase 1-B**: 소규모 검증
- [x] 3개 통계 × 3 시나리오 = 9개 테스트
- [x] 실제 출력 vs 기대값 비교
- [x] 텍스트 미세 조정 (p-value 포맷, r² 계산)

**Phase 1-C**: 대규모 확장 (대기)
- [ ] 42개 통계 × 3 시나리오 = 126개 테스트
- [ ] `describe.skip()` 제거
- [ ] CI/CD 통합

**교훈**:
- 소규모 검증(3개)으로 프로세스 확립 후 확장
- "작성됨" ≠ "완료" (실패한 테스트는 완료로 카운트 X)
- Phase를 명확히 구분하여 진행률 투명하게 관리

**출처**: [RECONCILIATION_REPORT.md](statistical-platform/docs/RECONCILIATION_REPORT.md) - 문서 불일치 조정 작업 (2025-11-24)

---

### 7. 코드 스타일

- ❌ 식별자에 이모지 절대 금지 (변수명, 함수명, 클래스명)
- ✅ Next.js 15 App Router 사용 (Pages Router 금지)
- ✅ shadcn/ui 컴포넌트 우선 사용

---

## 🏗️ 아키텍처 (Phase 6)

### 구조 개요
```
사용자 → Groups → PyodideCore → Python Workers (SciPy/statsmodels)
         ↓        ↓
    데이터 가공   직접 호출 (callWorkerMethod<T>)
    UI 포맷팅    타입 안전성 향상
```

### 핵심 원칙
- **Groups**: TypeScript로 데이터 검증/가공, UI 포맷팅만
- **PyodideCore**: Python Workers 호출 관리
- **Python Workers**: 실제 통계 계산 (SciPy/statsmodels)
- ❌ Groups에서 통계 직접 계산 금지

### 핵심 디렉토리
```
statistical-platform/
├── lib/statistics/
│   ├── groups/                      - 6개 그룹 (TypeScript)
│   └── registry/                    - 60개 메서드 메타데이터
├── lib/services/
│   └── pyodide-core.ts              - PyodideCore (421 lines)
└── public/workers/python/           - Python Workers (4개)
```

---

## 📦 배포 시나리오

이 프로젝트는 **2가지 배포 방식**을 지원합니다:

### Vercel 클라우드 배포 (일반 사용자)
- ✅ **CDN 자동 다운로드**: Pyodide를 CDN에서 자동으로 로드
- ✅ **빌드 크기**: ~50MB (Pyodide 미포함)
- ✅ **환경변수**: `NEXT_PUBLIC_OLLAMA_ENDPOINT` (선택)
- 🎯 **대상**: 인터넷 연결 가능한 일반 사용자

### 로컬 오프라인 배포 (폐쇄망 환경)
- ✅ **완전 오프라인**: 인터넷 없이 모든 기능 동작
- ✅ **빌드 크기**: ~250MB (Pyodide 200MB 포함)
- ✅ **환경변수**: `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true` (필수)
- 🎯 **대상**: 군대/병원/연구소 등 폐쇄망 환경

**상세**: [DEPLOYMENT_SCENARIOS.md](statistical-platform/docs/DEPLOYMENT_SCENARIOS.md)

---

## 🔧 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드 (Vercel 클라우드용)
npm run build:offline # 빌드 (로컬 오프라인용)
npm test             # 테스트
npx tsc --noEmit     # 타입 체크

# 오프라인 배포 사전 준비
npm run setup:pyodide    # Pyodide 다운로드 (200MB)
ollama pull mxbai-embed-large  # Ollama 모델 (선택)
```

---

## 📋 현재 작업 상태

**최신 상태** (2025-11-18):
- ✅ **Phase 8 완료 (100%)**: RAG 시스템 (Ollama + Vector DB) (2025-11-16 완료)
  - ✅ **Vector DB**: ChromaDB + Ollama embeddings (mxbai-embed-large)
  - ✅ **문서 수집**: SciPy, statsmodels, pingouin 등 통계 라이브러리
  - ✅ **/chatbot 페이지**: Grok 스타일 전체 화면 채팅
  - ✅ **FloatingChatbot**: 전역 플로팅 버튼 (Intercom 스타일)
  - ✅ **ChatPanel (우측 패널)**: Layout 레벨 전역 구현
    - Header MessageCircle (💬) 버튼으로 열기
    - 320px~800px 리사이징, 접기/펼치기
    - RAGAssistantCompact 포함
- ✅ **Phase 9 완료 (100%)**: 계산 방법 표준화 + 데이터 도구 분리 (2025-11-18 완료)
  - ✅ **전체 프로젝트**: 45개 (통계 43개 + 데이터 도구 2개)
  - ✅ **PyodideCore**: 43/43 통계 페이지 (100%) 목표 달성! 🎉
  - ✅ **Batch 1-4**: 23개 페이지 변환 완료 (pyodideStats, Legacy, JavaScript, None)
  - ✅ **데이터 도구 분리**: frequency-table, cross-tabulation → /data-tools/
  - ✅ **코드 감소**: -2,005줄 / **Worker 메서드 총 88개** (W1:12, W2:23, W3:23, W4:30)
  - ✅ **통계 신뢰성**: statsmodels, SciPy, sklearn 100% 사용
  - ✅ **PyodideWorker Enum 표준화**: 43/43 페이지 (100%) - 타입 안전성 강화 완료
  - ✅ **레거시 코드 제거**: usePyodideService 통계 페이지에서 완전 제거
- ✅ **Phase 10 완료**: 배포 준비 완료 (Web Worker 활성화 + 배포 가이드) (2025-11-16)
  - ✅ **TwoPanelLayout 대규모 마이그레이션**: 23개 통계 페이지 완료
  - ✅ **RAG Perplexity 스타일 UI**: 인라인 인용 + 스트리밍 + 타이핑 커서
  - ✅ **Pyodide Web Worker 활성화**: UI 블로킹 방지 + 동시 실행
  - ✅ **DEPLOYMENT_COMPANY_GUIDE.md**: 회사 배포 가이드 (345줄)
- ✅ Phase 6 완료: PyodideCore 직접 연결
  - ✅ 10개 handler 완전 변환 (39개 메서드, 100%)
  - ✅ TypeScript 컴파일 에러: **0개** (core groups/handlers)
  - ✅ 코드 품질: **5.0/5** ⭐⭐⭐⭐⭐
- ✅ Phase 1 완료: setTimeout 패턴 제거
  - ✅ 27/27 페이지 (100%) 표준 패턴으로 전환
  - ✅ isAnalyzing Critical 버그 10개 수정
- ✅ Phase 2-2 완료: 코드 품질 개선
  - ✅ **43/43 통계 페이지 (100%)** 완료
  - ✅ TypeScript 에러: 717 → 0 (-100%, 완전 제거)
  - ✅ 코드 품질: 3.5/5 → 4.97/5 (+42% 향상)
- ✅ **Phase 3 (StatisticsTable 확대) 완료 (95%)**:
  - ✅ 8개 페이지, 19개 테이블 변환 (코드 평균 -30%)
  - ✅ 내보내기 버튼 비활성화: 22개 페이지

- ✅ **UI 통합 (2025-11-18 완료)**: `/smart-analysis` → `/smart-flow` 통합
  - ✅ `/smart-analysis` 폴더 삭제 (구형 962줄 제거)
  - ✅ 모든 링크 `/smart-flow`로 변경 ([app/page.tsx](statistical-platform/app/page.tsx), [app/(dashboard)/dashboard/page.tsx](statistical-platform/app/(dashboard)/dashboard/page.tsx))
  - ✅ 코드 감소: -868줄 (-90%)
  - ✅ 사용자 혼란 제거: 단일 스마트 분석 경로 유지

**다음 작업**:
- 🔜 **Phase 11: 자동화 테스트 시스템** (68시간 예상)
  - 목표: 43개 통계 앱 해석 엔진 완벽 자동 검증
  - 📋 상세 계획: [ROADMAP.md - Phase 11](ROADMAP.md#-phase-11-자동화-테스트-시스템-예정)
  - 📋 구현 가이드: [AUTOMATED_TESTING_ROADMAP.md](statistical-platform/docs/AUTOMATED_TESTING_ROADMAP.md)
- 🔜 Phase 12: Tauri 데스크탑 앱 (향후 검토)
- 🔜 추가 개선 사항 (성능 최적화, 시각화 고도화 등)

**📝 상세 작업 기록**: [dailywork.md](dailywork.md) | [STATUS.md](STATUS.md)

---

## 📚 문서 구조

### 루트 문서 (5개만 유지)
- **[CLAUDE.md](CLAUDE.md)** - AI 코딩 규칙 (이 파일)
- **[README.md](README.md)** - 프로젝트 개요
- **[ROADMAP.md](ROADMAP.md)** - 개발 로드맵
- **[STATUS.md](STATUS.md)** - 프로젝트 현재 상태
- **[dailywork.md](dailywork.md)** - 작업 기록 (최근 7일만)

### statistical-platform/docs/ (구현 상세)
- [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md) - any → unknown 예제
- [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - 통계 모듈 코딩 표준 ⭐
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방 🚨
- [AUTOMATED_TESTING_ROADMAP.md](statistical-platform/docs/AUTOMATED_TESTING_ROADMAP.md) - 자동화 테스트 계획 (Golden Snapshot + E2E) 🧪
- [RAG_ARCHITECTURE.md](statistical-platform/docs/RAG_ARCHITECTURE.md) - RAG 시스템 아키텍처 (SQLite 의존성 구조) 🔍
- [NEXTJS_STATIC_EXPORT.md](statistical-platform/docs/NEXTJS_STATIC_EXPORT.md) - Static Export vs API Route (빌드 에러 해결) 📦

### 문서 관리 규칙
- **dailywork.md**: 최근 7일만 유지 (주말마다 `archive/dailywork/`로 이동)
- **STATUS.md**: Phase 완료 시 또는 주요 마일스톤만 업데이트
- ❌ 분석/검토 문서: 새 파일 생성 금지 → STATUS.md에 요약만 추가

---

**Updated**: 2025-11-18 | **Version**: Phase 9 Complete (100%) - PyodideWorker Enum 표준화 (43/43 페이지) | **Next**: Phase 8 (RAG 고도화) or Phase 11 (Tauri 앱)
