import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/ks-test/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace the interpretation guide section with ResultInterpretation component
const oldInterpretationSection = `        {/* 해석 가이드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결과 해석 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>K-S 검정 해석</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2 text-sm">
                  <p><strong>귀무가설(H₀):</strong> 두 분포가 동일하다</p>
                  <p><strong>대립가설(H₁):</strong> 두 분포가 다르다</p>
                  <p><strong>판단기준:</strong> p-value &lt; 0.05이면 귀무가설 기각</p>
                </div>
              </AlertDescription>
            </Alert>

            {testType === 'two-sample' && effectSize && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">효과크기 해석</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>작은 효과</strong>: 0.2 ~ 0.5</p>
                  <p>• <strong>중간 효과</strong>: 0.5 ~ 0.8</p>
                  <p>• <strong>큰 효과</strong>: 0.8 이상</p>
                  <p className="mt-2 font-medium">현재 효과크기: {effectSize.toFixed(3)}
                    ({effectSize < 0.5 ? '작음' : effectSize < 0.8 ? '중간' : '큼'})
                  </p>
                </div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">주의사항</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• K-S 검정은 분포의 모든 측면(위치, 척도, 모양)을 고려합니다</li>
                <li>• 표본 크기가 클수록 작은 차이도 유의하게 검출될 수 있습니다</li>
                <li>• 이산형 데이터에서는 보수적인 결과를 보일 수 있습니다</li>
              </ul>
            </div>
          </CardContent>
        </Card>`;

const newInterpretationSection = `        {/* 가정 검정 결과 (일표본 K-S 검정의 경우) */}
        {testType === 'one-sample' && (
          <AssumptionTestCard
            title="정규성 검정 결과"
            tests={[
              {
                name: '정규성 (K-S 검정)',
                testName: 'Kolmogorov-Smirnov',
                testStatistic: statisticKS,
                pValue: pValue,
                passed: !significant,
                description: '데이터가 정규분포를 따르는지 검정합니다',
                recommendation: significant ? '비모수 검정 방법을 사용하거나, 데이터 변환을 고려하세요' : undefined,
                severity: significant ? 'medium' : undefined
              } satisfies AssumptionTest
            ]}
            testType="ks-test"
            showRecommendations={true}
          />
        )}

        {/* 효과크기 (이표본 K-S 검정의 경우) */}
        {testType === 'two-sample' && effectSize !== undefined && (
          <EffectSizeCard
            title="효과 크기"
            value={effectSize}
            type="r"
            description="두 분포 간 차이의 크기를 나타냅니다"
            showInterpretation={true}
            showVisualScale={true}
          />
        )}

        {/* 결과 해석 */}
        <ResultInterpretation
          result={{
            title: testType === 'one-sample' ? '일표본 K-S 검정 결과' : '이표본 K-S 검정 결과',
            summary: testType === 'one-sample'
              ? (significant
                ? \`K-S 통계량 D = \${statisticKS.toFixed(4)}이고 p-value = \${pValue.toFixed(3)}로, 데이터가 정규분포를 따르지 않는 것으로 나타났습니다.\`
                : \`K-S 통계량 D = \${statisticKS.toFixed(4)}이고 p-value = \${pValue.toFixed(3)}로, 데이터가 정규분포를 따르는 것으로 나타났습니다.\`)
              : (significant
                ? \`K-S 통계량 D = \${statisticKS.toFixed(4)}이고 p-value = \${pValue.toFixed(3)}로, 두 집단의 분포가 유의하게 다릅니다.\`
                : \`K-S 통계량 D = \${statisticKS.toFixed(4)}이고 p-value = \${pValue.toFixed(3)}로, 두 집단의 분포가 유의하게 다르지 않습니다.\`),
            statistical: \`D = \${statisticKS.toFixed(4)}, p = \${pValue < 0.001 ? '< 0.001' : pValue.toFixed(3)}, n₁ = \${sampleSizes.n1}\${sampleSizes.n2 ? \`, n₂ = \${sampleSizes.n2}\` : ''}\${effectSize ? \`, 효과크기 = \${effectSize.toFixed(3)}\` : ''}\`,
            practical: testType === 'one-sample'
              ? (significant
                ? '비모수 검정 방법(Mann-Whitney U, Wilcoxon 등)을 사용하거나, 데이터 변환(로그, 제곱근 등)을 고려하세요.'
                : '모수 검정(t-test, ANOVA 등)을 사용할 수 있습니다.')
              : (significant
                ? '두 집단의 분포가 다르므로, 집단 간 차이를 해석할 때 분포 특성을 고려해야 합니다.'
                : '두 집단의 분포가 유사하므로, 모수적 비교 방법을 사용할 수 있습니다.')
          } satisfies InterpretationResult}
        />`;

content = content.replace(oldInterpretationSection, newInterpretationSection);

writeFileSync(filePath, content, 'utf8');
console.log('ks-test page migration completed successfully!');
