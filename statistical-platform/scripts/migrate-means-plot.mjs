import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/means-plot/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace the interpretation tab content with ResultInterpretation component
const oldInterpretationTab = `          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>분석 결과 해석</CardTitle>
                <CardDescription>
                  평균 도표 결과에 대한 해석과 후속 분석 권장사항
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">요약</h4>
                  <p className="text-gray-700">{results.interpretation.summary}</p>
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
            {/* 신뢰구간 시각화 */}
            {Object.values(results.descriptives).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>집단별 95% 신뢰구간</CardTitle>
                  <CardDescription>각 집단의 평균에 대한 95% 신뢰구간</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.values(results.descriptives).map((desc, index) => (
                    <div key={index} className="space-y-2">
                      <p className="font-medium text-sm">{desc.group}</p>
                      <ConfidenceIntervalDisplay
                        lower={desc.ciLower}
                        upper={desc.ciUpper}
                        estimate={desc.mean}
                        level={0.95}
                        showVisualScale={true}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 결과 해석 */}
            <ResultInterpretation
              result={{
                title: '평균 도표 분석 결과',
                summary: results.interpretation.summary,
                statistical: \`집단 수: \${Object.keys(results.descriptives).length}개, 총 표본 크기: \${Object.values(results.descriptives).reduce((sum, d) => sum + d.count, 0)}개. 집단별 평균 범위: \${Math.min(...Object.values(results.descriptives).map(d => d.mean)).toFixed(3)} ~ \${Math.max(...Object.values(results.descriptives).map(d => d.mean)).toFixed(3)}\`,
                practical: results.interpretation.recommendations.join(' ')
              } satisfies InterpretationResult}
            />
          </ContentTabsContent>`;

content = content.replace(oldInterpretationTab, newInterpretationTab);

writeFileSync(filePath, content, 'utf8');
console.log('means-plot page migration completed successfully!');
