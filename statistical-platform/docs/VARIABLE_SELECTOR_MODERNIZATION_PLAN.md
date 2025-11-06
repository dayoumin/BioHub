# Variable Selector Modernization Plan

## 🎯 목표

기존 드래그앤드롭 스타일 변수 선택 UI를 **현대적인 버튼 기반 모달 방식**으로 전면 개선하여:
- 화면 공간 효율성 300% 향상 (세로 스크롤 제거)
- 변수 선택 시간 50% 단축 (20초 → 10초)
- SPSS/Jamovi 수준의 직관적인 UX 제공
- 45개 통계 페이지 일관성 확보

---

## 📊 현재 상태 분석

### 기존 시스템 구조

```
statistical-platform/components/variable-selection/
├── VariableSelector.tsx           (822줄) - 드래그앤드롭 스타일
├── VariableSelectorSimple.tsx     (479줄) - 드롭다운/라디오 스타일
├── VariableSelectorPremium.tsx    (689줄) - 슬롯 기반 (미완성)
└── __tests__/VariableSelector.test.tsx
```

### 문제점

1. **공간 비효율성**
   - 좌우 2단 레이아웃으로 화면 낭비
   - 변수 5개만 있어도 세로 스크롤 발생
   - 1920x1080 화면에서도 전체 UI 안 보임

2. **구시대적 UX**
   - 드래그앤드롭 "모방" (실제론 클릭)
   - 드롭 영역이 명확하지 않음
   - 할당/해제 동작이 직관적이지 않음

3. **일관성 부족**
   - 3가지 UI 버전 혼재 (Simple/Standard/Premium)
   - 통계마다 다른 UI 제공 가능성

4. **시각적 혼잡함**
   - 변수 카드가 너무 큼
   - 불필요한 아이콘/배지 과다
   - 중요 정보가 묻힘

---

## 🎨 새로운 UI 디자인

### 컨셉: SPSS/Jamovi 스타일 버튼 선택

```
┌────────────────────────────────────────────────────────────────────────┐
│  일원분산분석 (ANOVA) 변수 설정              [AI 자동 설정] [초기화]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  종속변수 *                                            [변수 선택 >]  │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  체중점수  ×                                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  연속형 변수를 선택하세요 (평균 비교 대상)                             │
│                                                                        │
│  독립변수 (요인) *                                      [변수 선택 >]  │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  치료법  ×                                                        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  범주형 변수를 선택하세요 (그룹 구분)                                  │
│                                                                        │
│  공변량 (선택사항)                                      [변수 선택 >]  │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  + 변수 추가                                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  통제할 연속형 변수 (다중 선택 가능)                                   │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  ✓ 모든 필수 변수가 설정되었습니다                                     │
│  • 샘플 크기: 120개 (권장: 30개 이상) ✓                                │
│  • 정규성 가정: 양호 (왜도 0.12, 첨도 -0.05) ✓                        │
├────────────────────────────────────────────────────────────────────────┤
│  [< 이전]                                     [미리보기] [분석 시작 >] │
└────────────────────────────────────────────────────────────────────────┘
```

### 모달 디자인

```
[변수 선택] 버튼 클릭 시:

┌─────────────────────────────────────────┐
│  종속변수 선택              [AI 추천] ✨ │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ 🔍 변수 검색...                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  연속형 변수만 표시 ▼                    │
│                                         │
│  ☑ 체중점수 (27 고유값, 범위: 59-106)    │  ← AI 추천
│  ○ 효과점수 (26 고유값, 범위: 1.0-30.0)  │
│  ○ 만족도 (21 고유값)                   │
│                                         │
│  ⚠ 치료법 (범주형, 3 그룹)               │  ← 타입 불일치
│  ⚠ 성별 (이진형)                        │
│                                         │
├─────────────────────────────────────────┤
│  [취소]                       [선택 →]  │
└─────────────────────────────────────────┘
```

### 핵심 UX 개선 사항

