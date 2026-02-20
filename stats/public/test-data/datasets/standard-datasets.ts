/**
 * 표준 테스트 데이터셋 모음
 *
 * 통계 검증을 위한 표준 데이터셋들입니다.
 * 모든 데이터는 R/SPSS와 비교 검증이 가능하도록 구성되었습니다.
 */

// Fisher's Iris 데이터셋 (간소화 버전)
export const irisDataset = {
  name: 'Fisher Iris Dataset',
  description: '붓꽃 3종의 꽃잎/꽃받침 측정 데이터',
  features: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'],
  target: 'species',
  data: {
    // Setosa (첫 10개)
    setosa: {
      sepal_length: [5.1, 4.9, 4.7, 4.6, 5.0, 5.4, 4.6, 5.0, 4.4, 4.9],
      sepal_width: [3.5, 3.0, 3.2, 3.1, 3.6, 3.9, 3.4, 3.4, 2.9, 3.1],
      petal_length: [1.4, 1.4, 1.3, 1.5, 1.4, 1.7, 1.4, 1.5, 1.4, 1.5],
      petal_width: [0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.3, 0.2, 0.2, 0.1]
    },
    // Versicolor (첫 10개)
    versicolor: {
      sepal_length: [7.0, 6.4, 6.9, 5.5, 6.5, 5.7, 6.3, 4.9, 6.6, 5.2],
      sepal_width: [3.2, 3.2, 3.1, 2.3, 2.8, 2.8, 3.3, 2.4, 2.9, 2.7],
      petal_length: [4.7, 4.5, 4.9, 4.0, 4.6, 4.5, 4.7, 3.3, 4.6, 3.9],
      petal_width: [1.4, 1.5, 1.5, 1.3, 1.5, 1.3, 1.6, 1.0, 1.3, 1.4]
    },
    // Virginica (첫 10개)
    virginica: {
      sepal_length: [6.3, 5.8, 7.1, 6.3, 6.5, 7.6, 4.9, 7.3, 6.7, 7.2],
      sepal_width: [3.3, 2.7, 3.0, 2.9, 3.0, 3.0, 2.5, 2.9, 2.5, 3.6],
      petal_length: [6.0, 5.1, 5.9, 5.6, 5.8, 6.6, 4.5, 6.3, 5.8, 6.1],
      petal_width: [2.5, 1.9, 2.1, 1.8, 2.2, 2.1, 1.7, 1.8, 1.8, 2.5]
    }
  }
}

// mtcars 데이터셋 (자동차 연비 데이터)
export const mtcarsDataset = {
  name: 'Motor Trend Car Road Tests',
  description: '1974년 Motor Trend 잡지의 자동차 데이터',
  features: ['mpg', 'cyl', 'disp', 'hp', 'drat', 'wt', 'qsec', 'vs', 'am'],
  data: {
    // 첫 10개 자동차 데이터
    mpg: [21.0, 21.0, 22.8, 21.4, 18.7, 18.1, 14.3, 24.4, 22.8, 19.2],
    cyl: [6, 6, 4, 6, 8, 6, 8, 4, 4, 6],
    disp: [160, 160, 108, 258, 360, 225, 360, 146.7, 140.8, 167.6],
    hp: [110, 110, 93, 110, 175, 105, 245, 62, 95, 123],
    drat: [3.90, 3.90, 3.85, 3.08, 3.15, 2.76, 3.21, 3.69, 3.92, 3.92],
    wt: [2.620, 2.875, 2.320, 3.215, 3.440, 3.460, 3.570, 3.190, 3.150, 3.440],
    qsec: [16.46, 17.02, 18.61, 19.44, 17.02, 20.22, 15.84, 20.00, 22.90, 18.30],
    vs: [0, 0, 1, 1, 0, 1, 0, 1, 1, 1],
    am: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
  }
}

// Anscombe's Quartet (통계의 함정을 보여주는 데이터)
export const anscombeDataset = {
  name: "Anscombe's Quartet",
  description: '같은 통계값을 가지지만 다른 분포를 보이는 4개 데이터셋',
  data: {
    set1: {
      x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
      y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]
    },
    set2: {
      x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
      y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]
    },
    set3: {
      x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
      y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]
    },
    set4: {
      x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8],
      y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]
    }
  }
}

