import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/mann-whitney/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace the effect size card in the main results with EffectSizeCard component
const oldEffectSizeCard = `          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-muted-foreground">
                  {analysisResult.effectSize.value.toFixed(3)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">효과크기 (r)</p>
                <Badge variant="outline" className="mt-1">
                  {analysisResult.effectSize.interpretation}
                </Badge>
              </div>
            </CardContent>
          </Card>`;

const newEffectSizeCard = `          <EffectSizeCard
            title="효과크기 (r)"
            value={analysisResult.effectSize.value}
            type="r"
            showInterpretation={true}
            showVisualScale={false}
            className="border-2"
          />`;

content = content.replace(oldEffectSizeCard, newEffectSizeCard);

// 3. Replace interpretation tab content with ResultInterpretation and AssumptionTestCard
const oldInterpretationTab = `          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
            <Card>
              <CardHeader>
                <CardTitle>결과 해석</CardTitle>
                <CardDescription>Mann-Whitney U 검정 결과 해석 및 권장사항</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>분석 결과 요약</AlertTitle>
                  <AlertDescription>
                    {analysisResult.interpretation.summary}
                  </AlertDescription>
                </Alert>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>집단 비교</AlertTitle>
                  <AlertDescription>
                    {analysisResult.interpretation.comparison}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-medium">권장사항</h4>
                  <ul className="space-y-2">
                    {analysisResult.interpretation.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>`;

const newInterpretationTab = `          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
            <div className="space-y-6">
              {/* 가정 검정 */}
              <AssumptionTestCard
                title="비모수 검정 가정"
                tests={[
                  {
                    name: '독립성',
                    description: '두 집단의 관측값이 서로 독립적이어야 합니다',
                    pValue: null,
                    passed: true,
                    details: '동일 개체에서 반복 측정된 경우 Wilcoxon 부호순위 검정을 사용하세요'
                  } satisfies AssumptionTest,
                  {
                    name: '연속성 또는 순서형',
                    description: '종속변수가 최소한 순서형 척도여야 합니다',
                    pValue: null,
                    passed: true,
                    details: '명목형 데이터에는 적용할 수 없습니다'
                  } satisfies AssumptionTest
                ]}
                testType="mann-whitney"
                showRecommendations={false}
                showDetails={true}
              />

              {/* 결과 해석 */}
              <ResultInterpretation
                result={{
                  title: 'Mann-Whitney U 검정 결과',
                  summary: analysisResult.pValue < 0.05
                    ? \`두 그룹 간에 통계적으로 유의한 차이가 있습니다 (U = \${analysisResult.uValue.toFixed(2)}, p = \${analysisResult.pValue < 0.001 ? '< 0.001' : analysisResult.pValue.toFixed(3)}). 그룹 1의 중위수(\${analysisResult.descriptives.group1.median.toFixed(3)})와 그룹 2의 중위수(\${analysisResult.descriptives.group2.median.toFixed(3)})가 다릅니다.\`
                    : \`두 그룹 간에 통계적으로 유의한 차이가 없습니다 (U = \${analysisResult.uValue.toFixed(2)}, p = \${analysisResult.pValue.toFixed(3)}). 귀무가설을 기각할 수 없습니다.\`,
                  statistical: \`U = \${analysisResult.uValue.toFixed(2)}, p = \${analysisResult.pValue < 0.001 ? '< 0.001' : analysisResult.pValue.toFixed(4)}, r = \${analysisResult.effectSize.value.toFixed(3)} (\${analysisResult.effectSize.interpretation}), n₁ = \${analysisResult.nobs1}, n₂ = \${analysisResult.nobs2}, 중위수 차이 = \${analysisResult.medianDiff.toFixed(3)}\`,
                  practical: analysisResult.pValue < 0.05
                    ? \`효과크기 r = \${analysisResult.effectSize.value.toFixed(3)}는 \${analysisResult.effectSize.interpretation}입니다. 박스플롯을 통해 두 그룹의 분포를 시각적으로 비교하는 것을 권장합니다.\`
                    : '통계적으로 유의한 차이가 없으므로 두 그룹의 분포가 유사한 것으로 볼 수 있습니다. 표본 크기가 충분한지 확인하세요.'
                } satisfies InterpretationResult}
              />
            </div>
          </ContentTabsContent>`;

content = content.replace(oldInterpretationTab, newInterpretationTab);

writeFileSync(filePath, content, 'utf8');
console.log('mann-whitney page migration completed successfully!');