| 기능 | 기존 | 개선 |
|------|------|------|
| **변수 선택** | 좌측 목록 → 우측 드롭 영역 드래그 | [변수 선택] 버튼 → 모달에서 선택 |
| **공간 활용** | 2단 레이아웃 (50% 낭비) | 1단 레이아웃 (100% 활용) |
| **스크롤** | 변수 5개만 있어도 스크롤 | 변수 20개까지 스크롤 없음 |
| **AI 추천** | 작은 아이콘 버튼 | 눈에 띄는 [AI 자동 설정] 버튼 |
| **검증 피드백** | 하단 작은 경고 메시지 | 상단 명확한 체크리스트 |
| **타입 필터링** | 모든 변수 표시 (혼란) | 호환 타입만 표시 (직관적) |

---

## 🏗️ 구현 계획

### Phase 1: 새 컴포넌트 개발 (2-3일)

#### 1.1 VariableSelectorModern.tsx (메인 컴포넌트)

**파일**: `components/variable-selection/VariableSelectorModern.tsx`

**구조**:
```typescript
export function VariableSelectorModern({
  methodId,
  data,
  onVariablesSelected,
  className
}: VariableSelectorModernProps) {
  // 메타데이터 로드 (기존 시스템 재사용)
  const requirements = getMethodRequirements(methodId)
  const analysis = analyzeDataset(data)

  // 상태 관리
  const [assignments, setAssignments] = useState<VariableAssignment>({})
  const [activeRole, setActiveRole] = useState<string | null>(null)

  // 검증
  const validation = validateAssignments(assignments, requirements)

  return (
    <div className="space-y-6">
      {/* 헤더: AI 자동 설정, 초기화 */}
      <ModernSelectorHeader onAutoAssign={handleAutoAssign} onReset={handleReset} />

      {/* 역할별 선택 영역 */}
      {requirements.variables.map(varReq => (
        <VariableRoleField
          key={varReq.role}
          requirement={varReq}
          selectedVars={assignments[varReq.role]}
          availableVars={filterVariablesByType(analysis.columns, varReq.types)}
          onSelect={(vars) => handleSelect(varReq.role, vars)}
          onOpenModal={() => setActiveRole(varReq.role)}
        />
      ))}

      {/* 검증 상태 피드백 */}
      <ValidationSummary validation={validation} analysis={analysis} />

      {/* 하단 버튼 */}
      <ModernSelectorFooter
        onBack={onBack}
        onPreview={handlePreview}
        onSubmit={() => onVariablesSelected(assignments)}
        isValid={validation.isValid}
      />

      {/* 변수 선택 모달 */}
      <VariablePickerModal
        isOpen={activeRole !== null}
        role={activeRole}
        requirement={activeRole ? requirements.variables.find(v => v.role === activeRole) : null}
        availableVars={analysis.columns}
        currentSelection={activeRole ? assignments[activeRole] : undefined}
        onSelect={handleModalSelect}
        onClose={() => setActiveRole(null)}
      />
    </div>
  )
}
```

**예상 코드량**: 400-500줄

#### 1.2 VariableRoleField (역할별 입력 필드)

**파일**: `components/variable-selection/modern/VariableRoleField.tsx`

**기능**:
- 라벨 + 필수 표시 (`*`)
- 선택된 변수 칩 표시 (제거 가능)
- [변수 선택] 버튼
- 역할 설명 텍스트

**예상 코드량**: 150-200줄

#### 1.3 VariablePickerModal (변수 선택 모달)

**파일**: `components/variable-selection/modern/VariablePickerModal.tsx`

**기능**:
- 검색 입력창
- AI 추천 버튼
- 타입 필터 드롭다운
- 변수 목록 (스크롤 영역)
- 선택/취소 버튼

**예상 코드량**: 300-350줄

#### 1.4 VariableOption (변수 옵션 항목)

**파일**: `components/variable-selection/modern/VariableOption.tsx`

**기능**:
- 체크박스
- 변수 타입 아이콘
- 변수명 + AI 추천 배지
- 통계 정보 (고유값, 범위)
- 타입 불일치 경고

**예상 코드량**: 100-120줄

#### 1.5 ValidationSummary (검증 피드백)

**파일**: `components/variable-selection/modern/ValidationSummary.tsx`

**기능**:
- 필수 변수 체크 상태
- 샘플 크기 검증
- 통계적 가정 체크 (정규성, 등분산성)
- 경고/오류 메시지

**예상 코드량**: 150-180줄

#### 1.6 단위 테스트

