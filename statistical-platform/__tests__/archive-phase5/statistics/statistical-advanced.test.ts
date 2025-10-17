import { describe, beforeAll, beforeEach, test, expect, afterEach } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

/**
 * 고급 통계 함수 (브라우저 전용) Jest 단위 테스트
 * - Pyodide를 모킹하여 서비스 메서드의 입/출력 형태와 기본 로직을 검증
 * - 실제 수치 검증은 Playwright E2E에서 수행
 */

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface Global {
			loadPyodide?: any
		}
	}
}

type MockPyodide = {
	runPython: jest.Mock<any, [string]>
	runPythonAsync: jest.Mock<any, [string]>
	loadPackage: jest.Mock<Promise<void>, [string[]]>
	globals: { set: jest.Mock<void, [string, unknown]> }
}

describe.skip('PyodideStatisticsService - 고급 분석 (모킹)', () => {
	let service: PyodideStatisticsService
	let mockPyodide: MockPyodide

	beforeAll(() => {
		// Pyodide 모킹 객체
		mockPyodide = {
			runPython: jest.fn(),
			runPythonAsync: jest.fn(),
			loadPackage: jest.fn().mockResolvedValue(undefined),
			globals: { set: jest.fn() }
		}

		// window.loadPyodide 모킹 (jsdom)
		;(global as any).loadPyodide = jest.fn().mockResolvedValue(mockPyodide)
		if ((global as any).window) {
			;(global as any).window.loadPyodide = (global as any).loadPyodide
		}
	})

	beforeEach(async () => {
		jest.clearAllMocks()
		service = PyodideStatisticsService.getInstance()
		await service.initialize()
	})

	afterEach(() => {
		service.dispose()
	})

		test('PCA - 주성분분석 결과 형태 검증', async () => {
		const mockResult = {
			explainedVariance: [0.62, 0.28, 0.1],
			totalExplainedVariance: 0.9,
			components: [
				[1, 0],
				[0, 1],
				[0, 0]
			]
		}
			mockPyodide.runPythonAsync.mockResolvedValue(JSON.stringify(mockResult))

		const data = [
			[1, 2, 3],
			[2, 3, 4],
			[3, 4, 5]
		]
			const result = await service.pca(data)
			console.log('PCA result:', result)

		expect(Array.isArray(result.explainedVariance)).toBe(true)
		expect(result.explainedVariance.length).toBeGreaterThanOrEqual(2)
		expect(result.totalExplainedVariance).toBeGreaterThan(0)
		expect(Array.isArray(result.components)).toBe(true)
	})

		test('Cronbach\'s Alpha - 알파 범위 및 길이 검증', async () => {
		const mockResult = {
			alpha: 0.82,
			itemTotalCorrelations: [0.5, 0.6, 0.7]
		}
			mockPyodide.runPythonAsync.mockResolvedValue(JSON.stringify(mockResult))

		const items = [
			[3, 4, 5],
			[4, 5, 6],
			[5, 6, 7]
		]
			const result = await service.cronbachAlpha(items)
			console.log('Cronbach result:', result)

		expect(result.alpha).toBeGreaterThanOrEqual(0)
		expect(result.alpha).toBeLessThanOrEqual(1)
		expect(result.itemTotalCorrelations).toHaveLength(3)
	})

	test('요인분석 - 결과 키 존재 및 배열 길이 검증', async () => {
		const mockResult = {
			loadings: [[0.8, 0.1], [0.7, 0.2], [0.6, 0.3]],
			communalities: [0.65, 0.58, 0.55],
			explainedVariance: [0.55, 0.3],
			eigenvalues: [1.8, 1.2]
		}
		mockPyodide.runPythonAsync.mockResolvedValue(JSON.stringify(mockResult))

		const data = [
			[1, 2, 3],
			[2, 3, 4],
			[3, 4, 5],
			[4, 5, 6]
		]
		const result = await service.factorAnalysis(data, { nFactors: 2 })

		expect(result).toHaveProperty('loadings')
		expect(result).toHaveProperty('communalities')
		expect(result.explainedVariance.length).toBe(2)
		expect(result.eigenvalues.length).toBe(2)
	})

		test('군집분석 - 클러스터 길이 및 유효성 검증', async () => {
		const mockResult = {
			clusters: [0, 1, 0, 1],
			centers: [[0, 0], [1, 1]],
			silhouetteScore: 0.42,
			inertia: 123.45
		}
			mockPyodide.runPythonAsync.mockResolvedValue(JSON.stringify(mockResult))

		const data = [
			[0, 0],
			[0.1, 0.2],
			[1, 1],
			[0.9, 1.1]
		]
			const result = await service.clusterAnalysis(data, { nClusters: 2, method: 'kmeans' })
			console.log('Cluster result:', result)

		expect(result.clusters.length).toBe(data.length)
		expect(result.silhouetteScore).toBeGreaterThanOrEqual(0)
		expect(result.silhouetteScore).toBeLessThanOrEqual(1)
	})

		test('시계열분석 - 결과 키 존재 및 배열 길이 검증', async () => {
		const mockResult = {
			trend: [1, 2, 3],
			seasonal: [0, 0, 0],
			residual: [0.1, -0.1, 0.05],
			forecast: [4, 5, 6],
			acf: [1, 0.5, 0.2],
			pacf: [1, 0.4, 0.1]
		}
			mockPyodide.runPythonAsync.mockResolvedValue(JSON.stringify(mockResult))

		const series = [1, 2, 3, 4, 5, 6]
			const result = await service.timeSeriesAnalysis(series, {
			seasonalPeriod: 3,
			forecastPeriods: 3,
			method: 'decomposition'
		})
			console.log('TS result:', result)

		expect(Array.isArray(result.forecast)).toBe(true)
		expect(result.forecast.length).toBe(3)
		expect(Array.isArray(result.acf)).toBe(true)
		expect(Array.isArray(result.pacf)).toBe(true)
	})
})


