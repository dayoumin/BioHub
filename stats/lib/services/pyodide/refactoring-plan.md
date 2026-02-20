# Pyodide 서비스 리팩토링 계획

## 현재 구조의 문제점
1. **파일 크기**: advanced.ts (990줄), anova.ts (765줄)
2. **Python 코드 임베딩**: 2000+ 줄의 Python이 문자열로
3. **유지보수 어려움**: Python 수정 시 TypeScript 파일 편집 필요
4. **IDE 지원 부족**: Python 코드에 대한 syntax highlighting 없음

## 제안 1: Python 스크립트 외부화 (권장)

### 디렉토리 구조
```
lib/services/pyodide/
├── services/           # TypeScript 서비스 클래스
│   ├── pca.service.ts
│   ├── clustering.service.ts
│   ├── timeseries.service.ts
│   ├── survival.service.ts
│   ├── anova.service.ts
│   └── base.service.ts
├── scripts/           # Python 스크립트 (순수 .py 파일)
│   ├── pca.py
│   ├── clustering.py
│   ├── timeseries.py
│   └── ...
└── index.ts          # 통합 export

```

### 장점
- ✅ Python 코드 IDE 지원 (문법 체크, 자동완성)
- ✅ 파일별 관심사 분리
- ✅ 단위 테스트 용이
- ✅ 번들 크기 최적화 (lazy loading 가능)

### 구현 예시
```typescript
// services/pca.service.ts
import { loadPythonScript } from '../script-loader'

export class PCAService extends BasePyodideService {
  private pcaScript?: string

  async initialize() {
    await super.initialize()
    this.pcaScript = await loadPythonScript('pca.py')
  }

  async performPCA(data: number[][], options: PCAOptions) {
    const result = await this.runPython(this.pcaScript, {
      data_matrix: data,
      n_components: options.nComponents,
      standardize: options.standardize
    })
    return result
  }
}
```

## 제안 2: 모듈 분할 (차선책)

### 현재 advanced.ts를 분할
```
advanced/
├── pca-clustering.ts      (300줄)
├── timeseries.ts          (300줄)
├── survival.ts            (200줄)
└── mixed-models.ts        (190줄)
```

### 장점
- ✅ 파일 크기 감소
- ✅ 관련 기능끼리 그룹화
- ⚠️ 하지만 Python 코드 임베딩 문제는 여전히 존재

## 제안 3: Webpack Plugin 사용

### py-loader 구현
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.py$/,
        type: 'asset/source',
      }
    ]
  }
}
```

### 사용법
```typescript
import pcaScript from './scripts/pca.py'

const result = await pyodide.runPython(pcaScript)
```

## 마이그레이션 계획

### Phase 1: 인프라 구축 (1일)
- [ ] script-loader.ts 구현
- [ ] webpack 설정 추가
- [ ] 폴더 구조 생성

### Phase 2: 점진적 이동 (3-4일)
- [ ] advanced.ts의 PCA → pca.py + pca.service.ts
- [ ] clustering 메서드들 분리
- [ ] timeseries 메서드들 분리
- [ ] 나머지 메서드 순차 이동

### Phase 3: 테스트 & 검증 (1일)
- [ ] 기존 테스트 통과 확인
- [ ] 성능 벤치마크
- [ ] 번들 크기 비교

## 예상 결과

### Before
- advanced.ts: 990줄
- Python 코드 유지보수: 어려움
- 번들 크기: 큼

### After
- 각 서비스: ~150줄
- Python 코드: 별도 .py 파일로 관리
- 번들 크기: 20-30% 감소 예상
- 개발 경험: 크게 개선

## 리스크 & 대응

1. **Webpack 설정 복잡도**
   - Next.js 커스텀 webpack 설정 필요
   - 대응: next.config.js에 loader 추가

2. **동적 import 이슈**
   - 일부 번들러에서 문제 가능
   - 대응: 정적 import map 생성

3. **타입 안전성**
   - Python 스크립트 결과 타입 체크
   - 대응: Zod 등 런타임 타입 체크 도입