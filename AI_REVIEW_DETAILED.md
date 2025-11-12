# Detailed AI Code Review Request

**Date**: 2025-11-12
**Commit**: f185594
**Author**: Claude Code
**Files Changed**: 6 files (+280, -62 lines)

---

## 📋 Executive Summary

This commit fixes 3 variable role mapping issues identified in a previous AI review:
1. **Kruskal-Wallis**: `multiple: false` but type was `string[]` → Changed to `string`
2. **Proportion Test**: Type used `factor` but requirements defined `role: 'dependent'` → Changed to `dependent`
3. **McNemar**: Used old pattern `{ variables }` → Standardized to `{ dependent }`

All changes follow the coding standards defined in `CLAUDE.md` and `STATISTICS_CODING_STANDARDS.md` (Sections 17-19).

**Verification**:
- ✅ TypeScript: 0 errors
- ✅ Tests: 16/16 passed
- ✅ Standards: 100% compliance

---

## 🔍 Detailed Code Changes

### File 1: `types/statistics.ts` (2 changes)

#### Change 1.1: KruskalWallisVariables.factor (Line 214)

**Before**:
```typescript
export interface KruskalWallisVariables {
  dependent: string // 1개
  factor: string[] // 3개 이상 (variable-requirements.ts: role: 'factor')
}
```

**After**:
```typescript
export interface KruskalWallisVariables {
  dependent: string // 1개
  factor: string // 1개 (variable-requirements.ts: role: 'factor', multiple: false) - 그룹값이 3개 이상
}
```

**Rationale**:
- `variable-requirements.ts` defines `role: 'factor', multiple: false`
- Type should be `string`, not `string[]` when `multiple: false`
- Comment clarifies: "그룹값이 3개 이상" means the column contains 3+ group values (e.g., A, B, C), NOT 3+ columns

**Impact**:
- Affects `kruskal-wallis/page.tsx` (must remove `[0]` indexing)
- Affects converter `toKruskalWallisVariables` (must use `toSingleString`)

---

#### Change 1.2: ProportionTestVariables (Line 261)

**Before**:
```typescript
// 비율 검정
export interface ProportionTestVariables {
  factor: string[] // 1-2개 (variable-requirements.ts: role: 'factor')
}
```

**After**:
```typescript
// 비율 검정
export interface ProportionTestVariables {
  dependent: string // 1개 (variable-requirements.ts: role: 'dependent', multiple: false)
}
```

**Rationale**:
- `variable-requirements.ts` defines `role: 'dependent'`, NOT `'factor'`
- Previous implementation was misaligned with requirements
- Proportion test analyzes a binary dependent variable (success/failure)

**Impact**:
- Changes field name from `factor` to `dependent`
- Changes type from `string[]` to `string`
- Affects converter `toProportionTestVariables`

---

### File 2: `types/statistics-converters.ts` (4 changes)

#### Change 2.1: Import McNemarVariables (Line 20)

**Before**:
```typescript
import type {
  ANCOVAVariables,
  ANOVAVariables,
  ChiSquareIndependenceVariables,
  CorrelationVariables,
  // ... (McNemarVariables missing)
  MannWhitneyVariables,
  MANOVAVariables,
```

**After**:
```typescript
import type {
  ANCOVAVariables,
  ANOVAVariables,
  ChiSquareIndependenceVariables,
  BinomialTestVariables,
  CorrelationVariables,
  // ...
  MannWhitneyVariables,
  McNemarVariables,  // ← Added
  MANOVAVariables,
  MoodMedianVariables,
```

**Note**: Also added `BinomialTestVariables` and `MoodMedianVariables` (bonus fixes from other session).

---

#### Change 2.2: toKruskalWallisVariables (Line 113)

**Before**:
```typescript
export function toKruskalWallisVariables(vars: VariableAssignment): KruskalWallisVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toStringArray(vars.factor || vars.groups)  // ← Array conversion
  }
}
```

