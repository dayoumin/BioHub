# 해석 엔진 향후 개선 계획

**작성일**: 2025-11-23
**우선순위**: Phase 완료 후 (43개 통계 해석 추가 완료 시)

---

## 📋 개선 항목

### ✅ **Phase 1: α 값 명시** (우선순위: 높음)

**목표**: 해석 메시지에 사용된 유의수준 명시 → 투명성 향상

**현재**:
```typescript
"통계적으로 유의한 차이가 있습니다 (p=0.023)."
// → 사용자: "0.05 기준인가? 0.01 기준인가?" 모호함
```

**개선**:
```typescript
"통계적으로 유의한 차이가 있습니다 (p=0.023, α=0.05)."
// → 사용자: "아, 0.05 기준이구나!" 명확함
```

**작업 내역**:
1. `isSignificant(p, alpha)` 함수 수정
   ```typescript
   function isSignificant(p: number, alpha: number = 0.05): boolean {
     if (!Number.isFinite(p) || p < 0) return false
     return p < alpha
   }
   ```

2. `getInterpretation()` 함수에 alpha 파라미터 추가
   ```typescript
   export function getInterpretation(
     results: AnalysisResult,
     purpose?: string,
     options?: { alpha?: number }  // 새 파라미터
   ): InterpretationResult | null
   ```

3. 모든 해석 메시지에 α 값 추가
   ```typescript
   statistical: isSignificant(results.pValue, alpha)
     ? `통계적으로 유의합니다 (p=${formatPValue(results.pValue)}, α=${alpha}).`
     : `통계적으로 유의하지 않습니다 (p=${formatPValue(results.pValue)}, α=${alpha}).`
   ```

4. 테스트 업데이트 (43개 × 3 케이스 = 129개)

**예상 소요 시간**: 1일

**장점**:
- 투명성 향상 (어떤 기준인지 명시)
- 코드 수정 최소 (engine.ts + 테스트만)
- Python Worker 수정 불필요

**단점**:
- 여전히 α=0.05 고정
- 사용자가 기준 변경 불가

---

### 🟡 **Phase 2: UI에서 α 선택 가능** (우선순위: 중간)

**목표**: 사용자가 유의수준을 직접 선택 → 분야별 맞춤 기준

**UI 추가**:
```tsx
// Smart Flow 설정 패널
<Card>
  <CardHeader>
    <CardTitle>분석 옵션</CardTitle>
  </CardHeader>
  <CardContent>
    <Label>유의수준 (α)</Label>
    <Select value={alpha} onValueChange={setAlpha}>
      <SelectItem value="0.10">α = 0.10 (탐색적 연구)</SelectItem>
      <SelectItem value="0.05">α = 0.05 (표준, 권장)</SelectItem>
      <SelectItem value="0.01">α = 0.01 (의학/엄격)</SelectItem>
    </Select>

    <p className="text-sm text-muted-foreground mt-2">
      ℹ️ 유의수준이 낮을수록 더 엄격한 기준입니다.
    </p>
  </CardContent>
</Card>
```

**작업 내역**:
1. Smart Flow 설정 패널에 α 선택 드롭다운 추가
   - 위치: `components/smart-flow/steps/AnalysisOptionsStep.tsx` (신규 생성)
   - 또는 기존 Step에 섹션 추가

2. 해석 엔진 호출 시 alpha 전달
   ```typescript
   const interpretation = getInterpretation(results, purpose, { alpha })
   ```

3. (선택) 개별 통계 페이지에도 UI 추가
   - 43개 페이지 중 **자주 사용하는 20개만** 선택적 추가
   - 또는 Smart Flow만 지원 (개별 페이지는 기본 0.05)

**예상 소요 시간**: 2-3일
- Smart Flow만: 1일
- 개별 페이지 20개: 추가 1-2일

**효과**:
```
사용자 A (의학): α = 0.01 선택
→ p=0.023 → "유의하지 않습니다 (p=0.023, α=0.01)"

사용자 B (사회과학): α = 0.05 선택 (기본값)
→ p=0.023 → "유의합니다 (p=0.023, α=0.05)"

사용자 C (탐색적): α = 0.10 선택
→ p=0.023 → "유의합니다 (p=0.023, α=0.10)"
```

**장점**:
- 사용자 맞춤 기준 (의학 0.01, 표준 0.05, 탐색 0.10)
- Python Worker 수정 불필요 (p-value 기반 판정)

