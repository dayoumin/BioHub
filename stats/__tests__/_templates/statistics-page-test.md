# Statistics Page Test Template

## Overview

Template for testing statistics analysis pages (45+ pages in project).

**Current Standard**: All pages use `useStatisticsPage` hook (Pattern A)

---

## Required Test Cases

### 1. Initial State
```typescript
it('should initialize with default state', () => {
  const { result } = renderHook(() => useStatisticsPage<ResultType>())

  expect(result.current.state.currentStep).toBe(0)
  expect(result.current.state.results).toBeNull()
  expect(result.current.state.isAnalyzing).toBe(false)
})
```

### 2. Data Upload Workflow
```typescript
it('should update state after data upload', () => {
  const { result } = renderHook(() => useStatisticsPage<ResultType>({
    withUploadedData: true
  }))

  act(() => {
    result.current.actions.setUploadedData(mockData)
  })

  expect(result.current.state.uploadedData).toEqual(mockData)
})
```

### 3. Analysis Completion (CRITICAL)
```typescript
it('should complete analysis and reset isAnalyzing flag', () => {
  const { result } = renderHook(() => useStatisticsPage<ResultType>())

  // Start analysis
  act(() => {
    result.current.actions.startAnalysis()
  })
  expect(result.current.state.isAnalyzing).toBe(true)

  // Complete analysis - MUST use completeAnalysis, not setResults
  act(() => {
    result.current.actions.completeAnalysis(mockResults, 3)
  })

  expect(result.current.state.isAnalyzing).toBe(false)
  expect(result.current.state.currentStep).toBe(3)
  expect(result.current.state.results).toEqual(mockResults)
})
```

### 4. Error Handling
```typescript
it('should handle analysis errors', () => {
  const { result } = renderHook(() => useStatisticsPage<ResultType>({
    withError: true
  }))

  act(() => {
    result.current.actions.setError('Analysis failed')
  })

  expect(result.current.state.error).toBe('Analysis failed')
  expect(result.current.state.isAnalyzing).toBe(false)
})
```

### 5. Variable Selection (if applicable)
```typescript
it('should update selected variables', () => {
  const { result } = renderHook(() => useStatisticsPage<ResultType, VariableMapping>({
    withSelectedVariables: true
  }))

  const variables = { dependent: ['var1'], independent: ['var2'] }

  act(() => {
    result.current.actions.setSelectedVariables(variables)
  })

  expect(result.current.state.selectedVariables).toEqual(variables)
})
```

---

## Common Patterns

### Mock Data Structure
```typescript
const mockData = [
  { var1: 10, var2: 20 },
  { var1: 15, var2: 25 },
  { var1: 20, var2: 30 }
]

const mockResults = {
  statistic: 1.234,
  pValue: 0.045,
  // ... other fields specific to analysis
}
```

### Hook Configuration
```typescript
// Basic (most pages)
useStatisticsPage<ResultType>()

// With uploaded data
useStatisticsPage<ResultType>({ withUploadedData: true })

// With variables
useStatisticsPage<ResultType, VariableMapping>({
  withSelectedVariables: true
})

// Full (all features)
useStatisticsPage<ResultType, VariableMapping>({
  withUploadedData: true,
  withSelectedVariables: true,
  withError: true,
  initialStep: 1
})
```

---

## Anti-Patterns (DO NOT USE)

### ❌ Using setResults()
```typescript
// WRONG - leaves isAnalyzing stuck
act(() => {
  result.current.actions.setResults(mockResults)
  result.current.actions.setCurrentStep(3)
})
```

### ❌ Testing internal useState
```typescript
// WRONG - pages no longer use individual useState
const [currentStep, setCurrentStep] = useState(0)
```

### ❌ Mocking entire hook
```typescript
// WRONG - defeats purpose of integration test
jest.mock('@/hooks/use-statistics-page')
```

---

## Coding Standards Reference

- **STATISTICS_PAGE_CODING_STANDARDS.md**: Section 8 (State transitions)
- **TROUBLESHOOTING_ISANALYZING_BUG.md**: completeAnalysis() usage
- **AI-CODING-RULES.md**: TypeScript type safety (no `any`)

---

## Example: Complete Test File

```typescript
/**
 * Test: Friedman Test Page
 *
 * Tests state management and analysis workflow
 */

import { renderHook, act } from '@testing-library/react'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

interface FriedmanResult {
  statistic: number
  pValue: number
  df: number
}

interface FriedmanVariables {
  dependent: string[]
  blocks: string[]
}

describe('Friedman Test Page', () => {
  const mockData = [
    { treatment: 'A', block: '1', value: 10 },
    { treatment: 'B', block: '1', value: 12 },
    { treatment: 'A', block: '2', value: 15 }
  ]

  const mockResults: FriedmanResult = {
    statistic: 5.67,
    pValue: 0.034,
    df: 2
  }

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useStatisticsPage<FriedmanResult, FriedmanVariables>({
        withUploadedData: true,
        withSelectedVariables: true
      })
    )

    expect(result.current.state.currentStep).toBe(0)
    expect(result.current.state.results).toBeNull()
    expect(result.current.state.isAnalyzing).toBe(false)
  })

  it('should complete analysis workflow', () => {
    const { result } = renderHook(() =>
      useStatisticsPage<FriedmanResult, FriedmanVariables>({
        withUploadedData: true,
        withSelectedVariables: true
      })
    )

    // Upload data
    act(() => {
      result.current.actions.setUploadedData(mockData)
    })

    // Select variables
    act(() => {
      result.current.actions.setSelectedVariables({
        dependent: ['value'],
        blocks: ['block']
      })
    })

    // Run analysis
    act(() => {
      result.current.actions.startAnalysis()
    })
    expect(result.current.state.isAnalyzing).toBe(true)

    // Complete analysis - CRITICAL: use completeAnalysis
    act(() => {
      result.current.actions.completeAnalysis(mockResults, 3)
    })

    expect(result.current.state.isAnalyzing).toBe(false)
    expect(result.current.state.currentStep).toBe(3)
    expect(result.current.state.results).toEqual(mockResults)
  })

  it('should handle errors', () => {
    const { result } = renderHook(() =>
      useStatisticsPage<FriedmanResult, FriedmanVariables>({
        withError: true
      })
    )

    act(() => {
      result.current.actions.setError('Analysis failed')
    })

    expect(result.current.state.error).toBe('Analysis failed')
    expect(result.current.state.isAnalyzing).toBe(false)
  })
})
```

---

## Generation Checklist

When AI generates a test:
- [ ] Uses `useStatisticsPage` hook (not individual useState)
- [ ] Tests `completeAnalysis()` (not `setResults()`)
- [ ] Includes isAnalyzing flag verification
- [ ] Uses TypeScript generics for types
- [ ] No `any` types
- [ ] Follows current API (not legacy patterns)