**After**:
```typescript
export function toKruskalWallisVariables(vars: VariableAssignment): KruskalWallisVariables {
  return {
    dependent: toSingleString(vars.dependent),
    factor: toSingleString(vars.factor || vars.groups)  // ← Single string conversion
  }
}
```

**Rationale**:
- Must match type definition: `factor: string`
- Fallback to `vars.groups` for backward compatibility with old code

**Helper function reference**:
```typescript
function toSingleString(value: string | string[] | undefined): string {
  if (!value) return ''
  return Array.isArray(value) ? value[0] || '' : value
}
```

---

#### Change 2.3: toProportionTestVariables (Line 188)

**Before**:
```typescript
export function toProportionTestVariables(vars: VariableAssignment): ProportionTestVariables {
  return {
    factor: toStringArray(vars.factor || vars.groups || vars.variables)
  }
}
```

**After**:
```typescript
export function toProportionTestVariables(vars: VariableAssignment): ProportionTestVariables {
  return {
    dependent: toSingleString(vars.dependent || vars.variable)
  }
}
```

**Changes**:
1. Field name: `factor` → `dependent`
2. Converter: `toStringArray()` → `toSingleString()`
3. Fallbacks: Simplified from `factor || groups || variables` → `dependent || variable`

**Rationale**:
- Aligns with `role: 'dependent'` in requirements
- Fallback to `vars.variable` (singular) for old code that used generic naming

---

#### Change 2.4: toMcNemarVariables (NEW - Lines 130-134)

**New function added**:
```typescript
export function toMcNemarVariables(vars: VariableAssignment): McNemarVariables {
  return {
    dependent: toStringArray(vars.dependent || vars.variables)
  }
}
```

**Rationale**:
- Previously missing converter for McNemar test
- McNemar requires 2 dependent variables (before/after measurements)
- Fallback to `vars.variables` for backward compatibility

**Type reference**:
```typescript
// types/statistics.ts
export interface McNemarVariables {
  dependent: string[] // 2개 (variable-requirements.ts: role: 'dependent', multiple: true, minCount: 2, maxCount: 2)
}
```

---

### File 3: `kruskal-wallis/page.tsx` (3 changes)

#### Change 3.1: handleVariableSelection validation (Line 172)

**Before**:
```typescript
const handleVariableSelection = createVariableSelectionHandler<KruskalWallisVariables>(
  (vars) => actions.setSelectedVariables?.(vars ? toKruskalWallisVariables(...) : null),
  (variables) => {
    if (variables.dependent && variables.factor && variables.factor.length >= 1) {
      void runAnalysis(variables)
    }
  },
  'kruskal-wallis'
)
```

**After**:
```typescript
const handleVariableSelection = createVariableSelectionHandler<KruskalWallisVariables>(
  (vars) => actions.setSelectedVariables?.(vars ? toKruskalWallisVariables(...) : null),
  (variables) => {
    if (variables.dependent && variables.factor) {  // ← Removed .length check
      void runAnalysis(variables)
    }
  },
  'kruskal-wallis'
)
```

**Rationale**:
- `factor` is now `string`, not `string[]`
- Cannot check `.length` on string type
- Truthiness check is sufficient (empty string is falsy)

---

#### Change 3.2: runAnalysis validation (Line 180)

**Before**:
```typescript
const runAnalysis = async (variables: KruskalWallisVariables) => {
  if (!uploadedData || !pyodide || !variables.dependent || !variables.factor || variables.factor.length === 0) {
    actions.setError?.('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
    return
  }
```

**After**:
```typescript
const runAnalysis = async (variables: KruskalWallisVariables) => {
  if (!uploadedData || !pyodide || !variables.dependent || !variables.factor) {  // ← Removed length check
    actions.setError?.('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
    return
  }
```

**Rationale**: Same as Change 3.1

---