// 정규분포 시뮬레이션 데이터
export const normalDistributionData = {
  name: 'Normal Distribution Samples',
  description: '다양한 크기의 정규분포 샘플',
  data: {
    // 평균 100, 표준편차 15 (IQ 분포와 유사)
    small: {
      n: 30,
      values: [
        102.3, 98.7, 105.2, 99.1, 103.8, 97.4, 101.5, 106.3, 95.2, 104.1,
        100.8, 96.5, 108.2, 94.3, 102.7, 99.9, 105.8, 92.1, 107.4, 98.3,
        103.2, 101.1, 96.8, 104.7, 95.9, 109.3, 93.7, 100.5, 97.8, 106.1
      ]
    },
    medium: {
      n: 100,
      // 생성된 값들 (실제로는 더 많은 데이터)
      values: generateNormalData(100, 100, 15)
    },
    large: {
      n: 1000,
      values: generateNormalData(1000, 100, 15)
    }
  }
}

// 이진 분류용 데이터 (로지스틱 회귀)
export const binaryClassificationData = {
  name: 'Binary Classification Sample',
  description: '합격/불합격 예측용 데이터',
  features: ['study_hours', 'practice_tests'],
  target: 'passed',
  data: {
    study_hours: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 3, 4, 5, 6, 7],
    practice_tests: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 1, 3, 2, 4, 3],
    passed: [0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1]  // 0: 불합격, 1: 합격
  }
}

// 시계열 데이터
export const timeSeriesData = {
  name: 'Monthly Sales Data',
  description: '월별 매출 데이터 (2년치)',
  data: {
    months: [
      '2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06',
      '2023-07', '2023-08', '2023-09', '2023-10', '2023-11', '2023-12',
      '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
      '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
    ],
    sales: [
      100, 105, 110, 108, 115, 120, 125, 130, 128, 135, 140, 145,
      142, 148, 155, 153, 160, 165, 170, 175, 173, 180, 185, 190
    ]
  }
}

// ANOVA용 그룹 데이터
export const anovaData = {
  name: 'Treatment Groups Data',
  description: '3개 처리 그룹의 효과 측정 데이터',
  data: {
    control: [23, 25, 24, 26, 27, 23, 24, 25, 28, 26],
    treatment1: [28, 30, 29, 31, 32, 30, 29, 31, 33, 30],
    treatment2: [35, 37, 36, 38, 39, 36, 35, 37, 40, 38]
  }
}

// 대응표본 t-test용 데이터 (전후 비교)
export const pairedData = {
  name: 'Before-After Treatment',
  description: '처리 전후 측정값',
  data: {
    before: [120, 125, 130, 128, 135, 132, 138, 140, 142, 145],
    after: [115, 118, 122, 120, 125, 124, 128, 130, 132, 135]
  }
}

// Chi-square test용 분할표
export const contingencyTable = {
  name: 'Treatment Outcome Table',
  description: '처리 결과 분할표',
  data: [
    [20, 15, 10],  // Group A: Success, Partial, Failure
    [25, 20, 5],   // Group B
    [15, 25, 10]   // Group C
  ]
}

// 도우미 함수: 정규분포 데이터 생성
function generateNormalData(n: number, mean: number, std: number): number[] {
  const data: number[] = []
  for (let i = 0; i < n; i++) {
    // Box-Muller transform
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    data.push(Math.round((z0 * std + mean) * 10) / 10)
  }
  return data
}

// 모든 데이터셋을 하나의 객체로 export
export const standardDatasets = {
  iris: irisDataset,
  mtcars: mtcarsDataset,
  anscombe: anscombeDataset,
  normal: normalDistributionData,
  binary: binaryClassificationData,
  timeSeries: timeSeriesData,
  anova: anovaData,
  paired: pairedData,
  contingency: contingencyTable
}

// 테스트용 간단 데이터 (빠른 검증용)
export const quickTestData = {
  simple: {
    group1: [1, 2, 3, 4, 5],
    group2: [2, 3, 4, 5, 6],
    group3: [3, 4, 5, 6, 7]
  },
  correlation: {
    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    y: [2.1, 3.9, 6.2, 7.8, 10.1, 11.9, 14.2, 15.8, 18.1, 19.9]
  }
}

export default standardDatasets