# NIST Statistical Reference Datasets 검증 가이드

## 📋 NIST란?
**NIST (National Institute of Standards and Technology)** - 미국 국립표준기술연구소
- 모든 통계 소프트웨어의 정확도 검증 표준
- R, SAS, SPSS, MATLAB 등이 NIST 데이터셋으로 검증됨

## 🌐 NIST StRD 접속 방법

### 1. 메인 페이지
```
https://www.itl.nist.gov/div898/strd/
```

### 2. 데이터셋 카테고리
NIST는 통계 방법별로 참조 데이터셋 제공:

#### 선형회귀 (Linear Regression)
- **URL**: https://www.itl.nist.gov/div898/strd/lls/lls.shtml
- **데이터셋 예시**:
  - `Norris`: 간단한 선형회귀
  - `Pontius`: 2차 다항식
  - `Filip`: 10차 다항식 (극도로 어려움)

#### 분산분석 (ANOVA)
- **URL**: https://www.itl.nist.gov/div898/strd/anova/anova.shtml
- **데이터셋 예시**:
  - `AtmWtAg`: 일원분산분석
  - `SiRstv`: 불균형 일원분산분석
  - `SmLs01-09`: 다양한 ANOVA 시나리오

#### 비선형회귀 (Nonlinear Regression)
- **URL**: https://www.itl.nist.gov/div898/strd/nls/nls.shtml
- **난이도**: Lower(쉬움), Average(중간), Higher(어려움)

## 🔍 NIST 데이터 사용 방법

### Step 1: 데이터셋 선택
예시: **Norris 데이터셋** (선형회귀)
```
https://www.itl.nist.gov/div898/strd/lls/data/Norris.shtml
```

### Step 2: 데이터 구조 확인
```
Data:     y          x
         0.1        0.2
         338.8      337.4
         118.1      118.2
         ...
```

### Step 3: 인증된 결과값 확인
```
Certified Values:
Parameter     Estimate          Standard Deviation
B0           -0.262323073774029    0.232818234301152
B1            1.00211681802045     0.429796848199937E-03

Residual Standard Deviation: 0.884796396144373
R-Squared: 0.999993745883712
```

### Step 4: Pyodide 결과와 비교

## 📊 실제 검증 예시

### 1. Norris 데이터셋 (선형회귀)

```javascript
// 테스트 코드
const norrisData = {
  x: [0.2, 337.4, 118.2, 884.6, 10.1, 226.5, ...],
  y: [0.1, 338.8, 118.1, 888.0, 9.2, 228.1, ...]
}

const result = await service.simpleLinearRegression(
  norrisData.x,
  norrisData.y
)

// NIST 인증값과 비교
expect(result.intercept).toBeCloseTo(-0.262323073774029, 10)
expect(result.slope).toBeCloseTo(1.00211681802045, 10)
expect(result.rSquared).toBeCloseTo(0.999993745883712, 10)
```

### 2. AtmWtAg 데이터셋 (일원분산분석)

```javascript
// NIST AtmWtAg 데이터
const groups = [
  [107.8681568, 107.8681465, 107.8681344, ...], // Instrument 1
  [107.8681078, 107.8681016, 107.8680870, ...], // Instrument 2
]

const result = await service.oneWayANOVA(groups)

// NIST 인증값
// Between Groups MS: 1.184255e-07
// Within Groups MS:  3.635560e-09
// F-statistic: 32.5760

expect(result.fStatistic).toBeCloseTo(32.5760, 3)
```

## 🎯 NIST 테스트 난이도 레벨

### Lower Difficulty (기본 검증)
- 대부분의 소프트웨어가 통과
- 기본적인 수치 안정성 확인
- 예: Norris, Pontius

### Average Difficulty (실무 검증)
- 실제 연구에서 만날 수 있는 수준
- 적절한 수치 알고리즘 필요
- 예: NoInt1, NoInt2