**단점**:
- UI 작업 필요 (Smart Flow + 선택적으로 개별 페이지)
- 사용자 혼란 가능성 (α가 뭔지 모르는 초보자)

---

### 🔵 **Phase 3: 단측 검정 지원** (우선순위: 낮음)

**목표**: 양측 검정뿐만 아니라 단측 검정도 지원

**⚠️ 중요**: **이 작업은 Python Worker 수정 필수**

**현재 한계**:
```python
# Python Worker (양측 p-value만)
statistic, p_value = stats.mannwhitneyu(
    group1, group2,
    alternative='two-sided'  # 🔴 하드코딩
)
```

**필요 작업**:
1. Python Worker 88개 메서드 중 **단측 지원 가능한 20개** 수정
   ```python
   def mann_whitney_test(group1, group2, alternative='two-sided'):
       statistic, p_value = stats.mannwhitneyu(
           group1, group2,
           alternative=alternative  # ✅ 파라미터로 받음
       )
       return {
           'statistic': float(statistic),
           'pValue': float(p_value)  # 단측 p-value
       }
   ```

2. UI 추가 (단측/양측 선택)
   ```tsx
   <RadioGroup value={alternative}>
     <RadioGroupItem value="two-sided">양측 검정</RadioGroupItem>
     <RadioGroupItem value="greater">단측 (>)</RadioGroupItem>
     <RadioGroupItem value="less">단측 (<)</RadioGroupItem>
   </RadioGroup>
   ```

3. 해석 엔진 수정 (방향별 메시지)
   ```typescript
   if (alternative === 'two-sided') {
     statistical = significant
       ? `통계적으로 유의한 차이가 있습니다.`
       : `통계적으로 유의한 차이가 없습니다.`
   } else if (alternative === 'greater') {
     statistical = significant
       ? `집단 1이 집단 2보다 유의하게 큽니다.`
       : `집단 1이 집단 2보다 크다고 할 수 없습니다.`
   }
   ```

**예상 소요 시간**: 3일
- Python Worker: 20개 × 5분 = 1.7시간
- UI 추가: 1일
- 해석 엔진 수정: 1일
- 테스트: 20개 × 3개 (양측/greater/less) = 60개 케이스

**장점**:
- 단측 검정 필요 시 지원 가능 (의학 연구 등)

**단점**:
- Python Worker 대규모 수정 필요
- 초보자 혼란 가능성 높음
- ROI 낮음 (실무에서 양측이 95%+)

**권장**: **우선순위 낮음** (필요 시에만 진행)

---

## 📊 우선순위 요약

| Phase | 작업 | 소요 시간 | 우선순위 | Python 수정 |
|-------|------|-----------|----------|-------------|
| **Phase 1** | α 값 명시 | 1일 | ⭐⭐⭐⭐⭐ 높음 | ❌ 불필요 |
| **Phase 2** | UI α 선택 | 2-3일 | ⭐⭐⭐ 중간 | ❌ 불필요 |
| **Phase 3** | 단측 검정 | 3일 | ⭐ 낮음 | ✅ 필수 (20개) |

---

## ✅ 권장 진행 순서

1. **현재**: 43개 통계 해석 추가 (진행 중)
   - Batch 1-2: 8개 완료 ✅
   - Batch 3-10: 35개 남음 (계속 진행)

2. **Phase 1**: α 값 명시 (1일)
   - 43개 완료 후 즉시 진행
   - 투명성 향상 효과 큼

3. **Phase 2**: UI α 선택 (선택)
   - 사용자 피드백 수집 후 결정
   - Smart Flow만 또는 전체 페이지

4. **Phase 3**: 단측 검정 (보류)
   - 사용자 요청 많으면 진행
   - 없으면 다른 기능 우선

---

## 📝 참고 문서

- [engine.ts](../lib/interpretation/engine.ts) - 현재 해석 엔진
- [types/smart-flow.ts](../types/smart-flow.ts) - AnalysisResult 인터페이스
- [types/statistics.ts](../types/statistics.ts) - CommonStatisticsOptions (α, alternative 정의)
- [INTERPRETATION_TEST_PLAN.md](./INTERPRETATION_TEST_PLAN.md) - 해석 엔진 테스트 계획

---

**최종 업데이트**: 2025-11-23
**작성자**: AI Assistant (Claude Code)