#### Change 3.3: groupColumn extraction (Line 189)

**Before**:
```typescript
try {
  const valueColumn = variables.dependent
  const groupColumn = variables.factor[0]  // ← Array indexing

  // 그룹별 데이터 추출
  const groups: Record<string, number[]> = {}
  uploadedData.data.forEach(row => {
    const groupValue = String(row[groupColumn] ?? '')
    // ...
  })
```

**After**:
```typescript
try {
  const valueColumn = variables.dependent
  const groupColumn = variables.factor  // ← Direct access

  // 그룹별 데이터 추출
  const groups: Record<string, number[]> = {}
  uploadedData.data.forEach(row => {
    const groupValue = String(row[groupColumn] ?? '')
    // ...
  })
```

**Rationale**:
- `factor` is now a string (column name), not an array
- No need for `[0]` indexing
- Rest of the logic remains unchanged (uses column name to access row data)

---

### File 4: `mcnemar/page.tsx` (2 major changes)

#### Change 4.1: Imports (Lines 5-6)

**Before**:
```typescript
import type { McNemarVariables } from '@/types/statistics'
// (No converter import)
```

**After**:
```typescript
import type { McNemarVariables } from '@/types/statistics'
import { toMcNemarVariables, type VariableAssignment } from '@/types/statistics-converters'
```

**Rationale**: Need converter to transform VariableAssignment → McNemarVariables

---

#### Change 4.2: runAnalysis signature and validation (Lines 140-147)

**Before**:
```typescript
const runAnalysis = useCallback(async (variables: string[]) => {
  if (!uploadedData || variables.length < 2) return

  actions.startAnalysis()

  try {
    const variable1 = variables[0]
    const variable2 = variables[1]
    // ... rest of analysis
  }
}, [uploadedData, convertToBinary, actions])
```

**After**:
```typescript
const runAnalysis = useCallback(async (variables: McNemarVariables) => {
  if (!uploadedData || !variables.dependent || variables.dependent.length < 2) return

  actions.startAnalysis()

  try {
    const variable1 = variables.dependent[0]
    const variable2 = variables.dependent[1]
    // ... rest of analysis
  }
}, [uploadedData, convertToBinary, actions])
```

**Changes**:
1. Parameter type: `string[]` → `McNemarVariables`
2. Validation: `variables.length < 2` → `variables.dependent.length < 2`
3. Access: `variables[0]` → `variables.dependent[0]`

**Rationale**: Use standardized type instead of raw array

---

#### Change 4.3: handleVariableSelection (Lines 246-254)

**Before** (Old pattern):
```typescript
const handleVariableSelection = createVariableSelectionHandler<unknown>(
  actions.setSelectedVariables as ((mapping: unknown) => void) | undefined,
  (variables) => {
    if (!variables || typeof variables !== 'object') return

    // Extract variable names from the selection object
    const variableSelection = variables as { variables: string[] }
    const selectedVars = variableSelection.variables || []

    // 자동으로 분석 실행
    runAnalysis(selectedVars)
  },
  'mcnemar'
)
```

**After** (Standard pattern):
```typescript
const handleVariableSelection = createVariableSelectionHandler<McNemarVariables>(
  (vars) => actions.setSelectedVariables?.(vars ? toMcNemarVariables(vars as unknown as VariableAssignment) : null),
  (variables) => {
    if (variables.dependent && variables.dependent.length === 2) {
      void runAnalysis(variables)
    }
  },
  'mcnemar'
)
```

**Changes**:
1. Generic type: `<unknown>` → `<McNemarVariables>`
2. First callback: Uses `toMcNemarVariables` converter
3. Second callback: Direct field access (`variables.dependent`)
4. Validation: Checks `dependent.length === 2` (McNemar requires exactly 2 variables)

**Rationale**:
- Consistent with other statistics pages (e.g., Kruskal-Wallis, ANOVA)
- Type-safe (no `as unknown` casts in business logic)
- Clearer validation logic

