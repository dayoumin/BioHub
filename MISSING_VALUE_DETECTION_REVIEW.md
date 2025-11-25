# Missing Value Detection Review

## Current Implementation

**File**: `statistical-platform/lib/data-processing.ts:15-26`

```typescript
const MISSING_VALUE_SET = new Set([
  '',        // 빈 문자열
  'na',      // R, pandas (NA, na)
  'n/a',     // Excel (N/A, n/a)
  '-',       // 일반적인 표기 ⚠️
  '.',       // SAS, SPSS ⚠️
  'null',    // 데이터베이스 (NULL, null)
  'nan',     // JavaScript, Python (NaN, nan)
  '#n/a',    // Excel 오류 (#N/A)
  '#na',     // Excel 오류 (#NA)
  'missing', // 일반 (missing, MISSING) ⚠️
]);
```

## Risk Assessment

### ⚠️ Potential False Positives

1. **`'-'` (hyphen)**
   - **Risk**: 카테고리 레이블로 사용 가능
   - **Example**: 성별 데이터에서 `['M', 'F', '-']` (미응답)
   - **Impact**: `uniqueValues` 감소, `missingCount` 증가, 타입 추론 오류 가능

2. **`'.'` (dot)**
   - **Risk**: 소수점 표기 또는 약어
   - **Example**: 직업 코드 `['Dr.', 'Mr.', 'Ms.']`
   - **Impact**: 카테고리 데이터가 숫자로 잘못 인식될 수 있음

3. **`'missing'`**
   - **Risk**: 실제 텍스트 값
   - **Example**: 상태 코드 `['active', 'inactive', 'missing']`
   - **Impact**: 유효한 카테고리가 결측값으로 처리됨

### ✅ Safe Patterns (Low Risk)

- `''` (empty string): 안전
- `'na'`, `'n/a'`: 일반적으로 결측값 전용
- `'null'`: 데이터에서 거의 사용 안 함
- `'nan'`: 숫자 문맥에서만 사용
- `'#n/a'`, `'#na'`: Excel 오류 전용

## Recommendations

### Option A: 엄격한 모드 (Conservative - 추천)

**최소한의 패턴만 인식**:
```typescript
const MISSING_VALUE_SET = new Set([
  '',        // 빈 문자열
  'na',      // R, pandas
  'n/a',     // Excel
  'null',    // 데이터베이스
  'nan',     // 숫자 컨텍스트
  '#n/a',    // Excel 오류
  '#na',     // Excel 오류
]);
```

**제거된 패턴**: `-`, `.`, `missing` (사용자가 명시적으로 지정 필요)

### Option B: 설정 가능 모드 (Configurable)

```typescript
interface MissingValueOptions {
  includeHyphen?: boolean;  // default: false
  includeDot?: boolean;     // default: false
  includeMissing?: boolean; // default: false
}

function isMissingValue(value: unknown, options?: MissingValueOptions): boolean {
  // ...
}
```

### Option C: 컨텍스트 기반 (Context-aware)

```typescript
// 숫자 컬럼에서만 '.'를 결측값으로 인식
if (columnType === 'numeric' && value === '.') {
  return true;
}
```

## Test Coverage

**Current**: `__tests__/lib/data-processing-missing-values.test.ts`
- ✅ 모든 패턴에 대한 테스트 존재
- ❌ False positive 케이스 테스트 없음

**Recommended**:
```typescript
describe('False Positive Prevention', () => {
  it('should NOT treat hyphen as missing in categorical data', () => {
    const result = analyzeColumnDataTypes(['M', 'F', '-']);
    expect(result.uniqueValues).toContain('-');
    expect(result.emptyCount).toBe(0);
  });
});
```

## Decision

**현재 상태 유지** (Breaking Change 없이):
- 기존 테스트와 동작 보존
- CLAUDE.md에 문서화 추가

**미래 개선**:
- v2.0에서 Option A 또는 B 도입
- 사용자 피드백 수집
- Migration Guide 제공

## Documentation Update

Add to `CLAUDE.md`:

```markdown
### ⚠️ Missing Value Detection

**자동 인식 패턴**: `''`, `NA`, `N/A`, `-`, `.`, `NULL`, `NaN`, `#N/A`, `#NA`, `missing`

**주의사항**:
- `-`, `.`, `missing`은 카테고리 레이블로 사용 시 결측값으로 인식될 수 있음
- 의도적으로 사용하는 경우 다른 값으로 변경 권장 (예: `Not Reported`, `Unknown`)
```