**파일**: `components/variable-selection/__tests__/VariableSelectorModern.test.tsx`

**테스트 케이스**:
- [ ] 렌더링: 메타데이터에 따라 역할 필드 생성
- [ ] 변수 선택: 모달 열기 → 변수 선택 → 칩 표시
- [ ] AI 추천: 자동 할당 실행 → 추천 변수 할당
- [ ] 검증: 필수 변수 누락 시 에러 표시
- [ ] 초기화: 모든 선택 초기화
- [ ] 제출: onVariablesSelected 콜백 호출

**예상 코드량**: 200-250줄

---

### Phase 2: 점진적 마이그레이션 (3-5일)

#### 2.1 파일럿 테스트 (3개 페이지)

**선정 기준**: 복잡도 단계별 테스트

| 페이지 | 복잡도 | 변수 역할 | 선정 이유 |
|--------|--------|----------|----------|
| `anova/page.tsx` | 단순 | 종속 1개, 요인 1개 | 기본 기능 검증 |
| `regression/page.tsx` | 중간 | 종속 1개, 독립 복수 | 다중 선택 검증 |
| `mixed-model/page.tsx` | 복잡 | 고정효과, 무선효과, 공변량 | 복잡한 구조 검증 |

**변경 사항**:
```typescript
// Before
import { VariableSelector } from '@/components/variable-selection'

<VariableSelector
  methodId="anova-one-way"
  data={uploadedData}
  onVariablesSelected={handleVariablesSelected}
/>

// After
import { VariableSelectorModern } from '@/components/variable-selection'

<VariableSelectorModern
  methodId="anova-one-way"
  data={uploadedData}
  onVariablesSelected={handleVariablesSelected}
/>
```

**검증 절차**:
```bash
# 1. TypeScript 체크
cd statistical-platform
npx tsc --noEmit

# 2. 단위 테스트
npm test -- VariableSelectorModern

# 3. 통합 테스트 (브라우저)
npm run dev
# → http://localhost:3000/statistics/anova
# → http://localhost:3000/statistics/regression
# → http://localhost:3000/statistics/mixed-model

# 체크리스트:
# [ ] 변수 선택 버튼 클릭 → 모달 열림
# [ ] 모달에서 변수 검색 동작
# [ ] 변수 선택 → 칩 표시
# [ ] 칩 × 버튼 → 제거 동작
# [ ] AI 자동 설정 → 추천 변수 할당
# [ ] 검증 메시지 표시 (필수 변수, 샘플 크기)
# [ ] 분석 시작 → 실제 분석 실행
# [ ] 콘솔 에러 없음
```

#### 2.2 사용자 피드백 수렴 (1일)

**피드백 수집 방법**:
- 파일럿 페이지 실제 사용
- UI/UX 개선 사항 기록
- 성능 측정 (변수 선택 완료 시간)

**개선 반영**:
- 긴급: 즉시 수정 후 재테스트
- 일반: Phase 2.4 전에 반영
- 향후: v2.1 마일스톤으로 이동

#### 2.3 자동 변환 스크립트 (4시간)

**파일**: `scripts/migrate-to-modern-selector.js`