---

### File 5: `chi-square-independence/page.tsx` (OTHER SESSION WORK)

**Note**: This file was modified in a different session and is not part of the 3 AI review fixes.
Changes include refactoring and cleanup. Not detailed here to avoid confusion.

---

### File 6: `__tests__/types/ai-review-fixes.test.ts` (NEW FILE)

**Purpose**: Comprehensive test coverage for all 3 fixes

**Test structure**:
```typescript
describe('AI Review Fix Validation', () => {
  // Issue 1: Kruskal-Wallis (3 tests)
  describe('Issue 1: Kruskal-Wallis factor standardization', () => {
    it('should convert single factor to string (not array)')
    it('should handle fallback to groups')
    it('should convert array to single string')
  })

  // Issue 2: Proportion Test (3 tests)
  describe('Issue 2: Proportion Test variable role alignment', () => {
    it('should use dependent field (not factor)')
    it('should handle fallback to variable')
    it('should NOT have factor field')
  })

  // Issue 3: McNemar (4 tests)
  describe('Issue 3: McNemar variables type usage', () => {
    it('should use McNemarVariables (dependent: string[])')
    it('should handle fallback to variables')
    it('should convert single string to array')
    it('should NOT have variables field (old pattern)')
  })

  // Cross-validation (3 tests)
  describe('Cross-validation: Type consistency', () => {
    it('KruskalWallisVariables.factor should match variable-requirements.ts')
    it('ProportionTestVariables.dependent should match variable-requirements.ts')
    it('McNemarVariables.dependent should match variable-requirements.ts')
  })

  // Edge cases (3 tests)
  describe('Edge cases', () => {
    it('should handle empty/undefined gracefully - Kruskal-Wallis')
    it('should handle empty/undefined gracefully - Proportion Test')
    it('should handle empty/undefined gracefully - McNemar')
  })
})
```

**Key test examples**:

#### Test 1: Kruskal-Wallis factor type
```typescript
it('should convert single factor to string (not array)', () => {
  const input: VariableAssignment = {
    dependent: 'Score',
    factor: 'Treatment'
  }

  const result: KruskalWallisVariables = toKruskalWallisVariables(input)

  expect(typeof result.factor).toBe('string')  // ✓ Must be string
  expect(result.factor).toBe('Treatment')
  expect(result.dependent).toBe('Score')
})
```

#### Test 2: Proportion Test role alignment
```typescript
it('should NOT have factor field', () => {
  const input: VariableAssignment = {
    dependent: 'Success'
  }

  const result = toProportionTestVariables(input) as Record<string, unknown>

  expect('factor' in result).toBe(false)  // ✓ factor field removed
  expect(result.dependent).toBe('Success')
})
```

#### Test 3: McNemar standard pattern
```typescript
it('should NOT have variables field (old pattern)', () => {
  const input: VariableAssignment = {
    dependent: ['Var1', 'Var2']
  }

  const result = toMcNemarVariables(input) as Record<string, unknown>

  expect('variables' in result).toBe(false)  // ✓ Old pattern removed
  expect(result.dependent).toEqual(['Var1', 'Var2'])
})
```

**Test results**: All 16 tests passed ✅

---

## 📊 Full Git Diff

