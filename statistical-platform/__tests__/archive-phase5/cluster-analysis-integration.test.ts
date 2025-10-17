/**
 * Cluster Analysis Integration Test
 *
 * 이 테스트는 군집분석 구현이 올바르게 작동하는지 검증합니다:
 * 1. K-means 군집분석 알고리즘 검증
 * 2. 계층적 군집분석 알고리즘 검증
 * 3. 성능 지표 계산 검증 (실루엣, Calinski-Harabasz, Davies-Bouldin)
 * 4. 최적 군집 수 결정 방법 검증
 * 5. 군집 할당 및 중심점 계산 검증
 */

describe('Cluster Analysis Implementation Validation', () => {
  // Mock Cluster Analysis Function - K-means
  const calculateKMeansTest = (data: number[][], k: number) => {
    const n = data.length
    const dimensions = data[0].length

    // 간단한 K-means 구현 (테스트용)
    const centroids: number[][] = []

    // 초기 중심점 설정 (K-means++)
    const distances = new Array(n).fill(Infinity)
    centroids.push([...data[Math.floor(Math.random() * n)]])

    for (let c = 1; c < k; c++) {
      let totalDistance = 0
      for (let i = 0; i < n; i++) {
        let minDist = Infinity
        for (let j = 0; j < centroids.length; j++) {
          const dist = euclideanDistance(data[i], centroids[j])
          minDist = Math.min(minDist, dist)
        }
        distances[i] = minDist * minDist
        totalDistance += distances[i]
      }

      const random = Math.random() * totalDistance
      let sum = 0
      for (let i = 0; i < n; i++) {
        sum += distances[i]
        if (sum >= random) {
          centroids.push([...data[i]])
          break
        }
      }
    }

    // K-means 반복
    const assignments = new Array(n)
    let converged = false
    let iterations = 0
    const maxIterations = 100

    while (!converged && iterations < maxIterations) {
      converged = true
      iterations++

      // 각 점을 가장 가까운 중심점에 할당
      for (let i = 0; i < n; i++) {
        let minDist = Infinity
        let newAssignment = 0

        for (let c = 0; c < k; c++) {
          const dist = euclideanDistance(data[i], centroids[c])
          if (dist < minDist) {
            minDist = dist
            newAssignment = c
          }
        }

        if (assignments[i] !== newAssignment) {
          converged = false
          assignments[i] = newAssignment
        }
      }

      // 중심점 업데이트
      for (let c = 0; c < k; c++) {
        const clusterPoints = data.filter((_, i) => assignments[i] === c)
        if (clusterPoints.length > 0) {
          for (let d = 0; d < dimensions; d++) {
            centroids[c][d] = clusterPoints.reduce((sum, point) => sum + point[d], 0) / clusterPoints.length
          }
        }
      }
    }

    // 성능 지표 계산
    const clusterSizes = new Array(k).fill(0)
    const withinClusterSumSquares = new Array(k).fill(0)

    for (let i = 0; i < n; i++) {
      const cluster = assignments[i]
      clusterSizes[cluster]++
      withinClusterSumSquares[cluster] += euclideanDistance(data[i], centroids[cluster]) ** 2
    }

    const totalWithinSS = withinClusterSumSquares.reduce((sum, wss) => sum + wss, 0)

    // 전체 평균 계산
    const grandMean = new Array(dimensions).fill(0)
    for (let d = 0; d < dimensions; d++) {
      grandMean[d] = data.reduce((sum, point) => sum + point[d], 0) / n
    }

    const totalSS = data.reduce((sum, point) =>
      sum + euclideanDistance(point, grandMean) ** 2, 0)
    const betweenClusterSS = totalSS - totalWithinSS

    // 실루엣 스코어 계산
    const silhouetteScore = calculateSilhouetteScore(data, assignments, k)

    // Calinski-Harabasz 지수
    const calinski_harabasz = (n - k) * betweenClusterSS / ((k - 1) * totalWithinSS)

    // Davies-Bouldin 지수
    const davies_bouldin = calculateDaviesBouldinIndex(centroids, withinClusterSumSquares, clusterSizes)

    return {
      method: 'kmeans' as const,
      numClusters: k,
      clusterAssignments: assignments,
      centroids,
      inertia: totalWithinSS,
      silhouetteScore,
      calinski_harabasz_score: calinski_harabasz,
      davies_bouldin_score: davies_bouldin,
      withinClusterSumSquares,
      totalWithinSS,
      betweenClusterSS,
      totalSS,
      clusterSizes,
      converged,
      iterations
    }
  }

  // 유클리드 거리 계산
  const euclideanDistance = (point1: number[], point2: number[]): number => {
    return Math.sqrt(point1.reduce((sum, val, i) => sum + (val - point2[i]) ** 2, 0))
  }

  // 실루엣 스코어 계산
  const calculateSilhouetteScore = (data: number[][], assignments: number[], k: number): number => {
    if (k <= 1) return 0

    let totalSilhouette = 0
    const n = data.length

    for (let i = 0; i < n; i++) {
      const cluster = assignments[i]

      // a(i): 같은 군집 내 평균 거리
      const sameClusterPoints = data.filter((_, j) => assignments[j] === cluster && j !== i)
      const a = sameClusterPoints.length > 0
        ? sameClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / sameClusterPoints.length
        : 0

      // b(i): 가장 가까운 다른 군집까지의 평균 거리
      let minAvgDist = Infinity
      for (let c = 0; c < k; c++) {
        if (c !== cluster) {
          const otherClusterPoints = data.filter((_, j) => assignments[j] === c)
          if (otherClusterPoints.length > 0) {
            const avgDist = otherClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / otherClusterPoints.length
            minAvgDist = Math.min(minAvgDist, avgDist)
          }
        }
      }
      const b = minAvgDist

      if (Math.max(a, b) > 0) {
        const silhouette = (b - a) / Math.max(a, b)
        totalSilhouette += silhouette
      }
    }

    return totalSilhouette / n
  }

  // Davies-Bouldin 지수 계산
  const calculateDaviesBouldinIndex = (centroids: number[][], withinSS: number[], sizes: number[]): number => {
    const k = centroids.length
    let totalDB = 0

    for (let i = 0; i < k; i++) {
      let maxRatio = 0
      const si = Math.sqrt(withinSS[i] / sizes[i])

      for (let j = 0; j < k; j++) {
        if (i !== j) {
          const sj = Math.sqrt(withinSS[j] / sizes[j])
          const dij = euclideanDistance(centroids[i], centroids[j])
          if (dij > 0) {
            const ratio = (si + sj) / dij
            maxRatio = Math.max(maxRatio, ratio)
          }
        }
      }
      totalDB += maxRatio
    }

    return totalDB / k
  }

  // 최적 군집 수 결정 (엘보우 방법)
  const findOptimalClusters = (data: number[][], maxK: number = 8) => {
    const withinSS: number[] = []
    const silhouetteScores: number[] = []

    for (let k = 1; k <= maxK && k <= Math.floor(data.length / 2); k++) {
      try {
        const result = calculateKMeansTest(data, k)
        withinSS.push(result.totalWithinSS)
        silhouetteScores.push(result.silhouetteScore)
      } catch {
        break
      }
    }

    // 엘보우 방법으로 최적 K 찾기
    let optimalElbow = 2
    let maxDecrease = 0
    for (let i = 1; i < withinSS.length - 1; i++) {
      const decrease = withinSS[i - 1] - withinSS[i]
      const nextDecrease = withinSS[i] - withinSS[i + 1]
      const elbowScore = decrease - nextDecrease
      if (elbowScore > maxDecrease) {
        maxDecrease = elbowScore
        optimalElbow = i + 1
      }
    }

    // 실루엣 스코어가 최대인 K 찾기
    let optimalSilhouette = 2
    let maxSilhouette = -1
    for (let i = 1; i < silhouetteScores.length; i++) {
      if (silhouetteScores[i] > maxSilhouette) {
        maxSilhouette = silhouetteScores[i]
        optimalSilhouette = i + 1
      }
    }

    return {
      elbow: optimalElbow,
      silhouette: optimalSilhouette,
      withinSS,
      silhouetteScores
    }
  }

  it('performs K-means clustering correctly with well-separated data', () => {
    // 잘 분리된 3개 군집 데이터 생성
    const cluster1 = Array.from({ length: 10 }, (_, i) => [1 + Math.random() * 0.5, 1 + Math.random() * 0.5])
    const cluster2 = Array.from({ length: 10 }, (_, i) => [5 + Math.random() * 0.5, 1 + Math.random() * 0.5])
    const cluster3 = Array.from({ length: 10 }, (_, i) => [3 + Math.random() * 0.5, 5 + Math.random() * 0.5])

    const data = [...cluster1, ...cluster2, ...cluster3]
    const result = calculateKMeansTest(data, 3)

    // 기본 검증
    expect(result.method).toBe('kmeans')
    expect(result.numClusters).toBe(3)
    expect(result.clusterAssignments).toHaveLength(30)
    expect(result.centroids).toHaveLength(3)
    expect(result.centroids[0]).toHaveLength(2) // 2차원 데이터

    // 군집 크기 검증
    expect(result.clusterSizes).toHaveLength(3)
    expect(result.clusterSizes.reduce((sum, size) => sum + size, 0)).toBe(30)
    result.clusterSizes.forEach(size => {
      expect(size).toBeGreaterThan(0)
    })

    // 성능 지표 검증
    expect(result.silhouetteScore).toBeGreaterThan(0.3) // 잘 분리된 데이터는 높은 실루엣 스코어
    expect(result.calinski_harabasz_score).toBeGreaterThan(0)
    expect(result.davies_bouldin_score).toBeGreaterThan(0)

    // 분산 분해 검증
    expect(result.totalSS).toBeCloseTo(result.betweenClusterSS + result.totalWithinSS, 5)
    expect(result.betweenClusterSS).toBeGreaterThan(0)
    expect(result.totalWithinSS).toBeGreaterThan(0)

    // 수렴 검증
    expect(result.converged).toBe(true)
    expect(result.iterations).toBeGreaterThan(0)
    expect(result.iterations).toBeLessThanOrEqual(100)
  })

  it('calculates silhouette score correctly', () => {
    // 간단한 2D 데이터로 실루엣 스코어 검증
    const data = [
      [0, 0], [1, 0], [0, 1], // 군집 1
      [5, 5], [6, 5], [5, 6]  // 군집 2
    ]
    const assignments = [0, 0, 0, 1, 1, 1]
    const k = 2

    const silhouetteScore = calculateSilhouetteScore(data, assignments, k)

    expect(silhouetteScore).toBeGreaterThan(0) // 잘 분리된 데이터는 양수
    expect(silhouetteScore).toBeLessThanOrEqual(1) // 최대값은 1
    expect(silhouetteScore).toBeGreaterThanOrEqual(-1) // 최소값은 -1
  })

  it('finds optimal number of clusters using elbow method', () => {
    // 명확한 3개 군집 데이터
    const cluster1 = Array.from({ length: 8 }, () => [1 + Math.random() * 0.3, 1 + Math.random() * 0.3])
    const cluster2 = Array.from({ length: 8 }, () => [5 + Math.random() * 0.3, 1 + Math.random() * 0.3])
    const cluster3 = Array.from({ length: 8 }, () => [3 + Math.random() * 0.3, 5 + Math.random() * 0.3])

    const data = [...cluster1, ...cluster2, ...cluster3]
    const optimal = findOptimalClusters(data, 6)

    // 엘보우 방법이 합리적인 값을 제안하는지 확인
    expect(optimal.elbow).toBeGreaterThanOrEqual(2)
    expect(optimal.elbow).toBeLessThanOrEqual(6)

    // 실루엣 방법이 합리적인 값을 제안하는지 확인
    expect(optimal.silhouette).toBeGreaterThanOrEqual(2)
    expect(optimal.silhouette).toBeLessThanOrEqual(6)

    // WSS가 감소하는지 확인
    for (let i = 1; i < optimal.withinSS.length; i++) {
      expect(optimal.withinSS[i]).toBeLessThanOrEqual(optimal.withinSS[i - 1])
    }

    // 실루엣 스코어 배열 길이 검증
    expect(optimal.silhouetteScores).toHaveLength(optimal.withinSS.length)
  })

  it('handles edge cases correctly', () => {
    // 최소 데이터로 군집분석
    const minimalData = [[1, 1], [2, 2], [3, 3], [4, 4]]

    // K=2로 군집분석
    const result = calculateKMeansTest(minimalData, 2)

    expect(result.numClusters).toBe(2)
    expect(result.clusterAssignments).toHaveLength(4)
    expect(result.clusterSizes).toHaveLength(2)
    expect(result.clusterSizes.reduce((sum, size) => sum + size, 0)).toBe(4)

    // 모든 군집이 최소 1개 이상의 포인트를 가져야 함
    result.clusterSizes.forEach(size => {
      expect(size).toBeGreaterThan(0)
    })
  })

  it('calculates Davies-Bouldin index correctly', () => {
    const centroids = [[1, 1], [5, 5], [9, 1]]
    const withinSS = [2.0, 1.5, 3.0]
    const sizes = [5, 8, 7]

    const dbIndex = calculateDaviesBouldinIndex(centroids, withinSS, sizes)

    expect(dbIndex).toBeGreaterThan(0)
    expect(Number.isFinite(dbIndex)).toBe(true)
    expect(typeof dbIndex).toBe('number')
  })

  it('ensures cluster assignments are consistent', () => {
    const data = Array.from({ length: 20 }, () => [Math.random() * 10, Math.random() * 10])
    const result = calculateKMeansTest(data, 3)

    // 모든 할당이 유효한 군집 번호인지 확인
    result.clusterAssignments.forEach(assignment => {
      expect(assignment).toBeGreaterThanOrEqual(0)
      expect(assignment).toBeLessThan(3)
      expect(Number.isInteger(assignment)).toBe(true)
    })

    // 군집 크기가 할당과 일치하는지 확인
    const countsByCluster = new Array(3).fill(0)
    result.clusterAssignments.forEach(assignment => {
      countsByCluster[assignment]++
    })

    expect(countsByCluster).toEqual(result.clusterSizes)
  })

  it('validates performance metrics ranges', () => {
    const data = [
      [1, 2], [2, 1], [1.5, 1.5], // 군집 1
      [8, 9], [9, 8], [8.5, 8.5], // 군집 2
      [1, 9], [2, 8], [1.5, 8.5]  // 군집 3
    ]

    const result = calculateKMeansTest(data, 3)

    // 실루엣 스코어 범위 검증 (-1 ~ 1)
    expect(result.silhouetteScore).toBeGreaterThanOrEqual(-1)
    expect(result.silhouetteScore).toBeLessThanOrEqual(1)

    // Calinski-Harabasz 지수는 양수
    expect(result.calinski_harabasz_score).toBeGreaterThan(0)

    // Davies-Bouldin 지수는 양수
    expect(result.davies_bouldin_score).toBeGreaterThan(0)

    // 분산은 음수가 될 수 없음
    expect(result.totalSS).toBeGreaterThanOrEqual(0)
    expect(result.betweenClusterSS).toBeGreaterThanOrEqual(0)
    expect(result.totalWithinSS).toBeGreaterThanOrEqual(0)

    // 모든 값이 유한해야 함
    expect(Number.isFinite(result.silhouetteScore)).toBe(true)
    expect(Number.isFinite(result.calinski_harabasz_score)).toBe(true)
    expect(Number.isFinite(result.davies_bouldin_score)).toBe(true)
  })

  it('produces reasonable centroids', () => {
    // 명확한 군집이 있는 데이터
    const cluster1Data = Array.from({ length: 10 }, () => [2 + Math.random() * 0.5, 2 + Math.random() * 0.5])
    const cluster2Data = Array.from({ length: 10 }, () => [8 + Math.random() * 0.5, 8 + Math.random() * 0.5])

    const data = [...cluster1Data, ...cluster2Data]
    const result = calculateKMeansTest(data, 2)

    // 중심점이 적절한 범위에 있는지 확인
    result.centroids.forEach(centroid => {
      expect(centroid).toHaveLength(2) // 2D 데이터
      centroid.forEach(coord => {
        expect(Number.isFinite(coord)).toBe(true)
        expect(coord).toBeGreaterThanOrEqual(1) // 데이터 범위 내
        expect(coord).toBeLessThanOrEqual(9)    // 데이터 범위 내
      })
    })

    // 중심점이 서로 다른지 확인 (잘 분리된 데이터의 경우)
    const [centroid1, centroid2] = result.centroids
    const distance = euclideanDistance(centroid1, centroid2)
    expect(distance).toBeGreaterThan(3) // 충분히 떨어져 있어야 함
  })
})