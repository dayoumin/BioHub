# Dose-Response & Response Surface 통계 페이지 구현 계획

*생성일: 2025-09-26*
*담당: 별도 세션*

## 🎯 구현 목표

**실험설계 시스템**에서 추가된 2개 설계에 대응하는 **통계 분석 페이지** 구현

## 📊 구현 대상

### 1. Dose-Response Analysis (용량-반응 분석)
- **경로**: `/statistics/dose-response`
- **목적**: EC50, LC50, IC50 등 용량-반응 곡선 분석
- **통계 방법**:
  - 4-parameter logistic curve fitting
  - Hill equation
  - Probit 분석
  - EC50/LC50 산정

### 2. Response Surface Methodology (반응표면 방법)
- **경로**: `/statistics/response-surface`
- **목적**: 다변수 최적화 및 반응표면 모델링
- **통계 방법**:
  - Central Composite Design (CCD)
  - Box-Behnken Design
  - 2차 회귀모델 피팅
  - 최적점 탐색

## 🐍 Python 라이브러리 요구사항

### Dose-Response Analysis
```python
# 필수 라이브러리
import numpy as np
from scipy.optimize import curve_fit
from scipy import stats
import matplotlib.pyplot as plt

# 추천 라이브러리 (Pyodide에서 설치 확인 필요)
# pip install eccpy py50 dose-response
```

**구현 방법**:
1. **4-parameter logistic 함수** 정의
2. **curve_fit**으로 파라미터 추정
3. **EC50, LC50 계산**
4. **신뢰구간 산정**
5. **Dose-response curve 시각화**

### Response Surface Methodology
```python
# 필수 라이브러리
import numpy as np
from scipy.optimize import minimize
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# 추천 라이브러리 (확인 필요)
# pip install pyDOE2 (실험계획법)
```

**구현 방법**:
1. **실험점 생성** (CCD, Box-Behnken)
2. **2차 다항모델** 피팅
3. **반응표면 시각화** (3D surface plot)
4. **최적점 탐색** (steepest ascent/descent)
5. **등고선 플롯** (contour plot)

## 📝 파일 구조 계획

```
app/(dashboard)/statistics/
├── dose-response/
│   ├── page.tsx                 # Dose-Response 분석 페이지
│   └── components/
│       ├── DoseResponseForm.tsx # 데이터 입력 폼
│       ├── CurveResult.tsx      # 결과 표시
│       └── ECResult.tsx         # EC50/LC50 결과
└── response-surface/
    ├── page.tsx                 # RSM 분석 페이지
    └── components/
        ├── RSMForm.tsx          # 실험 설계 폼
        ├── SurfaceResult.tsx    # 반응표면 결과
        └── OptimizationResult.tsx # 최적화 결과
```

## 🔧 Pyodide 통합 요구사항

### lib/services/pyodide-statistics.ts 확장
```typescript
// 추가할 함수들
export async function doseResponseAnalysis(data: DoseResponseData): Promise<DoseResponseResult>
export async function responseSurfaceAnalysis(data: RSMData): Promise<RSMResult>
```

### 데이터 타입 정의
```typescript
interface DoseResponseData {
  concentrations: number[]
  responses: number[]
  responseType: 'continuous' | 'binary'
}

interface DoseResponseResult {
  ec50: number
  ec50_ci: [number, number]
  hillSlope: number
  rSquared: number
  curveData: { x: number[], y: number[] }
  fittedParameters: {
    bottom: number
    top: number
    ec50: number
    hillSlope: number
  }
}

interface RSMData {
  factors: string[]
  responses: number[]
  designMatrix: number[][]
  designType: 'CCD' | 'BoxBehnken' | 'FullFactorial'
}

interface RSMResult {
  model: {
    coefficients: number[]
    rSquared: number
    pValues: number[]
  }
  optimization: {
    optimum: number[]
    predictedResponse: number
    factorSettings: Record<string, number>
  }
  surfaceData: {
    x: number[]
    y: number[]
    z: number[][]
  }
}
```

## 🧪 수산과학 특화 예시

### Dose-Response 예시 데이터
```csv
# 독성 실험 데이터
concentration,mortality_rate
0.1,0.05
0.5,0.15
1.0,0.35
2.0,0.65
5.0,0.85
10.0,0.95
```

### Response Surface 예시 데이터
```csv
# 양식 조건 최적화
temperature,density,growth_rate
15,50,2.3
20,50,3.1
25,50,2.8
15,100,1.8
20,100,2.9
25,100,2.4
15,150,1.2
20,150,2.1
25,150,1.8
```

## ✅ 구현 체크리스트

### Phase 1: 기본 분석 구현
- [ ] Dose-Response 페이지 생성
- [ ] 4-parameter logistic fitting 구현
- [ ] EC50/LC50 계산 구현
- [ ] Response Surface 페이지 생성
- [ ] CCD 실험 설계 구현
- [ ] 2차 다항모델 피팅 구현

### Phase 2: 고급 기능
- [ ] 신뢰구간 계산
- [ ] Bootstrap 방법 적용
- [ ] 3D 반응표면 시각화
- [ ] 최적화 알고리즘 통합

### Phase 3: UI/UX 개선
- [ ] 실험설계 마법사 UI
- [ ] 대화형 차트 (plotly.js)
- [ ] 결과 해석 가이드
- [ ] PDF 보고서 생성

## 🔗 실험설계 시스템과 연결

### menu-config.ts 업데이트 필요
```typescript
// 추가할 통계 메뉴
{
  id: 'dose-response',
  href: '/statistics/dose-response',
  title: '용량-반응 분석',
  subtitle: 'EC50, LC50 산정',
  category: 'advanced',
  icon: FlaskConical,
  implemented: true
}
{
  id: 'response-surface',
  href: '/statistics/response-surface',
  title: '반응표면 방법',
  subtitle: '다변수 최적화',
  category: 'advanced',
  icon: TrendingUp,
  implemented: true
}
```

## 📚 참조 자료

### Dose-Response
- [ECCpy GitHub](https://github.com/teese/eccpy)
- [Py50 Documentation](https://pypi.org/project/py50/)
- [SciPy curve_fit](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.curve_fit.html)

### Response Surface
- [pyDOE Documentation](https://pythonhosted.org/pyDOE/rsm.html)
- [scikit-learn Polynomial Features](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.PolynomialFeatures.html)
- [Box-Behnken Design](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3362.htm)

---

**주의사항**:
1. Pyodide에서 모든 라이브러리가 지원되는지 확인 필요
2. 대용량 계산의 성능 최적화 고려
3. 수산과학 연구자 친화적 UI 설계 중요
4. 결과의 통계적 유의성 및 신뢰성 보장 필수

*이 문서는 별도 세션에서 구현 시 참조용입니다.*