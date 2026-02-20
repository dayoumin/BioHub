// Vitest 테스트 환경 설정
import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// IndexedDB Mock (fake-indexeddb)
import 'fake-indexeddb/auto'

// structuredClone polyfill for fake-indexeddb
// Node.js 22 has structuredClone, but we provide a global reference for jsdom
if (typeof global.structuredClone !== 'function') {
  // Proper structuredClone for ArrayBuffer/TypedArray
  global.structuredClone = (obj: unknown): unknown => {
    // Handle ArrayBuffer
    if (obj instanceof ArrayBuffer) {
      const copy = new ArrayBuffer(obj.byteLength);
      new Uint8Array(copy).set(new Uint8Array(obj));
      return copy;
    }

    // Handle TypedArray and DataView
    if (ArrayBuffer.isView(obj)) {
      // DataView doesn't have slice(), need special handling
      if (obj instanceof DataView) {
        const buffer = obj.buffer.slice(obj.byteOffset, obj.byteOffset + obj.byteLength);
        return new DataView(buffer);
      }
      // TypedArray: use constructor to preserve type (Float64Array, Int32Array, etc.)
      // @ts-expect-error - TypedArray constructor exists
      return new obj.constructor(obj);
    }

    // Handle objects with ArrayBuffer properties
    if (typeof obj === 'object' && obj !== null) {
      const clone: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = (obj as Record<string, unknown>)[key];
          if (value instanceof ArrayBuffer) {
            const copy = new ArrayBuffer(value.byteLength);
            new Uint8Array(copy).set(new Uint8Array(value));
            (clone as Record<string, unknown>)[key] = copy;
          } else if (typeof value === 'object') {
            (clone as Record<string, unknown>)[key] = global.structuredClone(value);
          } else {
            (clone as Record<string, unknown>)[key] = value;
          }
        }
      }
      return clone;
    }

    // Primitive values
    return obj;
  };
} else {
  // Ensure globalThis also has structuredClone
  if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = global.structuredClone;
  }
}

// ResizeObserver 모킹 (constructor 패턴)
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// 테스트 환경 변수 설정
// @ts-expect-error - 테스트 환경에서 NODE_ENV 설정
process.env.NODE_ENV = 'test';

// PyodideStatisticsService mock
vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    isInitialized: true,
  },
  PyodideStatisticsService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
      isInitialized: true,
      twoWayANOVA: vi.fn().mockResolvedValue({
        factor1_ss: 12.34,
        factor1_df: 1,
        factor1_ms: 12.34,
        factor1_f: 4.567,
        factor1_p: 0.038,
        factor2_ss: 23.45,
        factor2_df: 2,
        factor2_ms: 11.725,
        factor2_f: 6.789,
        factor2_p: 0.004,
        interaction_ss: 3.21,
        interaction_df: 2,
        interaction_ms: 1.605,
        interaction_f: 0.987,
        interaction_p: 0.382,
        residual_ss: 100.0,
        residual_df: 18,
        residual_ms: 5.556,
      }),
      performTukeyHSD: vi.fn().mockResolvedValue({
        comparisons: [
          { group1: 'A', group2: 'B', meandiff: 1.2, pvalue: 0.012, lower: 0.5, upper: 1.9, reject: true },
        ],
        alpha: 0.05,
      }),
      calculateDescriptiveStatistics: vi.fn().mockResolvedValue({
        mean: 10,
        median: 10,
        mode: 10,
        std: 2,
        variance: 4,
        skewness: 0,
        kurtosis: 0,
        min: 5,
        max: 15,
        range: 10,
        q1: 8,
        q3: 12,
        iqr: 4,
        cv: 0.2,
        sem: 0.5,
        ciLower: 9,
        ciUpper: 11,
        n: 100,
        missing: 0,
      }),
      // 고급 통계 메서드들
      performBonferroni: vi.fn().mockResolvedValue({
        comparisons: [],
        num_comparisons: 0,
        significant_count: 0,
        original_alpha: 0.05,
        adjusted_alpha: 0.05,
      }),
      gamesHowellTest: vi.fn().mockResolvedValue({
        comparisons: [],
        alpha: 0.05,
        significant_count: 0,
      }),
      timeSeriesDecomposition: vi.fn().mockResolvedValue({
        trend: [1, 2, 3],
        seasonal: [0, 1, 0],
        residual: [0.1, -0.1, 0.05],
      }),
      arimaForecast: vi.fn().mockResolvedValue({
        forecast: [6, 7, 8],
        confidenceIntervals: [
          [5, 7],
          [6, 8],
          [7, 9],
        ],
      }),
      sarimaForecast: vi.fn().mockResolvedValue({
        forecast: [6, 7, 8],
        confidenceIntervals: [
          [5, 7],
          [6, 8],
          [7, 9],
        ],
      }),
      varModel: vi.fn().mockResolvedValue({
        coefficients: {},
        aic: 100,
        bic: 110,
      }),
      kaplanMeierSurvival: vi.fn().mockResolvedValue({
        survival_function: [1, 0.9, 0.8],
        time_points: [0, 1, 2],
      }),
      coxRegression: vi.fn().mockResolvedValue({
        coefficients: {},
        hazard_ratios: {},
      }),
      manova: vi.fn().mockResolvedValue({
        testStatistic: 0.5,
        pValue: 0.05,
      }),
    }),
  },
}));

