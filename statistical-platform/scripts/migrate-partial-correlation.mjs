import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/partial-correlation/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports (already has AssumptionTestCard, need to add ResultInterpretation)
const oldImport = `import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'`;
const newImport = `import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace interpretation tab with ResultInterpretation
const oldInterpretationTab = `          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>분석 결과 해석</CardTitle>
                <CardDescription>
                  편상관분석 결과에 대한 해석과 후속 분석 권장사항
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">요약</h4>
                  <p className="text-gray-700">{results.interpretation.summary}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">편상관 해석 기준</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-muted0 rounded-full mr-2"></div>
                        <span className="text-sm">|r| ≥ 0.7: 강한 상관</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-muted0 rounded-full mr-2"></div>
                        <span className="text-sm">0.5 ≤ |r| &lt; 0.7: 중간 상관</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-muted0 rounded-full mr-2"></div>
                        <span className="text-sm">0.3 ≤ |r| &lt; 0.5: 약한 상관</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                        <span className="text-sm">|r| &lt; 0.3: 매우 약한 상관</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">권장사항</h4>
                  <ul className="space-y-2">
                    {results.interpretation.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>`;

const newInterpretationTab = `          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
            <ResultInterpretation
              result={{
                title: '편상관분석 결과 해석',
                summary: results.interpretation.summary,
                statistical: \`분석된 변수 쌍: \${results.summary.n_pairs}개, 유의한 쌍: \${results.summary.significant_pairs}개, 평균 편상관계수: \${results.summary.mean_partial_corr.toFixed(3)}, 범위: [\${results.summary.min_partial_corr.toFixed(3)}, \${results.summary.max_partial_corr.toFixed(3)}], 통제변수 수: \${selectedVariables?.covariate?.length || 0}개\`,
                practical: results.summary.significant_pairs > 0
                  ? \`통제변수의 영향을 제거한 후에도 \${results.summary.significant_pairs}개의 변수 쌍에서 유의한 상관관계가 발견되었습니다. 이는 해당 변수들 간의 관계가 통제변수와 독립적임을 의미합니다. \${results.interpretation.recommendations.join(' ')}\`
                  : \`통제변수의 영향을 제거한 후 유의한 상관관계가 발견되지 않았습니다. 이는 원래의 상관관계가 통제변수에 의해 매개되었을 가능성을 시사합니다. \${results.interpretation.recommendations.join(' ')}\`
              } satisfies InterpretationResult}
            />

            {/* 편상관 해석 기준 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">편상관 해석 기준</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
                      <span className="text-sm">|r| ≥ 0.7: 강한 상관</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary/70 rounded-full mr-2"></div>
                      <span className="text-sm">0.5 ≤ |r| &lt; 0.7: 중간 상관</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary/40 rounded-full mr-2"></div>
                      <span className="text-sm">0.3 ≤ |r| &lt; 0.5: 약한 상관</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                      <span className="text-sm">|r| &lt; 0.3: 매우 약한 상관</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>`;

content = content.replace(oldInterpretationTab, newInterpretationTab);

writeFileSync(filePath, content, 'utf8');
console.log('partial-correlation page migration completed successfully!');