```diff
diff --git a/statistical-platform/types/statistics.ts b/statistical-platform/types/statistics.ts
index 4a37c03..f80b060 100644
--- a/statistical-platform/types/statistics.ts
+++ b/statistical-platform/types/statistics.ts
@@ -211,7 +211,7 @@ export interface MannWhitneyVariables {

 export interface KruskalWallisVariables {
   dependent: string // 1개
-  factor: string[] // 3개 이상 (variable-requirements.ts: role: 'factor')
+  factor: string // 1개 (variable-requirements.ts: role: 'factor', multiple: false) - 그룹값이 3개 이상
 }

 export interface WilcoxonVariables {
@@ -258,7 +258,7 @@ export interface KSTestVariables {

 // 비율 검정
 export interface ProportionTestVariables {
-  factor: string[] // 1-2개 (variable-requirements.ts: role: 'factor')
+  dependent: string // 1개 (variable-requirements.ts: role: 'dependent', multiple: false)
 }

 // 생존분석

diff --git a/statistical-platform/types/statistics-converters.ts b/statistical-platform/types/statistics-converters.ts
index 8a4c7e1..b5e3c9a 100644
--- a/statistical-platform/types/statistics-converters.ts
+++ b/statistical-platform/types/statistics-converters.ts
@@ -8,9 +8,12 @@ import type {
   ANCOVAVariables,
   ANOVAVariables,
   ChiSquareIndependenceVariables,
+  BinomialTestVariables,
   CorrelationVariables,
   DiscriminantVariables,
+  MoodMedianVariables,
   // ... (trimmed for brevity)
+  McNemarVariables,
   ProportionTestVariables,
   // ...
 } from './statistics'
@@ -110,7 +113,7 @@ export function toFriedmanVariables(vars: VariableAssignment): FriedmanVariable
 export function toKruskalWallisVariables(vars: VariableAssignment): KruskalWallisVariables {
   return {
     dependent: toSingleString(vars.dependent),
-    factor: toStringArray(vars.factor || vars.groups)
+    factor: toSingleString(vars.factor || vars.groups)
   }
 }

@@ -127,6 +130,11 @@ export function toMannWhitneyVariables(vars: VariableAssignment): MannWhitneyVa
   }
 }

+export function toMcNemarVariables(vars: VariableAssignment): McNemarVariables {
+  return {
+    dependent: toStringArray(vars.dependent || vars.variables)
+  }
+}
+
 // ... (more functions)

 export function toProportionTestVariables(vars: VariableAssignment): ProportionTestVariables {
   return {
-    factor: toStringArray(vars.factor || vars.groups || vars.variables)
+    dependent: toSingleString(vars.dependent || vars.variable)
   }
 }

diff --git a/statistical-platform/app/(dashboard)/statistics/kruskal-wallis/page.tsx b/statistical-platform/app/(dashboard)/statistics/kruskal-wallis/page.tsx
index a1b2c3d..e4f5a6b 100644
--- a/statistical-platform/app/(dashboard)/statistics/kruskal-wallis/page.tsx
+++ b/statistical-platform/app/(dashboard)/statistics/kruskal-wallis/page.tsx
@@ -169,7 +169,7 @@ export default function KruskalWallisTestPage() {
   const handleVariableSelection = createVariableSelectionHandler<KruskalWallisVariables>(
     (vars) => actions.setSelectedVariables?.(vars ? toKruskalWallisVariables(vars as unknown as VariableAssignment) : null),
     (variables) => {
-      if (variables.dependent && variables.factor && variables.factor.length >= 1) {
+      if (variables.dependent && variables.factor) {
         void runAnalysis(variables)
       }
     },
@@ -177,7 +177,7 @@ export default function KruskalWallisTestPage() {
   )

   const runAnalysis = async (variables: KruskalWallisVariables) => {
-    if (!uploadedData || !pyodide || !variables.dependent || !variables.factor || variables.factor.length === 0) {
+    if (!uploadedData || !pyodide || !variables.dependent || !variables.factor) {
       actions.setError?.('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
       return
     }
@@ -186,7 +186,7 @@ export default function KruskalWallisTestPage() {

     try {
       const valueColumn = variables.dependent
-      const groupColumn = variables.factor[0]
+      const groupColumn = variables.factor

       // 그룹별 데이터 추출
       const groups: Record<string, number[]> = {}

diff --git a/statistical-platform/app/(dashboard)/statistics/mcnemar/page.tsx b/statistical-platform/app/(dashboard)/statistics/mcnemar/page.tsx
index 7c8d9e1..2a3b4c5 100644
--- a/statistical-platform/app/(dashboard)/statistics/mcnemar/page.tsx
+++ b/statistical-platform/app/(dashboard)/statistics/mcnemar/page.tsx
@@ -3,6 +3,7 @@
 import React, { useState, useCallback, useEffect } from 'react'
 import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
 import type { McNemarVariables } from '@/types/statistics'
+import { toMcNemarVariables, type VariableAssignment } from '@/types/statistics-converters'
 // ... (imports trimmed)

@@ -138,8 +139,8 @@ export default function McNemarTestPage() {
     return binary
   }, [])

-  const runAnalysis = useCallback(async (variables: string[]) => {
-    if (!uploadedData || variables.length < 2) return
+  const runAnalysis = useCallback(async (variables: McNemarVariables) => {
+    if (!uploadedData || !variables.dependent || variables.dependent.length < 2) return

     actions.startAnalysis()

     try {
-      const variable1 = variables[0]
-      const variable2 = variables[1]
+      const variable1 = variables.dependent[0]
+      const variable2 = variables.dependent[1]

       // ... (rest of analysis logic unchanged)
     }
@@ -244,18 +245,12 @@ export default function McNemarTestPage() {
     }
   }, [uploadedData, convertToBinary, actions])

-  const handleVariableSelection = createVariableSelectionHandler<unknown>(
-    actions.setSelectedVariables as ((mapping: unknown) => void) | undefined,
+  const handleVariableSelection = createVariableSelectionHandler<McNemarVariables>(
+    (vars) => actions.setSelectedVariables?.(vars ? toMcNemarVariables(vars as unknown as VariableAssignment) : null),
     (variables) => {
-      if (!variables || typeof variables !== 'object') return
-
-      // Extract variable names from the selection object
-      const variableSelection = variables as { variables: string[] }
-      const selectedVars = variableSelection.variables || []
-
-      // 자동으로 분석 실행
-      runAnalysis(selectedVars)
+      if (variables.dependent && variables.dependent.length === 2) {
+        void runAnalysis(variables)
+      }
     },
     'mcnemar'
   )
```

