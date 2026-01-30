import { readFileSync, writeFileSync } from 'fs';

// ============================================================================
// mann-kendall 페이지에 TestStatisticDisplay 적용
// ============================================================================
const mannKendallPath = 'statistical-platform/app/(dashboard)/statistics/mann-kendall/page.tsx';
let mannKendallContent = readFileSync(mannKendallPath, 'utf8');

// 1. TestStatisticDisplay import 추가
if (!mannKendallContent.includes("import { TestStatisticDisplay }")) {
  mannKendallContent = mannKendallContent.replace(
    "import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'",
    `import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { TestStatisticDisplay } from '@/components/statistics/common/TestStatisticDisplay'`
  );
}

// 2. statistics 탭 안 Card 앞에 TestStatisticDisplay 추가
const oldMannKendallCard = `          <ContentTabsContent tabId="statistics" show={activeResultTab === 'statistics'}>
            <Card>
              <CardHeader>
                <CardTitle>Mann-Kendall 통계량</CardTitle>`;

const newMannKendallCard = `          <ContentTabsContent tabId="statistics" show={activeResultTab === 'statistics'}>
            {/* 검정 통계량 - APA 형식 */}
            <TestStatisticDisplay
              name="Z"
              value={results.z}
              pValue={results.p}
              alpha={0.05}
              size="default"
              className="mb-4"
            />

            <Card>
              <CardHeader>
                <CardTitle>Mann-Kendall 통계량</CardTitle>`;

mannKendallContent = mannKendallContent.replace(oldMannKendallCard, newMannKendallCard);

writeFileSync(mannKendallPath, mannKendallContent, 'utf8');
console.log('✅ mann-kendall 페이지 수정 완료');