### Higher Difficulty (스트레스 테스트)
- 극단적인 조건 (다중공선성, 극단값)
- 고급 수치 알고리즘 필요
- 예: Filip, Longley

## 📝 NIST 검증 코드 템플릿

```javascript
// nist-validation.test.js
import { NISTDatasets } from './nist-datasets'

describe('NIST StRD 검증', () => {

  test('Norris - 선형회귀', async () => {
    const { x, y, certified } = NISTDatasets.Norris

    const result = await pyodideService.regression(x, y)

    // NIST 인증값과 비교 (15자리 정밀도)
    expect(result.slope).toBeCloseTo(certified.slope, 15)
    expect(result.intercept).toBeCloseTo(certified.intercept, 15)
    expect(result.rSquared).toBeCloseTo(certified.rSquared, 15)
  })

  test('Filip - 극한 다항식 회귀', async () => {
    // Filip은 10차 다항식, 극도로 어려운 테스트
    const { x, y, certified } = NISTDatasets.Filip

    // 다항식 특징 생성
    const X = x.map(xi =>
      Array.from({length: 11}, (_, i) => Math.pow(xi, i))
    )

    const result = await pyodideService.multipleRegression(X, y)

    // 계수 비교 (낮은 정밀도 허용)
    result.coefficients.forEach((coef, i) => {
      expect(coef).toBeCloseTo(certified.coefficients[i], 6)
    })
  })
})
```

## ⚠️ 주의사항

### 1. 정밀도 수준
- **NIST 제공**: 15자리 유효숫자
- **JavaScript Number**: 약 15-17자리
- **실용적 허용치**: 10-12자리

### 2. 수치 안정성 문제
```javascript
// 나쁜 예: 직접 계산
const mean = sum / n  // 큰 수에서 정밀도 손실

// 좋은 예: SciPy 사용
const result = await pyodide.runPython(`
  import numpy as np
  np.mean(data)  # 수치적으로 안정적
`)
```

### 3. 극단 케이스 처리
- Filip 같은 극한 테스트는 실패 가능
- 실무에서는 Lower/Average 통과면 충분

## 🏆 NIST 검증 배지

프로젝트가 NIST 검증을 통과하면:

```markdown
[![NIST Validated](https://img.shields.io/badge/NIST-Validated-green.svg)]
(https://www.itl.nist.gov/div898/strd/)

✅ Linear Regression: 11/11 datasets passed
✅ ANOVA: 9/9 datasets passed
✅ Nonlinear Regression: 20/27 datasets passed
```

## 📚 추가 자료

### NIST 공식 문서
- **Handbook**: https://www.itl.nist.gov/div898/handbook/
- **Dataset Archives**: https://www.itl.nist.gov/div898/strd/archives.html
- **FAQ**: https://www.itl.nist.gov/div898/strd/faq.html

### 검증 논문
- McCullough, B.D. (1998). "Assessing the Reliability of Statistical Software: Part I"
- Wilkinson, L. (1999). "Statistical Methods in Psychology Journals"

## 💡 실전 팁

### 1. 단계별 접근
```
1. Lower 난이도 먼저 테스트
2. 통과하면 Average 진행
3. Higher는 선택사항
```

### 2. 디버깅 방법
```javascript
// 결과 차이가 클 때
console.log('Expected:', nist.certified.slope)
console.log('Actual:', result.slope)
console.log('Difference:', Math.abs(nist.certified.slope - result.slope))
console.log('Relative Error:',
  Math.abs(nist.certified.slope - result.slope) / nist.certified.slope)
```

### 3. 합격 기준
- **필수**: Lower 난이도 100% 통과
- **권장**: Average 난이도 80% 이상 통과
- **선택**: Higher 난이도 50% 이상 통과

---

**작성일**: 2025-01-18
**버전**: 1.0.0
**다음 단계**: NIST 데이터셋 자동 다운로드 스크립트 작성