---

## ❓ Critical Review Questions

### 1. Type Safety
**Q1**: In Kruskal-Wallis, we changed `factor: string[]` to `factor: string`. Is this safe for all existing data flows?

**Context**: The converter uses `toSingleString()`, which handles both `string` and `string[]` inputs:
```typescript
function toSingleString(value: string | string[] | undefined): string {
  if (!value) return ''
  return Array.isArray(value) ? value[0] || '' : value
}
```

**Q2**: What happens if the VariableSelector mistakenly sends an empty string `''` for `factor`?
- Current validation: `if (variables.factor)` would pass (truthy check)
- Should we add `.trim()` check or minimum length validation?

### 2. Backward Compatibility
**Q3**: Converter fallbacks - are these sufficient?

```typescript
// Kruskal-Wallis
factor: toSingleString(vars.factor || vars.groups)  // ← Is 'groups' fallback still needed?

// Proportion Test
dependent: toSingleString(vars.dependent || vars.variable)  // ← Is 'variable' fallback used anywhere?

// McNemar
dependent: toStringArray(vars.dependent || vars.variables)  // ← Is 'variables' fallback still needed?
```

**Q4**: Are there any old pages/tests that still use the old field names (`groups`, `variable`, `variables`)?

### 3. Edge Cases
**Q5**: What happens if `factor` is an array with multiple elements (e.g., `['Group1', 'Group2']`) in Kruskal-Wallis?
- Current behavior: `toSingleString(['Group1', 'Group2'])` → `'Group1'`
- Is silently taking the first element acceptable, or should we throw an error?

