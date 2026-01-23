import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/one-sample-t/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace renderAssumptions with AssumptionTestCard
const oldAssumptions = `  // 가정 검토 렌더링
  const renderAssumptions = () => {
    if (!results) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            가정 검토
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>정규성 가정</span>
              <Badge variant={results.assumptions.normality ? 'default' : 'destructive'}>
                {results.assumptions.normality ? '충족' : '위반'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>독립성 가정</span>
              <Badge variant={results.assumptions.independence ? 'default' : 'destructive'}>
                {results.assumptions.independence ? '충족' : '위반'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>무작위 표본</span>
              <Badge variant={results.assumptions.randomSample ? 'default' : 'destructive'}>
                {results.assumptions.randomSample ? '충족' : '위반'}
              </Badge>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-blue-300">
              <Info className="w-4 h-4 inline mr-1" />
              표본크기가 30 이상이면 중심극한정리에 의해 정규성 가정을 완화할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }`;

const newAssumptions = `  // 가정 검토 렌더링
  const renderAssumptions = () => {
    if (!results) return null

    return (
      <div className="space-y-6">
        <AssumptionTestCard
          title="일표본 t-검정 가정 검토"
          tests={[
            {
              name: '정규성',
              description: '데이터가 정규분포를 따르거나 표본 크기가 충분해야 합니다',
              pValue: null,
              passed: results.assumptions.normality,
              details: results.assumptions.normality
                ? results.sampleSize >= 30
                  ? \`표본 크기 n=\${results.sampleSize}로 중심극한정리에 의해 가정 충족\`
                  : '정규성 검정 결과 정규분포 가정 충족'
                : '표본 크기가 30 미만이며 정규성 검정 필요'
            } satisfies AssumptionTest,
            {
              name: '독립성',
              description: '각 관측값이 서로 독립적이어야 합니다',
              pValue: null,
              passed: results.assumptions.independence,
              details: results.assumptions.independence
                ? '연구 설계상 독립성 가정 충족'
                : '관측값 간 독립성 검토 필요'
            } satisfies AssumptionTest,
            {
              name: '무작위 표본',
              description: '모집단에서 무작위로 추출된 표본이어야 합니다',
              pValue: null,
              passed: results.assumptions.randomSample,
              details: results.assumptions.randomSample
                ? '무작위 표본 추출 가정 충족'
                : '표본 추출 방법 검토 필요'
            } satisfies AssumptionTest
          ]}
          testType="one-sample-t"
          showRecommendations={true}
          showDetails={true}
        />
      </div>
    )
  }`;

content = content.replace(oldAssumptions, newAssumptions);

// 3. Add EffectSizeCard and ConfidenceIntervalDisplay to the summary tab
const oldSummaryTab = `        <ContentTabsContent tabId="summary" show={activeResultTab === 'summary'} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">검정 요약</h3>
            {renderSummaryCards()}
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">결론</h4>
            <p className="text-muted-foreground">{results.conclusion}</p>
            <p className="text-sm text-muted-foreground mt-1">{results.interpretation}</p>
          </div>
        </ContentTabsContent>`;

const newSummaryTab = `        <ContentTabsContent tabId="summary" show={activeResultTab === 'summary'} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">검정 요약</h3>
            {renderSummaryCards()}
          </div>

          {/* 효과크기 및 신뢰구간 */}
          <div className="grid md:grid-cols-2 gap-4">
            <EffectSizeCard
              title="효과크기 (Cohen's d)"
              value={results.effectSize}
              type="cohens_d"
              showInterpretation={true}
              showVisualScale={true}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">평균의 {results.confidenceLevel}% 신뢰구간</CardTitle>
              </CardHeader>
              <CardContent>
                <ConfidenceIntervalDisplay
                  lower={results.ciLower}
                  upper={results.ciUpper}
                  estimate={results.sampleMean}
                  level={results.confidenceLevel / 100}
                  showVisualScale={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* 결과 해석 */}
          <ResultInterpretation
            result={{
              title: '일표본 t-검정 결과 해석',
              summary: results.conclusion,
              statistical: \`t(\${results.degreesOfFreedom}) = \${results.tStatistic.toFixed(3)}, p = \${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(4)}, d = \${results.effectSize.toFixed(3)}, n = \${results.sampleSize}, 표본평균 = \${results.sampleMean.toFixed(2)}, \${results.confidenceLevel}% CI [\${results.ciLower.toFixed(2)}, \${results.ciUpper.toFixed(2)}]\`,
              practical: results.pValue < 0.05
                ? \`표본 평균(\${results.sampleMean.toFixed(2)})이 검정값(\${results.testValue})과 통계적으로 유의한 차이가 있습니다. 효과크기 Cohen's d = \${results.effectSize.toFixed(3)}로 \${results.effectSize < 0.2 ? '작은' : results.effectSize < 0.5 ? '중간 정도의' : results.effectSize < 0.8 ? '큰' : '매우 큰'} 효과를 보입니다. 평균 차이 = \${results.meanDifference.toFixed(2)}\`
                : \`표본 평균(\${results.sampleMean.toFixed(2)})이 검정값(\${results.testValue})과 통계적으로 유의한 차이가 없습니다. 귀무가설을 기각할 수 없으며, 모집단 평균이 검정값과 같다고 볼 수 있습니다.\`
            } satisfies InterpretationResult}
          />
        </ContentTabsContent>`;

content = content.replace(oldSummaryTab, newSummaryTab);

writeFileSync(filePath, content, 'utf8');
console.log('one-sample-t page migration completed successfully!');
