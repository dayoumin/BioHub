import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/normality-test/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace renderOverallConclusion with ResultInterpretation and AssumptionTestCard
const oldOverallConclusion = `  // 전체 결론 렌더링
  const renderOverallConclusion = useCallback(() => {
    if (!results) return null

    const isNormal = results.overallConclusion === 'normal'
    const IconComponent = isNormal ? CheckCircle : XCircle
    const colorClass = isNormal ? 'text-muted-foreground dark:text-success' : 'text-muted-foreground dark:text-error'
    const bgClass = isNormal ? 'bg-muted dark:bg-success-bg' : 'bg-muted dark:bg-error-bg'

    return (
      <Card className={bgClass}>
        <CardHeader>
          <CardTitle className={\`flex items-center gap-2 \${colorClass}\`}>
            <IconComponent className="w-5 h-5" />
            전체 결론
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={\`font-medium \${colorClass}\`}>
            {isNormal
              ? '데이터가 정규분포를 따른다고 판단됩니다'
              : '데이터가 정규분포를 따르지 않습니다'
            }
          </p>
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">권장사항:</h4>
            <ul className="text-sm space-y-1">
              {isNormal ? (
                <>
                  <li>• 모수적 검정(t-test, ANOVA) 사용 가능</li>
                  <li>• 피어슨 상관계수 적용 가능</li>
                  <li>• 선형회귀분석 가정 충족</li>
                  <li>• 평균과 표준편차 사용 적절</li>
                </>
              ) : (
                <>
                  <li>• 비모수 검정 사용 권장 (Mann-Whitney, Wilcoxon)</li>
                  <li>• 스피어만 상관계수 사용</li>
                  <li>• 데이터 변환 고려 (로그, 제곱근 변환)</li>
                  <li>• 중앙값과 IQR 사용 권장</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }, [results])`;

const newOverallConclusion = `  // 전체 결론 렌더링
  const renderOverallConclusion = useCallback(() => {
    if (!results) return null

    const isNormal = results.overallConclusion === 'normal'

    return (
      <div className="space-y-6">
        {/* 가정 검정 */}
        <AssumptionTestCard
          title="정규성 검정 결과"
          tests={[
            {
              name: 'Shapiro-Wilk 검정',
              description: \`W = \${results.shapiroWilk.statistic.toFixed(4)}\`,
              pValue: results.shapiroWilk.pValue,
              passed: results.shapiroWilk.conclusion === 'normal',
              details: results.shapiroWilk.interpretation
            } satisfies AssumptionTest,
            ...(results.andersonDarling ? [{
              name: 'Anderson-Darling 검정',
              description: \`A² = \${results.andersonDarling.statistic.toFixed(4)}\`,
              pValue: results.andersonDarling.pValue,
              passed: results.andersonDarling.conclusion === 'normal',
              details: results.andersonDarling.interpretation
            } satisfies AssumptionTest] : []),
            ...(results.dagostinoK2 ? [{
              name: "D'Agostino-Pearson K² 검정",
              description: \`K² = \${results.dagostinoK2.statistic.toFixed(4)}\`,
              pValue: results.dagostinoK2.pValue,
              passed: results.dagostinoK2.conclusion === 'normal',
              details: results.dagostinoK2.interpretation
            } satisfies AssumptionTest] : [])
          ]}
          testType="normality"
          showRecommendations={true}
          showDetails={true}
        />

        {/* 결과 해석 */}
        <ResultInterpretation
          result={{
            title: '정규성 검정 결과 해석',
            summary: isNormal
              ? '데이터가 정규분포를 따른다고 판단됩니다. 모수적 검정을 사용할 수 있습니다.'
              : '데이터가 정규분포를 따르지 않습니다. 비모수적 검정 사용을 권장합니다.',
            statistical: \`Shapiro-Wilk W = \${results.shapiroWilk.statistic.toFixed(4)}, p = \${results.shapiroWilk.pValue < 0.001 ? '< 0.001' : results.shapiroWilk.pValue.toFixed(4)}, n = \${results.sampleSize}. 왜도 = \${results.descriptiveStats.skewness.toFixed(3)}, 첨도 = \${results.descriptiveStats.kurtosis.toFixed(3)}\`,
            practical: isNormal
              ? '모수적 검정(t-test, ANOVA) 사용 가능, 피어슨 상관계수 적용 가능, 선형회귀분석 가정 충족, 평균과 표준편차 사용 적절'
              : '비모수 검정 사용 권장 (Mann-Whitney, Wilcoxon), 스피어만 상관계수 사용, 데이터 변환 고려 (로그, 제곱근 변환), 중앙값과 IQR 사용 권장'
          } satisfies InterpretationResult}
        />
      </div>
    )
  }, [results])`;

content = content.replace(oldOverallConclusion, newOverallConclusion);

writeFileSync(filePath, content, 'utf8');
console.log('normality-test page migration completed successfully!');
