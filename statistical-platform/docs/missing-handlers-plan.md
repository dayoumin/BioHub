# 누락 핸들러 구현 계획

**목표**: 20개 누락 핸들러 구현
**우선순위**: Pyodide 메서드 존재 여부 기준

---

## 📊 현황 분석

### ✅ Pyodide 메서드 존재 (우선 구현)

| 핸들러 | Pyodide 메서드 | 파일 | 우선순위 |
|--------|----------------|------|----------|
| cronbachAlpha | ✅ cronbachAlpha | descriptive.ts | High |
| factorAnalysis | ✅ factorAnalysis | advanced.ts | High |

### ⚠️ Pyodide 메서드 미확인 (구현 또는 추가 필요)

| 핸들러 | 예상 Pyodide 메서드 | 파일 | 우선순위 |
|--------|---------------------|------|----------|
| crosstabAnalysis | crosstab? | descriptive.ts | Medium |
| oneSampleProportionTest | proportionTest? | hypothesis-tests.ts | High |
| threeWayANOVA | threeWayANOVA? | anova.ts | Low |
| ancova | ancova? | anova.ts | Medium |
| repeatedMeasuresANOVA | rmANOVA? | anova.ts | Medium |
| partialCorrelation | partialCorr? | regression.ts | High |
| stepwiseRegression | stepwiseRegression? | regression.ts | Low |
| ordinalRegression | ordinalRegression? | regression.ts | Low |
| poissonRegression | poissonRegression? | regression.ts | Medium |
| doseResponse | doseResponse? | regression.ts | Low |
| responseSurface | responseSurface? | regression.ts | Low |
| signTest | signTest? | nonparametric.ts | Medium |
| runsTest | runsTest? | nonparametric.ts | Low |
| ksTest | ✅ kolmogorovSmirnovTest | nonparametric.ts | High |
| mcNemarTest | mcNemarTest? | nonparametric.ts | Medium |
| discriminantAnalysis | discriminantAnalysis? | advanced.ts | Low |
| mannKendallTest | mannKendallTest? | advanced.ts | Medium |
| powerAnalysis | powerAnalysis? | advanced.ts | High |

---

## 🎯 구현 전략

### Phase 1: Quick Wins (Pyodide 메서드 존재)

**1. cronbachAlpha** (descriptive.ts)
```typescript
// ✅ Pyodide: async cronbachAlpha(items: number[][]): Promise<{...}>
// 신뢰도 분석 (Cronbach's α)
```

**2. factorAnalysis** (advanced.ts)
```typescript
// ✅ Pyodide: async factorAnalysis(data: number[][], options: {...})
// 요인분석
```

**3. ksTest** (nonparametric.ts)
```typescript
// ✅ Pyodide: async kolmogorovSmirnovTest(data: number[]): Promise<{...}>
// K-S 검정
```

---

### Phase 2: Pyodide 메서드 추가 필요 (중요도 높음)

**4. oneSampleProportionTest** (hypothesis-tests.ts)
```python
# Pyodide에 추가
from scipy.stats import binomtest

def one_sample_proportion_test(successes, n, p0, alternative='two-sided'):
    result = binomtest(successes, n, p0, alternative=alternative)
    return {
        'statistic': result.statistic,
        'pValue': result.pvalue,
        'proportion': successes / n,
        'ci_lower': result.proportion_ci().low,
        'ci_upper': result.proportion_ci().high
    }
```

**5. partialCorrelation** (regression.ts)
```python
# Pyodide에 추가
import pingouin as pg

def partial_correlation(x, y, control):
    result = pg.partial_corr(data=df, x=x, y=y, covar=control)
    return result.to_dict()
```

**6. powerAnalysis** (advanced.ts)
```python
# Pyodide에 추가
from statsmodels.stats.power import ttest_power

def power_analysis(effect_size, n, alpha=0.05):
    power = ttest_power(effect_size, n, alpha)
    return {'power': power, 'n': n, 'effect_size': effect_size}
```

---

### Phase 3: 구현 복잡도 높음 (나중에)

**7. ancova** (anova.ts)
**8. repeatedMeasuresANOVA** (anova.ts)
**9. stepwiseRegression** (regression.ts)
**10. ordinalRegression** (regression.ts)
**11. poissonRegression** (regression.ts)
**12. doseResponse** (regression.ts)
**13. responseSurface** (regression.ts)
**14. signTest** (nonparametric.ts)
**15. runsTest** (nonparametric.ts)
**16. mcNemarTest** (nonparametric.ts)
**17. discriminantAnalysis** (advanced.ts)
**18. mannKendallTest** (advanced.ts)
**19. threeWayANOVA** (anova.ts)
**20. crosstabAnalysis** (descriptive.ts)

---

## 🚀 실행 계획

### 오늘 (2025-10-01)

**Step 1: Pyodide 메서드 확인**
```bash
grep -n "async" pyodide-statistics.ts | grep -E "proportion|partial|power|mcnemar|sign|runs"
```

**Step 2: Quick Wins 구현 (3개)**
- [ ] cronbachAlpha
- [ ] factorAnalysis
- [ ] ksTest

**Step 3: Pyodide 메서드 추가 (3개)**
- [ ] oneSampleProportionTest
- [ ] partialCorrelation
- [ ] powerAnalysis

**목표**: 오늘 6개 완료

---

### 내일 이후

**Phase 2 완료 (6-8개)**
- [ ] ancova
- [ ] poissonRegression
- [ ] signTest
- [ ] mcNemarTest
- [ ] mannKendallTest
- [ ] crosstabAnalysis

**Phase 3 (나머지 6-8개)**
- [ ] repeatedMeasuresANOVA
- [ ] stepwiseRegression
- [ ] ordinalRegression
- [ ] doseResponse
- [ ] responseSurface
- [ ] discriminantAnalysis
- [ ] runsTest
- [ ] threeWayANOVA

---

## 📝 구현 체크리스트

각 핸들러 구현 시:

1. **Pyodide 메서드 확인**
   - [ ] 메서드 존재 확인
   - [ ] 파라미터 구조 확인
   - [ ] 반환값 구조 확인

2. **핸들러 작성**
   - [ ] 파라미터 검증
   - [ ] 데이터 추출 (extractNumericColumn 등)
   - [ ] Pyodide 호출
   - [ ] 결과 포맷팅
   - [ ] 해석 함수

3. **테스트 작성**
   - [ ] Mock Pyodide 응답
   - [ ] 정상 케이스
   - [ ] 에러 케이스
   - [ ] 엣지 케이스

4. **등록**
   - [ ] createXxxHandlers에 추가
   - [ ] HandlerMap 타입 확인

---

## 💡 예상 소요 시간

| Phase | 작업 | 소요 시간 |
|-------|------|-----------|
| Phase 1 | Quick Wins (3개) | 1-2시간 |
| Phase 2 | Pyodide 추가 (3개) | 2-3시간 |
| Phase 2 나머지 | 6-8개 | 1-2일 |
| Phase 3 | 복잡한 것들 (6-8개) | 2-3일 |
| **총계** | **20개** | **3-5일** |

---

*작성일: 2025-10-01*