**기능**:
```javascript
import fs from 'fs'
import path from 'path'
import glob from 'glob'

const statisticsDir = 'statistical-platform/app/(dashboard)/statistics'
const pageFiles = glob.sync(`${statisticsDir}/*/page.tsx`)

let successCount = 0
let errorCount = 0
const errors = []

pageFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8')

    // 1. import 변경
    content = content.replace(
      /import\s*{\s*VariableSelector(Simple|Premium)?\s*}\s*from\s*['"]@\/components\/variable-selection['"]/g,
      "import { VariableSelectorModern } from '@/components/variable-selection'"
    )

    // 2. 컴포넌트 이름 변경
    content = content.replace(
      /<VariableSelector(Simple|Premium)?(\s|>)/g,
      '<VariableSelectorModern$2'
    )

    content = content.replace(
      /<\/VariableSelector(Simple|Premium)?>/g,
      '</VariableSelectorModern>'
    )

    // 3. 백업 생성
    fs.writeFileSync(`${file}.bak`, fs.readFileSync(file))

    // 4. 파일 저장
    fs.writeFileSync(file, content)

    successCount++
    console.log(`✓ ${file}`)
  } catch (error) {
    errorCount++
    errors.push({ file, error: error.message })
    console.error(`✗ ${file}: ${error.message}`)
  }
})

// 5. 리포트 생성
const report = `
# Migration Report

Date: ${new Date().toISOString()}

## Summary
- Total files: ${pageFiles.length}
- Success: ${successCount}
- Errors: ${errorCount}

## Errors
${errors.map(e => `- ${e.file}: ${e.error}`).join('\n')}

## Next Steps
1. Run TypeScript check: \`npx tsc --noEmit\`
2. Run tests: \`npm test\`
3. Manual review of changed files
4. Commit changes: \`git add . && git commit -m "refactor: migrate to VariableSelectorModern"\`
`

fs.writeFileSync('migration-report.md', report)
console.log('\n' + report)
```

#### 2.4 전체 전환 (42개 페이지)

**실행**:
```bash
# 1. 스크립트 실행
node scripts/migrate-to-modern-selector.js

# 2. TypeScript 체크
npx tsc --noEmit

# 3. 자동 수정 (가능한 경우)
npx eslint --fix app/(dashboard)/statistics/*/page.tsx

# 4. 수동 검토 (에러 발생 파일)
# migration-report.md 참고

# 5. 테스트
npm test

# 6. 커밋
git add .
git commit -m "refactor: migrate all statistics pages to VariableSelectorModern

Changes:
- 42 pages updated
- VariableSelector → VariableSelectorModern
- Consistent UI across all statistics

Migration report: migration-report.md

✓ TypeScript: 0 errors
✓ Tests: All passing

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### 2.5 통합 테스트 (1-2일)

**브라우저 회귀 테스트 매트릭스**:

| 통계 유형 | 대표 페이지 | 테스트 시나리오 |
|----------|------------|----------------|
| 기술통계 | descriptive | 변수 복수 선택 |
| 평균 비교 | t-test, anova | 종속/독립 변수 |
| 상관분석 | correlation | 변수 쌍 선택 |
| 회귀분석 | regression | 종속 1 + 독립 복수 |
| 비모수 검정 | mann-whitney | 범주형 변수 |
| 고급 분석 | mixed-model | 복잡한 역할 구조 |

**체크리스트 (페이지당)**:
- [ ] 페이지 로드 (에러 없음)
- [ ] 변수 선택 모달 열기
- [ ] 검색 기능
- [ ] 변수 선택/해제
- [ ] AI 추천
- [ ] 검증 메시지
- [ ] 분석 실행
- [ ] 결과 렌더링

**자동화 테스트** (선택):
```typescript
// e2e/variable-selection.spec.ts
import { test, expect } from '@playwright/test'

const statisticsPages = [
  'anova', 't-test', 'correlation', 'regression',
  // ... 42개
]

for (const page of statisticsPages) {
  test(`${page}: variable selection workflow`, async ({ page: browser }) => {
    await browser.goto(`/statistics/${page}`)

    // 데이터 업로드
    await browser.click('text=샘플 데이터 사용')
    await browser.click('text=다음')

    // 변수 선택 모달 열기
    await browser.click('text=변수 선택')

    // 첫 번째 변수 선택
    await browser.click('[data-testid="variable-option"]:first-child')
    await browser.click('text=선택')

    // 칩 표시 확인
    await expect(browser.locator('[data-testid="variable-chip"]')).toBeVisible()

    // 분석 시작
    await browser.click('text=분석 시작')

    // 결과 확인
    await expect(browser.locator('[data-testid="results-section"]')).toBeVisible()
  })
}
```

---

### Phase 3: 레거시 정리 (1일)

#### 3.1 Deprecation 마킹

**변경 파일**:
- `components/variable-selection/VariableSelector.tsx`
- `components/variable-selection/VariableSelectorSimple.tsx`
- `components/variable-selection/VariableSelectorPremium.tsx`

