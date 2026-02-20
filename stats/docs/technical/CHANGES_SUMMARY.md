# 📝 pyodide-statistics.ts 수정 내역 요약

## 🔄 오늘 수정한 내용들

### 1. **runPython → runPythonAsync 변경** ✅
```typescript
// 변경 전
const result = await this.pyodide.runPython(`...`)

// 변경 후
const result = await this.pyodide.runPythonAsync(`...`)
```
**이유**: Pyodide v0.24에서 `runPython`은 동기 함수, 비동기는 `runPythonAsync` 사용

### 2. **JavaScript 배열 → Python 변환 수정** ✅
```python
# 변경 전
np_array = np.array(data_array.to_py())  # ❌ 오류
for group in groups_data.tolist():       # ❌ 오류

# 변경 후
np_array = np.array(data_array)          # ✅ 직접 사용
for group in groups_data:                 # ✅ 직접 사용
```
**이유**: JavaScript 배열은 Pyodide가 자동으로 Python list로 변환

### 3. **JSON 반환 수정** ✅
```python
# 변경 전 (오류 있던 코드)
json.dumps(result) = { ... }  # ❌ 문법 오류
json.dumps(result)

# 현재
result = { ... }
json.dumps(result)  # JSON 문자열 반환
```
```typescript
// TypeScript에서
const parsed = JSON.parse(result)
```
**이유**: Python dict를 JSON 문자열로 변환 후 JavaScript에서 파싱

### 4. **NumPy boolean → Python bool 변환** ✅
```python
# 변경 전
'significant': p_value < 0.05  # NumPy bool_ 타입 (JSON 직렬화 실패)

# 변경 후
'significant': bool(p_value < 0.05)  # Python bool 타입
```
**이유**: NumPy boolean은 JSON 직렬화 불가

### 5. **필수 패키지 추가** ✅
```typescript
// 변경 전
await this.pyodide.loadPackage(['numpy', 'scipy', 'pandas'])

// 변경 후
await this.pyodide.loadPackage(['numpy', 'scipy', 'pandas', 'scikit-learn', 'statsmodels'])
```
**이유**: 고급 분석 함수에서 scikit-learn 필요

### 6. **타입 정의 추가** ⚠️ (방금 추가, 테스트 필요)
```typescript
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<any>
  globals: {
    set: (key: string, value: any) => void
    delete: (key: string) => void
  }
  loadPackage: (packages: string[]) => Promise<void>
}

// 커스텀 에러 클래스
export class StatisticalError extends Error { ... }
```

## ⚠️ 현재 상태

### ✅ 해결된 문제
1. `runPython` → `runPythonAsync`
2. `.to_py()`, `.tolist()` 제거
3. JSON 직렬화 오류
4. scikit-learn 모듈 누락

### 🔍 확인 필요
1. 타입 정의 추가 후 빌드 오류 여부
2. 모든 함수가 정상 작동하는지 테스트

## 📊 테스트 결과 확인 방법

1. **브라우저에서**: http://localhost:3001/test-results
2. **콘솔 확인**: F12 → Console 탭
3. **에러 패턴**:
   - "Cannot read properties of undefined" → 초기화 실패
   - "JSON at position" → JSON 파싱 오류
   - "not JSON serializable" → 타입 변환 필요

## 🔧 문제 발생 시 롤백 방법

타입 정의 제거하려면:
```typescript
// 원래대로 복원
declare global {
  interface Window {
    pyodide?: any
    loadPyodide?: (config: any) => Promise<any>
  }
}

export class PyodideStatisticsService {
  private pyodide: any = null  // any 타입으로 복원
  // StatisticalError 클래스 제거
}
```