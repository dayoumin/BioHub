# Pyodide: 브라우저에서 Python 실행하기 완전 가이드

## 개요
Pyodide는 브라우저에서 Python 코드를 실행할 수 있게 해주는 혁신적인 기술입니다. 서버 사이드 Python과 달리 브라우저 환경의 제약사항을 고려해야 합니다.

## 핵심 차이점: 서버 vs 브라우저 Python

### 1. 실행 환경
- **서버**: 완전한 Python 환경, 모든 라이브러리 사용 가능
- **브라우저**: 제한된 환경, Pyodide 지원 패키지만 사용 가능

### 2. 파일 시스템 접근
- **서버**: `open()`, `os.path` 등 자유로운 파일 조작
- **브라우저**: 파일 시스템 접근 불가, `fetch()`로 웹 리소스만 로드

### 3. 패키지 관리
- **서버**: `pip install`으로 모든 패키지 설치
- **브라우저**: Pyodide에서 미리 컴파일된 패키지만 사용

## 프로젝트 구조 이해

### lib/ vs public/ 디렉토리

#### lib/ (개발용)
```typescript
// TypeScript 코드 위치
lib/services/pyodide-statistics.ts
lib/statistics/workers/python/worker4.py  // 개발 중인 Python 파일
```

#### public/ (배포용)
```javascript
// 브라우저 접근 가능
public/workers/worker4.py  // 빌드 시 복사됨
```

#### 동기화 과정
```
개발 시: lib/workers/python/worker.py (편집)
빌드 시: public/workers/worker.py (자동 복사)
실행 시: fetch('/workers/worker.py') (브라우저 로드)
```

## 필수 도구: python -m py_compile

### 왜 필요한가?
브라우저에서는 Python 문법 오류가 사용자 경험을 크게 해치므로 **배포 전 필수 검사**

### 사용법
```bash
# 문법 검사
python -m py_compile worker4-regression-advanced.py

# 성공: 아무 메시지 없음
# 실패: SyntaxError 출력
```

### CI/CD 통합 예시
```yaml
# .github/workflows/deploy.yml
- name: Validate Python Workers
  run: |
    find lib/statistics/workers/python -name "*.py" -exec python -m py_compile {} \;
```

## TypeScript 래퍼의 역할

### 문제점
```javascript
// 직접 사용하기 어려움
const result = pyodide.runPython(`
import json
data = json.loads('${JSON.stringify(data)}')
# 복잡한 Python 코드...
`);
```

### 해결책: 래퍼
```typescript
// 타입 안전한 인터페이스
const stats = new PyodideStatistics();
const result = await stats.stepwiseRegression(data, config);
```

## 브라우저 Python 개발 시 주의사항

### 1. 비동기 처리
```python
# ❌ 동기적 파일 읽기 (불가능)
with open('data.csv', 'r') as f:
    data = f.read()

# ✅ fetch() 사용
import js
data = await js.fetch('/data/sample.csv').text()
```

### 2. 메모리 관리
- 브라우저 메모리 제한 (보통 1-2GB)
- 대용량 데이터는 청크 처리
- 사용하지 않는 객체는 명시적 삭제

### 3. 패키지 로딩
```javascript
// 필수 패키지 미리 로드
await pyodide.loadPackage(['numpy', 'pandas', 'statsmodels']);
```

### 4. 에러 처리
```javascript
try {
  const result = await pyodide.runPython(pythonCode);
} catch (error) {
  console.error('Python execution failed:', error.message);
  // 사용자 친화적 에러 메시지 표시
}
```

### 5. 성능 최적화
- **웹 워커 사용**: 메인 스레드 블로킹 방지
- **코드 분할**: 필요한 때만 로드
- **캐싱**: 반복 계산 결과 캐시

## 실제 프로젝트 적용 예시

### 통계 플랫폼 구조
```
statistical-platform/
├── lib/
│   ├── services/
│   │   └── pyodide-statistics.ts     # TypeScript 래퍼
│   └── statistics/
│       └── workers/
│           └── python/               # 개발용 Python 파일
├── public/
│   └── workers/
│       └── python/                   # 배포용 Python 파일
└── __tests__/
    └── statistics/                   # 통합 테스트
```

### 빌드 프로세스
```javascript
// next.config.js
module.exports = {
  // Python 워커 파일 동기화
  webpack: (config) => {
    config.plugins.push(
      new CopyPlugin({
        patterns: [{
          from: 'lib/statistics/workers/python',
          to: 'public/workers/python'
        }]
      })
    );
    return config;
  }
};
```

## 디버깅 전략

### 1. 로컬 테스트
```python
# test-worker.py
import sys
print("Python version:", sys.version)

# 로컬에서 실행
python test-worker.py
```

### 2. 브라우저 콘솔
```javascript
// 브라우저에서 Python 실행 테스트
pyodide.runPython(`
print("Hello from browser Python!")
import sys
print(sys.version)
`);
```

### 3. 에러 로깅
```typescript
const logger = {
  log: (message: string) => {
    console.log(`[Pyodide] ${message}`);
  },
  error: (error: Error) => {
    console.error(`[Pyodide Error] ${error.message}`);
    // 사용자에게 표시할 친화적 메시지
  }
};
```

## 성능 모범 사례

### 1. 초기화 최적화
```typescript
class PyodideManager {
  private pyodide: any = null;

  async initialize() {
    if (!this.pyodide) {
      this.pyodide = await loadPyodide();
      await this.pyodide.loadPackage(['numpy', 'statsmodels']);
    }
    return this.pyodide;
  }
}
```

### 2. 코드 재사용
```python
# 공통 유틸리티 함수
def validate_data(data):
    if not isinstance(data, dict):
        raise ValueError("Data must be a dictionary")
    return True
```

### 3. 메모리 누수 방지
```javascript
// 계산 후 정리
const result = await pyodide.runPython(code);
pyodide.runPython('import gc; gc.collect()'); // 가비지 컬렉션
```

## 결론

브라우저 Python은 기존 서버 Python과 다른 패러다임을 요구합니다:

- **파일 접근 방식의 변화**
- **패키지 제약의 수용**
- **비동기 프로그래밍의 채택**
- **메모리와 성능의 세심한 관리**

이러한 차이점을 이해하면 강력한 웹 기반 통계 애플리케이션을 구축할 수 있습니다.