**추가 내용**:
```typescript
/**
 * @deprecated Use VariableSelectorModern instead
 * This component will be removed in v2.0
 *
 * Migration guide:
 * ```typescript
 * // Before
 * import { VariableSelector } from '@/components/variable-selection'
 * <VariableSelector methodId="..." data={...} onVariablesSelected={...} />
 *
 * // After
 * import { VariableSelectorModern } from '@/components/variable-selection'
 * <VariableSelectorModern methodId="..." data={...} onVariablesSelected={...} />
 * ```
 */
export function VariableSelector(props: VariableSelectorProps) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] VariableSelector is deprecated and will be removed in v2.0. ' +
      'Please use VariableSelectorModern instead.'
    )
  }

  // ... 기존 코드
}
```

#### 3.2 문서 업데이트

**변경 파일**:
1. `STATISTICS_PAGE_CODING_STANDARDS.md`:
   - 변수 선택 섹션 업데이트
   - VariableSelectorModern 사용 예제 추가

2. `AI-CODING-RULES.md`:
   - 통계 페이지 표준 컴포넌트 업데이트

3. `README.md`:
   - 주요 컴포넌트 목록 업데이트

4. `CHANGELOG.md` (새 파일):
```markdown
# Changelog

## [Unreleased]

### Changed
- **[BREAKING]** VariableSelector replaced with VariableSelectorModern
  - Modern button-based UI with modal selection
  - 300% space efficiency improvement
  - 50% faster variable selection (20s → 10s)
  - All 42 statistics pages migrated

### Deprecated
- VariableSelector (will be removed in v2.0)
- VariableSelectorSimple (will be removed in v2.0)
- VariableSelectorPremium (will be removed in v2.0)
```

#### 3.3 레거시 제거 (v2.0 마일스톤)

**실행 시점**: v2.0 릴리스 시 (최소 3개월 deprecation 기간 후)

