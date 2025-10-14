/**
 * Worker 1-4 Critical Bug Fix 검증 테스트 (Pyodide 환경)
 *
 * 실제 브라우저에서 Pyodide를 로드하여 Python 코드 실행
 *
 * NOTE: Pyodide v0.28.3 사용 (NumPy 2.2.5, SciPy 1.14.1)
 */

import { test, expect } from '@playwright/test';

const PYODIDE_VERSION = 'v0.28.3';

// Pyodide 로드 및 Worker 초기화 헬퍼 함수
async function loadPyodideAndWorker(page: any, workerFile: string) {
  return await page.evaluate(async ({ version, worker }: { version: string; worker: string }) => {
    // Pyodide 스크립트 로드
    if (!(window as any).loadPyodide) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://cdn.jsdelivr.net/pyodide/${version}/full/pyodide.js`;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // Pyodide 인스턴스 생성 (이미 있으면 재사용)
    if (!(window as any).pyodide) {
      const pyodide = await (window as any).loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/${version}/full/`
      });

      // 필수 패키지 로드
      await pyodide.loadPackage(['numpy', 'scipy', 'pandas', 'statsmodels']);

      // window에 저장
      (window as any).pyodide = pyodide;
    }

    // Worker 코드 로드
    const response = await fetch(worker);
    const code = await response.text();
    await (window as any).pyodide.runPythonAsync(code);

    return true;
  }, { version: PYODIDE_VERSION, worker: workerFile });
}

test.describe('Worker 1: Descriptive Statistics', () => {
  test('binomtest (SciPy 1.14.1 호환)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await loadPyodideAndWorker(page, '/workers/python/worker1-descriptive.py');

    const result = await page.evaluate(async () => {
      const pyodide = (window as any).pyodide;

      const testCode = `
import json
result = one_sample_proportion_test(60, 100, 0.5)
json.dumps(result)
      `;

      const jsonResult = await pyodide.runPythonAsync(testCode);
      return JSON.parse(jsonResult);
    });

    expect(result).toHaveProperty('pValueExact');
    expect(result.sampleProportion).toBe(0.6);
    expect(typeof result.pValueExact).toBe('number');
  });

  test('IQR 최적화 확인', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await loadPyodideAndWorker(page, '/workers/python/worker1-descriptive.py');

    const result = await page.evaluate(async () => {
      const pyodide = (window as any).pyodide;

      const testCode = `
import json
data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
result = descriptive_stats(data)
json.dumps(result)
      `;

      const jsonResult = await pyodide.runPythonAsync(testCode);
      return JSON.parse(jsonResult);
    });

    // IQR = Q3 - Q1
    const expectedIqr = result.q3 - result.q1;
    expect(Math.abs(result.iqr - expectedIqr)).toBeLessThan(0.001);
  });
});

test.describe('Worker 2: Hypothesis Testing', () => {
  test('대응표본 t-검정 쌍 손실 방지', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await loadPyodideAndWorker(page, '/workers/python/worker2-hypothesis.py');

    const result = await page.evaluate(async () => {
      const pyodide = (window as any).pyodide;

      // None이 있는 쌍 데이터
      const testCode = `
import json
values1 = [10, None, 30, 40]
values2 = [12, 15, None, 42]
result = t_test_paired(values1, values2)
json.dumps(result)
      `;

      const jsonResult = await pyodide.runPythonAsync(testCode);
      return JSON.parse(jsonResult);
    });

    // 유효한 쌍은 (10, 12), (40, 42) = 2쌍
    expect(result.nPairs).toBe(2);
    expect(result).toHaveProperty('statistic');
    expect(result).toHaveProperty('pValue');
  });

  test('binomtest (SciPy 1.14.1 호환)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await loadPyodideAndWorker(page, '/workers/python/worker2-hypothesis.py');

    const result = await page.evaluate(async () => {
      const pyodide = (window as any).pyodide;

      const testCode = `
import json
result = binomial_test(7, 10, 0.5)
json.dumps(result)
      `;

      const jsonResult = await pyodide.runPythonAsync(testCode);
      return JSON.parse(jsonResult);
    });

    expect(result).toHaveProperty('pValue');
    expect(typeof result.pValue).toBe('number');
  });
});

test.describe('Worker 3: Nonparametric & ANOVA', () => {
  test('Wilcoxon 검정 쌍 손실 방지', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await loadPyodideAndWorker(page, '/workers/python/worker3-nonparametric-anova.py');

    const result = await page.evaluate(async () => {
      const pyodide = (window as any).pyodide;

      const testCode = `
import json
values1 = [10, None, 30, 40, 50]
values2 = [12, 15, None, 42, None]
result = wilcoxon_test(values1, values2)
json.dumps(result)
      `;

      const jsonResult = await pyodide.runPythonAsync(testCode);
      return JSON.parse(jsonResult);
    });

    // 유효한 쌍은 (10, 12), (40, 42) = 2쌍
    expect(result.nPairs).toBe(2);
    expect(result).toHaveProperty('statistic');
    expect(result).toHaveProperty('pValue');
  });
});

test.describe('Worker 4: Regression & Advanced', () => {
  test('선형회귀 쌍 손실 방지', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await loadPyodideAndWorker(page, '/workers/python/worker4-regression-advanced.py');

    const result = await page.evaluate(async () => {
      const pyodide = (window as any).pyodide;

      const testCode = `
import json
x = [1, None, 3, 4, 5]
y = [2, 4, None, 8, 10]
result = linear_regression(x, y)
json.dumps(result)
      `;

      const jsonResult = await pyodide.runPythonAsync(testCode);
      return JSON.parse(jsonResult);
    });

    // 유효한 쌍은 (1,2), (4,8), (5,10) = 3쌍
    expect(result.nPairs).toBe(3);
    expect(result).toHaveProperty('slope');
    expect(result).toHaveProperty('rSquared');
  });

  test('PCA NumPy SVD 구현 (NumPy 2.2.5)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await loadPyodideAndWorker(page, '/workers/python/worker4-regression-advanced.py');

    const result = await page.evaluate(async () => {
      const pyodide = (window as any).pyodide;

      const testCode = `
import json
data = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]]
result = pca_analysis(data, n_components=2)
json.dumps(result)
      `;

      const jsonResult = await pyodide.runPythonAsync(testCode);
      return JSON.parse(jsonResult);
    });

    expect(result).toHaveProperty('components');
    expect(result).toHaveProperty('explainedVarianceRatio');
    expect(result).toHaveProperty('cumulativeVariance');
    expect(result).toHaveProperty('loadings');
    expect(result.components.length).toBe(4); // 4개 관측치
    expect(result.components[0].length).toBe(2); // 2개 주성분
  });
});