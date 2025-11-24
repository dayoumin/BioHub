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
