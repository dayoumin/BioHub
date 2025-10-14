# Pyodide v0.28.3 호환성 테스트 보고서

**날짜**: 2025-10-14
**업그레이드**: v0.24.1 → v0.28.3
**주요 변경**: NumPy 1.26.0 → 2.2.5 (메이저 업그레이드)

---

## 📋 테스트 개요

### 업그레이드 영향 범위

| 패키지 | v0.24.1 | v0.28.3 | 변경 유형 | 리스크 |
|--------|---------|---------|----------|--------|
| NumPy | 1.26.0 | **2.2.5** | 메이저 | ⚠️ High |
| SciPy | 1.11.2 | 1.14.1 | 마이너 | ✅ Low |
| Pandas | 2.1.1 | 2.3.1 | 마이너 | ✅ Low |
| statsmodels | 0.14.0 | 0.14.4 | 패치 | ✅ Low |

---

## 🔍 NumPy 2.0 주요 변경사항 (위험 요소)

### 1. Type Promotion Changes (NEP 50)
```python
# ⚠️ NumPy 1.x
np.float32(3) + 3.  # → float64 (precision loss 없음)

# ✅ NumPy 2.x
np.float32(3) + 3.  # → float32 (precision 유지)
```

**프로젝트 영향**: ✅ **안전**
- 우리 코드는 명시적 타입 캐스팅 없음 (검증 완료)
- `float()` 변환만 사용하여 JSON 직렬화

### 2. Deprecated Functions
```python
# ❌ NumPy 1.x (Deprecated)
np.sometrue()  # → np.any()
np.product()   # → np.prod()
np.in1d()      # → np.isin()
np.trapz()     # → np.trapezoid()
```

**프로젝트 영향**: ✅ **안전**
- Worker 1-4에서 Deprecated 함수 사용 없음 (Grep 검증 완료)

### 3. Copy Keyword Behavior
```python
# ⚠️ 변경됨
np.array(..., copy=False)  # 동작 변경
```

**프로젝트 영향**: ✅ **안전**
- `copy=False` 사용 없음 (검증 완료)

### 4. Complex Number Changes
```python
# ❌ NumPy 1.x
c.real, c.imag  # 직접 접근

# ✅ NumPy 2.x
npy_creal(c), npy_cimag(c)  # 함수 사용
```

**프로젝트 영향**: ✅ **안전**
- 복소수 사용 없음

---

## ✅ 코드 검증 결과

### Worker 1-4 Python 코드 분석

```bash
# Deprecated 함수 검색
grep -r "\.product\(|\.sometrue\(|\.in1d\(|\.trapz\(|copy=False" public/workers/python/
# 결과: 없음 ✅

# 명시적 타입 캐스팅 검색
grep -r "float32|float64|int32|int64" public/workers/python/
# 결과: 없음 ✅

# 복소수 사용 검색
grep -r "\.real|\.imag|complex" public/workers/python/
# 결과: 없음 ✅
```

**결론**: **모든 Worker 1-4 코드가 NumPy 2.x와 호환됩니다.**

---

## 🧪 테스트 계획

### Phase 1: E2E 테스트 업데이트 (필수)

**파일**: `e2e/workers-validation.spec.ts`

**현재 상태**: v0.24.1 하드코딩
```typescript
// 모든 테스트에서
const pyodide = await (window as any).loadPyodide({
  indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
});
```

**변경 필요**: constants.ts 버전 사용
```typescript
import { PYODIDE } from '@/lib/constants'

const pyodide = await (window as any).loadPyodide({
  indexURL: PYODIDE.CDN_URL  // v0.28.3
});
```

### Phase 2: 호환성 테스트 실행

#### Test 1: Worker 1 - Descriptive Statistics
```typescript
test('Worker 1: binomtest (SciPy 1.14.1)', async ({ page }) => {
  // SciPy 1.12 → 1.14 호환성 검증
  // binomtest API 변경 여부 확인
})
```

#### Test 2: Worker 2 - Hypothesis Testing
```typescript
test('Worker 2: 대응표본 t-검정 (NumPy 2.2.5)', async ({ page }) => {
  // NumPy 2.x type promotion 검증
  // stats.ttest_rel() 호환성 확인
})
```

#### Test 3: Worker 3 - Nonparametric & ANOVA
```typescript
test('Worker 3: Wilcoxon (NumPy 2.2.5)', async ({ page }) => {
  // stats.wilcoxon() 호환성 확인
})
```

#### Test 4: Worker 4 - Regression & Advanced
```typescript
test('Worker 4: PCA (NumPy 2.2.5 SVD)', async ({ page }) => {
  // np.linalg.svd() NumPy 2.x 호환성 확인
  // statsmodels OLS 호환성 확인
})
```

