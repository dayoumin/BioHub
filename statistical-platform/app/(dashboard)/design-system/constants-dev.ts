/**
 * 개발 전용 상수 (프로덕션 빌드에서 제외됨)
 *
 * 이 파일은 개발 환경에서만 사용되며,
 * 프로덕션 빌드 시 next.config.ts의 webpack 설정으로 제외됩니다.
 */

/**
 * 통계 페이지 표준 템플릿
 * 출처: STATISTICS_CODING_STANDARDS.md
 */
export const STATISTICS_PAGE_TEMPLATE = `'use client';
import { useStatisticsPage } from '@/hooks/use-statistics-page';
import { useCallback } from 'react';
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service';

export default function NewStatisticsPage() {
  const { state, actions } = useStatisticsPage<ResultType, VariableType>({
    withUploadedData: true,
    withError: true
  });

  const { uploadedData, isAnalyzing, results, error } = state;

  const runAnalysis = useCallback(async (variables: Variables) => {
    if (!uploadedData) return;

    // 1. 분석 시작 (isAnalyzing = true)
    actions.startAnalysis();

    try {
      // 2. PyodideCore 초기화
      const pyodideCore = PyodideCoreService.getInstance();
      await pyodideCore.initialize();

      // 3. Worker 호출
      const result = await pyodideCore.callWorkerMethod<ResultType>(
        1, // worker1-descriptive.py
        'method-name',
        {
          data: uploadedData.data,
          variables
        }
      );

      // 4. 분석 완료 (isAnalyzing = false + 결과 저장)
      actions.completeAnalysis(result, 3);
    } catch (err) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
      // 5. 에러 처리 (isAnalyzing = false)
      actions.setError(message);
    }
  }, [uploadedData, actions]);

  return (
    <StatisticsPageLayout>
      {/* Your code here */}
    </StatisticsPageLayout>
  );
}`;

/**
 * Good vs Bad 코드 예제
 */
export const CODE_EXAMPLES = {
  bad: {
    useState: `// ❌ useState 사용 금지
const [data, setData] = useState([]);
const [isAnalyzing, setIsAnalyzing] = useState(false);`,
    setTimeout: `// ❌ setTimeout 사용 금지
setTimeout(() => {
  setResults(pythonResult);
}, 100);`,
    any: `// ❌ any 타입 금지
const result = data as any;
const value: any = pythonResult;`,
    setResults: `// ❌ setResults 직접 사용 금지
actions.setResults(result);
// isAnalyzing이 true로 고정됨!`,
  },
  good: {
    useStatisticsPage: `// ✅ useStatisticsPage 사용
const { state, actions } = useStatisticsPage<ResultType, VariableType>({
  withUploadedData: true,
  withError: true
});`,
    await: `// ✅ await 패턴 사용
const result = await pyodideCore.callWorkerMethod(
  1, 'method-name', { data, variables }
);
actions.completeAnalysis(result, 3);`,
    typeGuard: `// ✅ 타입 가드 사용
if (!isValidData(data)) {
  return { error: 'Invalid data' };
}
// 이제 TypeScript가 data를 안전한 타입으로 추론`,
    completeAnalysis: `// ✅ completeAnalysis 사용
actions.completeAnalysis(result, 3);
// isAnalyzing 자동 리셋 + 다음 단계 이동`,
  }
};

/**
 * 골든 값 테스트 정보
 * Phase 2.5 구현 완료 (2025-12-02)
 * 다중 Python 라이브러리 지원 확장
 */
export const GOLDEN_VALUES_TEST_INFO = {
  description: '5개 Python 라이브러리로 검증된 통계 계산 기대값',
  verificationSources: {
    scipy: 'SciPy 1.14.1 via Pyodide 0.28.3',
    statsmodels: 'statsmodels 0.14.1',
    pingouin: 'pingouin 0.5.4',
    sklearn: 'scikit-learn 1.4.0',
    lifelines: 'lifelines 0.28.0',
  },
  files: {
    goldenValues: '__tests__/workers/golden-values/statistical-golden-values.json',
    schemaTest: '__tests__/workers/golden-values/python-calculation-accuracy.test.ts',
    pyodideRunner: 'scripts/run-pyodide-golden-tests.mjs',
  },
  commands: {
    schemaTest: 'npm run test:golden-values',
    pyodideTest: 'npm run test:pyodide-golden',
  },
  statistics: {
    total: 44,
    passed: 44,
    failed: 0,
    skipped: 0,
  },
  categories: [
    // SciPy (기본 통계)
    { name: 'T-Test', tests: 4, status: 'passed', library: 'scipy' },
    { name: 'ANOVA', tests: 2, status: 'passed', library: 'scipy' },
    { name: 'Correlation', tests: 2, status: 'passed', library: 'scipy' },
    { name: 'Chi-Square', tests: 2, status: 'passed', library: 'scipy' },
    { name: 'Non-Parametric', tests: 3, status: 'passed', library: 'scipy' },
    { name: 'Regression', tests: 2, status: 'passed', library: 'scipy' },
    { name: 'Normality', tests: 2, status: 'passed', library: 'scipy' },
    { name: 'Binomial', tests: 2, status: 'passed', library: 'scipy' },
    { name: 'Sign Test', tests: 1, status: 'passed', library: 'scipy' },
    { name: 'Friedman', tests: 1, status: 'passed', library: 'scipy' },
    // statsmodels (고급 회귀/시계열)
    { name: 'Advanced ANOVA', tests: 4, status: 'passed', library: 'statsmodels' },
    { name: 'Advanced Regression', tests: 4, status: 'passed', library: 'statsmodels' },
    { name: 'Time Series', tests: 4, status: 'passed', library: 'statsmodels' },
    // lifelines (생존분석)
    { name: 'Survival Analysis', tests: 3, status: 'passed', library: 'lifelines' },
    // sklearn (다변량)
    { name: 'Multivariate', tests: 4, status: 'passed', library: 'sklearn' },
    // pingouin (효과크기)
    { name: 'Effect Size', tests: 3, status: 'passed', library: 'pingouin' },
    { name: 'Partial Correlation', tests: 1, status: 'passed', library: 'pingouin' },
  ],
};

/**
 * 골든 값 예시 코드
 */
export const GOLDEN_VALUES_EXAMPLE = `// statistical-golden-values.json
{
  "tTest": {
    "oneSample": [
      {
        "name": "null hypothesis true (mu=3)",
        "input": { "data": [1, 2, 3, 4, 5], "popmean": 3 },
        "expected": { "statistic": 0.0, "pValue": 1.0 },
        "tolerance": 0.0001,
        "scipyCode": "stats.ttest_1samp([1,2,3,4,5], 3)"
      }
    ]
  }
}

// 테스트 실행
npm run test:pyodide-golden
// 결과: ✓ Passed: 21, ✗ Failed: 0`;