// react-markdown mock (ESM 이슈 해결)
vi.mock('react-markdown', () => {
  return {
    default: function ReactMarkdown({ children }: { children: React.ReactNode }) {
      const React = require('react');
      return React.createElement('div', null, children);
    }
  };
});

// usePyodideService hook mock (통계 페이지용)
vi.mock('@/hooks/use-pyodide-service', () => ({
  usePyodideService: () => ({
    pyodideService: {
      isReady: true,
      initialize: vi.fn().mockResolvedValue(undefined),
      calculateDescriptiveStatistics: vi.fn().mockResolvedValue({
        mean: 10,
        median: 10,
        std: 2,
        min: 5,
        max: 15,
      }),
      tTest: vi.fn().mockResolvedValue({
        statistic: 2.5,
        pValue: 0.02,
        df: 8,
      }),
      performANOVA: vi.fn().mockResolvedValue({
        fStatistic: 5.0,
        pValue: 0.01,
        df: [2, 27],
      }),
    },
    runPython: vi.fn().mockResolvedValue({
      trend: 'increasing',
      pvalue: 0.02,
      slope: 4.2,
      intercept: -2.1,
    }),
    isInitialized: true,
    isLoading: false,
    error: null,
  }),
}));

// console 경고 무시 (선택적)
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('ReactDOM.render')) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Pyodide 모킹 - 테스트용 레퍼런스 값 반환
const __pyGlobals: Record<string, unknown> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).loadPyodide = vi.fn().mockResolvedValue({
  runPython: vi.fn().mockImplementation((code: string) => {
    // 미리 계산된 통계 값 반환 (R/SPSS 검증값)
    if (code.includes('ttest_ind')) {
      return { statistic: -2.121, pvalue: 0.101, df: 4 };
    }
    if (code.includes('shapiro')) {
      return { statistic: 0.9532, pvalue: 0.7234 };
    }
    if (code.includes('pearsonr')) {
      return { statistic: 0.8912, pvalue: 0.0001 };
    }
    return {};
  }),
  runPythonAsync: vi.fn().mockImplementation(async (code: string) => {
    // Two-way ANOVA (statsmodels)
    if (code.includes('anova_lm')) {
      console.log('[vitest.pyodide] twoWayANOVA mock');
      return {
        factor1_ss: 12.34,
        factor1_df: 1,
        factor1_ms: 12.34,
        factor1_f: 4.567,
        factor1_p: 0.038,
        factor2_ss: 23.45,
        factor2_df: 2,
        factor2_ms: 11.725,
        factor2_f: 6.789,
        factor2_p: 0.004,
        interaction_ss: 3.21,
        interaction_df: 2,
        interaction_ms: 1.605,
        interaction_f: 0.987,
        interaction_p: 0.382,
        residual_ss: 100.0,
        residual_df: 18,
        residual_ms: 5.556,
      };
    }
    return {};
  }),
  loadPackage: vi.fn().mockResolvedValue(undefined),
  globals: {
    set: vi.fn((k: string, v: unknown) => {
      __pyGlobals[k] = v;
    }),
    get: vi.fn((k: string) => __pyGlobals[k]),
  },
});