**Q6**: McNemar requires exactly 2 variables. Current validation:
```typescript
if (variables.dependent && variables.dependent.length === 2) {
  void runAnalysis(variables)
}
```
- What if `length === 1` or `length === 3`? Should we show a user-friendly error message?

### 4. Implementation Details
**Q7**: In `mcnemar/page.tsx`, why do we use `void` keyword?
```typescript
void runAnalysis(variables)  // ← Intentional?
```

**Q8**: Should we add TypeScript strict null checks in `runAnalysis` functions?
```typescript
// Current
const variable1 = variables.dependent[0]  // ← Could be undefined

// Should we add?
const variable1 = variables.dependent[0]
if (!variable1 || !variable2) {
  actions.setError?.('변수를 선택해주세요.')
  return
}
```

### 5. Consistency
**Q9**: Why does McNemar use strict equality check `=== 2`, but Kruskal-Wallis uses truthiness?

```typescript
// McNemar
if (variables.dependent && variables.dependent.length === 2)

// Kruskal-Wallis
if (variables.dependent && variables.factor)  // ← No length check
```

Is this intentional based on requirements, or should we be consistent?

**Q10**: Should we add similar tests for Kruskal-Wallis and Proportion Test pages (not just converters)?

---

## 🔬 Verification Checklist

Please verify:

### Type Mappings
- [ ] Kruskal-Wallis: `variable-requirements.ts` `multiple: false` matches `types/statistics.ts` `factor: string`
- [ ] Proportion Test: `variable-requirements.ts` `role: 'dependent'` matches `types/statistics.ts` `dependent: string`
- [ ] McNemar: `variable-requirements.ts` `multiple: true, minCount: 2` matches `types/statistics.ts` `dependent: string[]`

### Converter Logic
- [ ] `toKruskalWallisVariables` correctly converts `factor` to single string
- [ ] `toProportionTestVariables` uses `dependent` field (not `factor`)
- [ ] `toMcNemarVariables` correctly converts `dependent` to array
- [ ] All fallback patterns are appropriate

### Page Implementations
- [ ] Kruskal-Wallis: `variables.factor` direct access works (no `[0]` needed)
- [ ] Kruskal-Wallis: Validation logic is correct (no `.length` checks)
- [ ] McNemar: `runAnalysis` parameter type is correct (`McNemarVariables`)
- [ ] McNemar: `variables.dependent[0]` and `[1]` access is safe

### Edge Cases
- [ ] Empty/undefined values are handled gracefully
- [ ] Type coercion scenarios are covered
- [ ] Error messages are user-friendly

### Side Effects
- [ ] No unintended changes to `MannWhitneyVariables`, `NonParametricVariables`, or `WelchTVariables`
- [ ] All similar patterns (`factor: string[]`) remain unchanged where appropriate

### Tests
- [ ] All 16 tests pass
- [ ] Test coverage is comprehensive
- [ ] No missing edge cases

---

## 📁 Files for Deep Review

### Must Review (Core Changes)
1. `types/statistics.ts` - Lines 214, 261
2. `types/statistics-converters.ts` - Lines 113, 130-134, 188
3. `kruskal-wallis/page.tsx` - Lines 172, 180, 189

### Should Review (Implementation)
4. `mcnemar/page.tsx` - Lines 5, 140-141, 146-147, 246-254

### Nice to Review (Tests)
5. `__tests__/types/ai-review-fixes.test.ts` - All 16 tests

---

## 🔗 References

- Commit: `f185594`
- Coding Standards: `CLAUDE.md` Section 17-19, `STATISTICS_CODING_STANDARDS.md` Section 17-19
- Source of Truth: `lib/statistics/variable-requirements.ts`
- Full Diff: 514 lines available in `/tmp/full_diff.txt`

---

**Ready for detailed code review** ✅

Please provide feedback on:
1. Type safety concerns
2. Edge cases we may have missed
3. Suggestions for improved error handling
4. Any potential runtime issues
