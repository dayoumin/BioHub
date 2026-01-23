import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/mann-kendall/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace assumptions tab content with AssumptionTestCard
const oldAssumptionsTab = `          <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'}>
            <Card>
              <CardHeader>
                <CardTitle>Mann-Kendall 검정 가정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">비모수적 방법</h4>
                      <p className="text-sm text-muted-foreground">
                        정규분포 가정이 불필요하여 다양한 분포의 데이터에 적용 가능합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">독립성 가정</h4>
                      <p className="text-sm text-muted-foreground">
                        관측값들이 상호 독립적이어야 합니다. 자기상관이 있는 경우
                        Hamed-Rao 또는 Pre-whitening 수정 방법을 사용하세요.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">최소 표본 크기</h4>
                      <p className="text-sm text-muted-foreground">
                        최소 4개의 관측값이 필요하며, 더 정확한 결과를 위해서는
                        10개 이상의 관측값을 권장합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold">단조성 가정</h4>
                      <p className="text-sm text-muted-foreground">
                        이 검정은 단조 증가 또는 단조 감소 추세만 감지할 수 있으며,
                        계절성이나 주기적 패턴은 감지하지 못합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>`;

const newAssumptionsTab = `          <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'}>
            <AssumptionTestCard
              title="Mann-Kendall 검정 가정"
              tests={[
                {
                  name: '독립성',
                  description: '관측값들이 상호 독립적이어야 합니다',
                  pValue: null,
                  passed: true,
                  details: '자기상관이 있는 경우 Hamed-Rao 또는 Pre-whitening 수정 방법을 사용하세요',
                  recommendation: '시계열 데이터의 자기상관을 확인하세요'
                } satisfies AssumptionTest,
                {
                  name: '연속성',
                  description: '데이터가 연속형이어야 합니다',
                  pValue: null,
                  passed: true,
                  details: '이산형 데이터에서도 사용 가능하나 동점(ties)이 많으면 검정력이 감소합니다'
                } satisfies AssumptionTest,
                {
                  name: '단조성',
                  description: '단조 증가 또는 단조 감소 추세만 감지 가능',
                  pValue: null,
                  passed: true,
                  details: '계절성이나 주기적 패턴은 감지하지 못합니다. 계절성이 있는 경우 Seasonal Mann-Kendall을 사용하세요'
                } satisfies AssumptionTest
              ]}
              testType="mann-kendall"
              showRecommendations={true}
              showDetails={true}
            />
          </ContentTabsContent>`;

content = content.replace(oldAssumptionsTab, newAssumptionsTab);

// 3. Replace interpretation tab content with ResultInterpretation
const oldInterpretationTab = `          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
            <Card>
              <CardHeader>
                <CardTitle>결과 해석</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">추세 해석</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    {results.trend === 'increasing' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">증가 추세 감지</span>
                        </div>
                        <p className="text-sm">
                          시계열 데이터에서 통계적으로 유의한 증가 추세가 발견되었습니다.
                          Sen&apos;s slope ({results.slope.toFixed(6)})는 단위 시간당 평균 증가량을 나타냅니다.
                        </p>
                      </div>
                    )}
                    {results.trend === 'decreasing' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">감소 추세 감지</span>
                        </div>
                        <p className="text-sm">
                          시계열 데이터에서 통계적으로 유의한 감소 추세가 발견되었습니다.
                          Sen&apos;s slope ({results.slope.toFixed(6)})는 단위 시간당 평균 감소량을 나타냅니다.
                        </p>
                      </div>
                    )}
                    {results.trend === 'no trend' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-700">추세 없음</span>
                        </div>
                        <p className="text-sm">
                          시계열 데이터에서 통계적으로 유의한 추세가 발견되지 않았습니다.
                          데이터는 시간에 따라 일정한 패턴을 보이지 않습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">통계적 유의성</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm">
                      p-value = {results.p < 0.001 ? '< 0.001' : results.p.toFixed(6)}
                      {results.p < 0.01 && ', 매우 강한 증거'}
                      {results.p >= 0.01 && results.p < 0.05 && ', 중간 정도의 증거'}
                      {results.p >= 0.05 && ', 약한 증거 또는 증거 없음'}
                    </p>
                    <p className="text-sm mt-2">
                      Kendall&apos;s Tau = {results.tau.toFixed(4)}
                      (상관의 강도: {Math.abs(results.tau) < 0.3 ? '약함' : Math.abs(results.tau) < 0.7 ? '중간' : '강함'})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>`;

const newInterpretationTab = `          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
            <ResultInterpretation
              result={{
                title: 'Mann-Kendall 추세 검정 결과',
                summary: results.trend === 'increasing'
                  ? \`시계열 데이터에서 통계적으로 유의한 증가 추세가 발견되었습니다 (p = \${results.p < 0.001 ? '< 0.001' : results.p.toFixed(4)}). Sen's slope = \${results.slope.toFixed(6)}로, 단위 시간당 평균 \${Math.abs(results.slope).toFixed(6)}만큼 증가합니다.\`
                  : results.trend === 'decreasing'
                    ? \`시계열 데이터에서 통계적으로 유의한 감소 추세가 발견되었습니다 (p = \${results.p < 0.001 ? '< 0.001' : results.p.toFixed(4)}). Sen's slope = \${results.slope.toFixed(6)}로, 단위 시간당 평균 \${Math.abs(results.slope).toFixed(6)}만큼 감소합니다.\`
                    : \`시계열 데이터에서 통계적으로 유의한 추세가 발견되지 않았습니다 (p = \${results.p.toFixed(4)}). 데이터는 시간에 따라 일정한 패턴을 보이지 않습니다.\`,
                statistical: \`Z = \${results.z.toFixed(4)}, p = \${results.p < 0.001 ? '< 0.001' : results.p.toFixed(6)}, Kendall's τ = \${results.tau.toFixed(4)}, Sen's slope = \${results.slope.toFixed(6)}, 절편 = \${results.intercept.toFixed(6)}\`,
                practical: results.h
                  ? \`Kendall's Tau = \${results.tau.toFixed(4)} (\${Math.abs(results.tau) < 0.3 ? '약한' : Math.abs(results.tau) < 0.7 ? '중간' : '강한'} 상관). 이 추세가 실질적으로 의미있는지 도메인 지식을 바탕으로 해석하세요.\`
                  : '통계적으로 유의한 추세가 없으므로, 시간에 따른 체계적인 변화가 없는 것으로 보입니다.'
              } satisfies InterpretationResult}
            />
          </ContentTabsContent>`;

content = content.replace(oldInterpretationTab, newInterpretationTab);

writeFileSync(filePath, content, 'utf8');
console.log('mann-kendall page migration completed successfully!');