```bash
# 1. 사용량 확인 (0개여야 함)
grep -r "VariableSelector[^M]" app/(dashboard)/statistics/*/page.tsx
# → "No matches found" 확인

# 2. 파일 삭제
rm components/variable-selection/VariableSelector.tsx
rm components/variable-selection/VariableSelectorSimple.tsx
rm components/variable-selection/VariableSelectorPremium.tsx

# 3. Export 정리
# components/variable-selection/index.ts
- export { VariableSelector } from './VariableSelector'
- export { VariableSelectorSimple } from './VariableSelectorSimple'
- export { VariableSelectorPremium } from './VariableSelectorPremium'

# 4. 테스트 정리
rm components/variable-selection/__tests__/VariableSelector.test.tsx
rm components/variable-selection/__tests__/VariableSelectorSimple.test.tsx
rm components/variable-selection/__tests__/VariableSelectorPremium.test.tsx

# 5. 커밋
git add .
git commit -m "refactor: remove deprecated variable selector components

- Removed VariableSelector (deprecated in v1.x)
- Removed VariableSelectorSimple (deprecated in v1.x)
- Removed VariableSelectorPremium (deprecated in v1.x)
- All pages now use VariableSelectorModern

BREAKING CHANGE: Legacy variable selector components no longer available

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 📋 작업 일정

| Phase | 작업 | 예상 시간 | 담당 | 완료 예정일 |
|-------|------|----------|------|------------|
| **Phase 1** | **새 컴포넌트 개발** | **2-3일** | | |
| 1.1 | VariableSelectorModern 구조 설계 | 2시간 | Claude | Day 1 |
| 1.2 | VariableRoleField 구현 | 4시간 | Claude | Day 1 |
| 1.3 | VariablePickerModal 구현 | 6시간 | Claude | Day 1-2 |
| 1.4 | VariableOption 구현 | 2시간 | Claude | Day 2 |
| 1.5 | ValidationSummary 구현 | 2시간 | Claude | Day 2 |
| 1.6 | ModernSelectorHeader/Footer 구현 | 2시간 | Claude | Day 2 |
| 1.7 | 메인 컴포넌트 통합 | 4시간 | Claude | Day 2-3 |
| 1.8 | 단위 테스트 작성 | 4시간 | Claude | Day 3 |
| **Phase 2** | **마이그레이션** | **3-5일** | | |
| 2.1 | 파일럿 (3개 페이지) | 1일 | Claude | Day 4 |
| 2.2 | 사용자 피드백 & 개선 | 1일 | User+Claude | Day 5 |
| 2.3 | 자동 변환 스크립트 개발 | 4시간 | Claude | Day 6 |
| 2.4 | 전체 전환 (42개) | 4시간 | Claude | Day 6 |
| 2.5 | 통합 테스트 (수동) | 1-2일 | User+Claude | Day 7-8 |
| **Phase 3** | **정리** | **1일** | | |
| 3.1 | Deprecation 마킹 | 1시간 | Claude | Day 9 |
| 3.2 | 문서 업데이트 | 2시간 | Claude | Day 9 |
| 3.3 | 최종 검토 & 커밋 | 2시간 | User | Day 9 |
| **총 시간** | | **6-9일** | | |

---

## ✅ 성공 기준

### 정량적 지표

- [ ] **TypeScript 컴파일 에러**: 0개
- [ ] **변경된 파일**: 45개+
  - 42개 통계 페이지 (page.tsx)
  - 5개 새 컴포넌트
  - 1개 테스트 파일
  - 3개 문서
- [ ] **단위 테스트 커버리지**: 80% 이상
- [ ] **번들 크기 증가**: 10KB 이하
- [ ] **화면 스크롤 발생률**: 80% 감소 (1080p 기준)
  - Before: 변수 5개에서 스크롤
  - After: 변수 20개까지 스크롤 없음

### 정성적 지표

- [ ] **변수 선택 완료 시간**: 50% 단축
  - Before: 평균 20초
  - After: 평균 10초
- [ ] **사용자 혼란도**: "이게 뭐야?" 반응 제로
- [ ] **접근성**: WCAG 2.1 AA 준수
  - 키보드 네비게이션
  - 스크린 리더 지원
  - 명확한 포커스 표시
- [ ] **일관성**: 42개 페이지 모두 동일한 UI
- [ ] **모바일 대응**: 태블릿(768px) 이상에서 정상 동작

### 성능 지표

- [ ] **초기 렌더링**: < 100ms
- [ ] **모달 열기**: < 50ms
- [ ] **검색 필터링**: < 30ms (100개 변수 기준)
- [ ] **AI 추천 실행**: < 200ms

---

## 🚨 리스크 관리

### 높은 리스크

| 리스크 | 확률 | 영향도 | 완화 전략 |
|--------|------|--------|----------|
| 기존 페이지 레이아웃 깨짐 | 중간 | 높음 | 파일럿 3개 페이지로 사전 검증 |
| TypeScript 타입 호환성 문제 | 낮음 | 높음 | Props 인터페이스 동일하게 유지 |
| 사용자 학습 곡선 | 중간 | 중간 | 직관적인 UI + 툴팁 제공 |

### 중간 리스크

| 리스크 | 확률 | 영향도 | 완화 전략 |
|--------|------|--------|----------|
| 성능 저하 (모달 렌더링) | 낮음 | 중간 | React.memo, useMemo 최적화 |
| 접근성 문제 (키보드 네비게이션) | 중간 | 중간 | shadcn/ui Dialog 기본 지원 활용 |
| 모바일 대응 부족 | 높음 | 낮음 | 모바일은 Phase 4로 이동 (별도 계획) |

### 낮은 리스크

| 리스크 | 확률 | 영향도 | 완화 전략 |
|--------|------|--------|----------|
| 번들 크기 증가 | 낮음 | 낮음 | 기존 컴포넌트 제거로 상쇄 |
| 브라우저 호환성 | 매우 낮음 | 낮음 | 모던 브라우저만 지원 (명시) |

---

## 📚 참고 자료

### 기존 시스템 분석
- `components/variable-selection/VariableSelector.tsx` (822줄)
- `lib/statistics/variable-requirements.ts` (1300줄)
- `lib/services/variable-type-detector.ts` (400줄)

### 디자인 참고
- SPSS Variable View
- Jamovi Variable Assignment
- R Studio Formula Builder

### 기술 스택
- shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog
- shadcn/ui Checkbox: https://ui.shadcn.com/docs/components/checkbox
- Radix UI Primitives: https://www.radix-ui.com/

---

## 🔄 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2025-11-06 | 1.0 | 초안 작성 | Claude |

---

## 📞 문의

- 이슈: GitHub Issues
- 디스커션: GitHub Discussions
- 문서: `docs/VARIABLE_SELECTOR_MODERNIZATION_PLAN.md`
