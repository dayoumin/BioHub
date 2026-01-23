import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/mood-median/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable, TableColumn } from "@/components/statistics/common/StatisticsTable"`;
const newImport = `import { StatisticsTable, TableColumn } from "@/components/statistics/common/StatisticsTable"
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace the interpretation Alert with ResultInterpretation and AssumptionTestCard
const oldInterpretationSection = `        {/* 해석 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>결과 해석</AlertTitle>
          <AlertDescription>{results.interpretation}</AlertDescription>
        </Alert>`;

const newInterpretationSection = `        {/* 가정 검정 */}
        <AssumptionTestCard
          title="Mood Median Test 가정"
          tests={[
            {
              name: '독립 표본',
              description: '각 관측값은 서로 독립적이어야 합니다',
              pValue: null,
              passed: true,
              details: '데이터 수집 방법에 따라 독립성이 결정됩니다. 동일 개체에서 반복 측정된 경우 다른 검정 방법을 고려하세요.'
            } satisfies AssumptionTest,
            {
              name: '순서형 데이터',
              description: '데이터의 순서가 의미 있어야 합니다',
              pValue: null,
              passed: true,
              details: '연속형 또는 순서형 데이터에 적합합니다. 명목형 데이터에는 사용할 수 없습니다.'
            } satisfies AssumptionTest,
            {
              name: '최소 그룹 수',
              description: '2개 이상의 그룹이 필요합니다',
              pValue: null,
              passed: results.nGroups >= 2,
              details: \`현재 \${results.nGroups}개 그룹이 있습니다.\`
            } satisfies AssumptionTest
          ]}
          testType="mood-median"
          showRecommendations={false}
          showDetails={true}
        />

        {/* 결과 해석 */}
        <ResultInterpretation
          result={{
            title: 'Mood Median Test 결과 해석',
            summary: results.interpretation,
            statistical: \`χ² = \${results.statistic.toFixed(3)}, df = \${results.nGroups - 1}, p = \${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(4)}, Grand Median = \${results.grandMedian.toFixed(2)}, 그룹 수 = \${results.nGroups}, n = \${results.nTotal}\`,
            practical: results.significant
              ? \`그룹 간 중앙값에 유의한 차이가 존재합니다. 가장 높은 중앙값을 가진 그룹은 \${results.groupStats.reduce((max, g) => g.median > max.median ? g : max).group}이며, 가장 낮은 중앙값을 가진 그룹은 \${results.groupStats.reduce((min, g) => g.median < min.median ? g : min).group}입니다.  사후검정을 통해 어떤 그룹 쌍 간에 차이가 있는지 확인할 수 있습니다.\`
              : '그룹 간 중앙값에 유의한 차이가 없습니다. 모든 그룹이 유사한 중심 경향을 보입니다.'
          } satisfies InterpretationResult}
        />`;

content = content.replace(oldInterpretationSection, newInterpretationSection);

writeFileSync(filePath, content, 'utf8');
console.log('mood-median page migration completed successfully!');