### Phase 3: 통합 테스트

```bash
# 개발 서버 시작
npm run dev

# E2E 테스트 실행
npx playwright test e2e/workers-validation.spec.ts

# 예상 결과: 모든 테스트 통과 ✅
```

---

## 📊 테스트 결과 (예상)

### 성공 기준

| 테스트 케이스 | 상태 | NumPy 2.x 영향 |
|--------------|------|----------------|
| Worker 1: binomtest | ✅ 예상 통과 | SciPy 1.14.1 호환 |
| Worker 1: IQR | ✅ 예상 통과 | np.percentile 안정 |
| Worker 2: t-test paired | ✅ 예상 통과 | stats.ttest_rel 안정 |
| Worker 2: binomtest | ✅ 예상 통과 | SciPy 호환 |
| Worker 3: Wilcoxon | ✅ 예상 통과 | stats.wilcoxon 안정 |
| Worker 4: Linear Regression | ✅ 예상 통과 | np.linalg 안정 |
| Worker 4: PCA (NumPy SVD) | ✅ 예상 통과 | np.linalg.svd 안정 |

### 실패 시나리오 (대비책)

#### 시나리오 1: Type Promotion 이슈
```python
# 문제 발생 시
result = np.float32(x) + y  # precision loss

# 해결책
result = float(np.float32(x) + y)  # 명시적 변환
```

#### 시나리오 2: API 변경
```python
# 문제 발생 시
result = some_deprecated_function()

# 해결책
result = new_recommended_function()  # NumPy 2.x 권장 함수
```

---

## 🔄 롤백 계획

### 만약 호환성 문제 발생 시

**Option 1: Pyodide 버전 다운그레이드**
```typescript
// constants.ts
const PYODIDE_VERSION = 'v0.24.1'  // 롤백
```

**Option 2: 호환성 레이어 추가**
```python
# worker1-descriptive.py
import numpy as np

# NumPy 버전 확인
if np.__version__.startswith('2.'):
    # NumPy 2.x 대응 코드
    pass
else:
    # NumPy 1.x 코드
    pass
```

**Option 3: 단계적 업그레이드**
```typescript
// 환경 변수로 버전 제어
const PYODIDE_VERSION = process.env.NEXT_PUBLIC_PYODIDE_VERSION || 'v0.28.3'
```

---

## 📝 권장 사항

### 즉시 실행 (우선순위 1)

1. ✅ **E2E 테스트 업데이트**
   - `e2e/workers-validation.spec.ts`의 하드코딩된 v0.24.1을 constants.ts 참조로 변경

2. ✅ **테스트 실행**
   ```bash
   npm run dev
   npx playwright test e2e/workers-validation.spec.ts
   ```

3. ✅ **결과 문서화**
   - 모든 테스트 통과 여부 기록
   - 실패 시 상세 에러 메시지 수집

### 추가 검증 (우선순위 2)

1. ⚠️ **성능 측정**
   - NumPy 2.x의 성능 개선 확인
   - 로딩 시간 변화 측정

2. ⚠️ **메모리 사용량**
   - Pyodide v0.28.3 메모리 프로파일링
   - 브라우저 메모리 제한 재확인

3. ⚠️ **브라우저 호환성**
   - Chrome, Firefox, Safari에서 테스트
   - WebAssembly 지원 확인

---

## ✅ 최종 결론

### 호환성 평가

| 항목 | 상태 | 비고 |
|------|------|------|
| **코드 호환성** | ✅ **안전** | Deprecated 함수 사용 없음 |
| **Type Promotion** | ✅ **안전** | 명시적 타입 캐스팅 없음 |
| **API 변경** | ✅ **안전** | 안정적인 API만 사용 |
| **라이브러리 호환** | ✅ **안전** | SciPy, statsmodels 호환 |

### 예상 결과

**Pyodide v0.28.3으로 업그레이드해도 모든 Worker 1-4가 정상 작동할 것으로 예상됩니다.**

**근거**:
1. ✅ NumPy 2.x Deprecated 함수 미사용
2. ✅ Type promotion에 영향받는 코드 없음
3. ✅ SciPy 1.14.1 API 안정성
4. ✅ statsmodels 0.14.4 하위 호환성

### 다음 단계

1. **E2E 테스트 실행** (5분)
2. **결과 확인** (5분)
3. **문서 업데이트** (5분)
4. **프로덕션 배포** (이상 없을 시)

---

**작성자**: Claude Code
**최종 수정**: 2025-10-14
**다음 업데이트**: 테스트 실행 후
