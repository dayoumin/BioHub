import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/mixed-model/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable, type TableColumn, type TableRow } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable, type TableColumn, type TableRow } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace diagnostics tab content with AssumptionTestCard
const oldDiagnosticsTab = `          {/* 진단 탭 */}
          <ContentTabsContent tabId="diagnostics" show={activeResultTab === 'diagnostics'} className="mt-6 space-y-6">
            {/* 잔차 진단 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  잔차 진단
                </CardTitle>
                <CardDescription>모형 가정 검정</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">정규성</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Shapiro-Wilk W:</span>
                        <span className="font-medium">{analysisResult.residualAnalysis.normality.shapiroW.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>p-value:</span>
                        <PValueBadge value={analysisResult.residualAnalysis.normality.pValue} />
                      </div>
                      <div className="flex items-center gap-2">
                        {analysisResult.residualAnalysis.normality.assumptionMet ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={analysisResult.residualAnalysis.normality.assumptionMet ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {analysisResult.residualAnalysis.normality.assumptionMet ? '가정 충족' : '가정 위반'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">등분산성</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Levene 통계량:</span>
                        <span className="font-medium">{analysisResult.residualAnalysis.homoscedasticity.leveneStatistic.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>p-value:</span>
                        <PValueBadge value={analysisResult.residualAnalysis.homoscedasticity.pValue} />
                      </div>
                      <div className="flex items-center gap-2">
                        {analysisResult.residualAnalysis.homoscedasticity.assumptionMet ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={analysisResult.residualAnalysis.homoscedasticity.assumptionMet ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {analysisResult.residualAnalysis.homoscedasticity.assumptionMet ? '가정 충족' : '가정 위반'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">독립성</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Durbin-Watson:</span>
                        <span className="font-medium">{analysisResult.residualAnalysis.independence.durbinWatson.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>p-value:</span>
                        <PValueBadge value={analysisResult.residualAnalysis.independence.pValue} />
                      </div>
                      <div className="flex items-center gap-2">
                        {analysisResult.residualAnalysis.independence.assumptionMet ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={analysisResult.residualAnalysis.independence.assumptionMet ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {analysisResult.residualAnalysis.independence.assumptionMet ? '가정 충족' : '가정 위반'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>잔차 진단 요약</AlertTitle>
                  <AlertDescription>
                    모든 주요 가정이 충족되었습니다. 정규성 (p = 0.234), 등분산성 (p = 0.178),
                    독립성 (DW = 1.98) 모두 적절한 수준을 보입니다. 혼합 모형 결과를 신뢰할 수 있습니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>`;

const newDiagnosticsTab = `          {/* 진단 탭 */}
          <ContentTabsContent tabId="diagnostics" show={activeResultTab === 'diagnostics'} className="mt-6 space-y-6">
            {/* 가정 검정 - AssumptionTestCard 사용 */}
            <AssumptionTestCard
              title="선형 혼합 모형 가정 검정"
              tests={[
                {
                  name: '잔차 정규성',
                  description: \`Shapiro-Wilk W = \${analysisResult.residualAnalysis.normality.shapiroW.toFixed(3)}\`,
                  pValue: analysisResult.residualAnalysis.normality.pValue,
                  passed: analysisResult.residualAnalysis.normality.assumptionMet,
                  details: analysisResult.residualAnalysis.normality.assumptionMet
                    ? '잔차가 정규분포를 따릅니다. 모형 추정이 적절합니다.'
                    : '잔차가 정규분포를 따르지 않습니다. 표본 크기가 충분히 크면 중심극한정리에 의해 문제가 완화될 수 있습니다.'
                } satisfies AssumptionTest,
                {
                  name: '등분산성 (Homoscedasticity)',
                  description: \`Levene 통계량 = \${analysisResult.residualAnalysis.homoscedasticity.leveneStatistic.toFixed(2)}\`,
                  pValue: analysisResult.residualAnalysis.homoscedasticity.pValue,
                  passed: analysisResult.residualAnalysis.homoscedasticity.assumptionMet,
                  details: analysisResult.residualAnalysis.homoscedasticity.assumptionMet
                    ? '잔차의 분산이 일정합니다. 등분산 가정이 충족됩니다.'
                    : '잔차의 분산이 일정하지 않습니다. 가중 최소제곱법이나 분산 함수 모델링을 고려하세요.'
                } satisfies AssumptionTest,
                {
                  name: '독립성 (Independence)',
                  description: \`Durbin-Watson = \${analysisResult.residualAnalysis.independence.durbinWatson.toFixed(2)}\`,
                  pValue: analysisResult.residualAnalysis.independence.pValue,
                  passed: analysisResult.residualAnalysis.independence.assumptionMet,
                  details: analysisResult.residualAnalysis.independence.assumptionMet
                    ? '잔차 간 자기상관이 없습니다. 독립성 가정이 충족됩니다.'
                    : '잔차 간 자기상관이 존재합니다. 자기상관 구조를 모형에 포함시키는 것을 고려하세요.'
                } satisfies AssumptionTest
              ]}
              testType="mixed-model"
              showRecommendations={true}
              showDetails={true}
            />`;

content = content.replace(oldDiagnosticsTab, newDiagnosticsTab);

// 3. Replace interpretation tab with ResultInterpretation component
const oldInterpretationTab = `          {/* 해석 탭 */}
          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  결과 해석
                </CardTitle>
                <CardDescription>선형 혼합 모형 결과의 종합적 해석</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 요약 */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">분석 요약</h4>
                  <p className="text-muted-foreground">{analysisResult.interpretation.summary}</p>
                </div>

                {/* 고정효과 해석 */}
                <div>
                  <h4 className="font-medium mb-3">고정효과 해석</h4>
                  <div className="space-y-2">
                    {analysisResult.interpretation.fixedEffectsInterpretation.map((interpretation, index) => (
                      <div key={index} className="p-3 bg-muted rounded border-l-4 border-success">
                        <p className="text-muted-foreground text-sm">{interpretation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 무선효과 해석 */}
                <div>
                  <h4 className="font-medium mb-3">무선효과 해석</h4>
                  <div className="space-y-2">
                    {analysisResult.interpretation.randomEffectsInterpretation.map((interpretation, index) => (
                      <div key={index} className="p-3 bg-muted rounded border-l-4 border-orange-400">
                        <p className="text-muted-foreground text-sm">{interpretation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 분산 설명 */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">분산 설명</h4>
                  <p className="text-muted-foreground">{analysisResult.interpretation.varianceExplained}</p>
                </div>

                {/* 권장사항 */}
                <div>
                  <h4 className="font-medium mb-3">권장사항</h4>
                  <ul className="space-y-2">
                    {analysisResult.interpretation.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Alert>
                  <Network className="h-4 w-4" />
                  <AlertTitle>혼합 모형의 장점</AlertTitle>
                  <AlertDescription>
                    1. 계층적 데이터 구조 적절히 모델링<br/>
                    2. 개체 간 이질성 고려한 정확한 추정<br/>
                    3. 누락 데이터에 대한 강건성<br/>
                    4. 집단 및 개체 수준 예측 가능
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </ContentTabsContent>`;

const newInterpretationTab = `          {/* 해석 탭 */}
          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="mt-6 space-y-6">
            {/* 고정효과 신뢰구간 시각화 */}
            <Card>
              <CardHeader>
                <CardTitle>고정효과 95% 신뢰구간</CardTitle>
                <CardDescription>각 고정효과의 추정치와 신뢰구간</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResult.fixedEffects.filter(e => e.effect !== '(Intercept)').map((effect, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{effect.effect}</span>
                      <Badge variant={effect.significance ? 'default' : 'outline'}>
                        {effect.significance ? '유의함' : '유의하지 않음'}
                      </Badge>
                    </div>
                    <ConfidenceIntervalDisplay
                      lower={effect.ci95Lower}
                      upper={effect.ci95Upper}
                      estimate={effect.coefficient}
                      level={0.95}
                      showVisualScale={true}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 결과 해석 */}
            <ResultInterpretation
              result={{
                title: '선형 혼합 모형 분석 결과',
                summary: analysisResult.interpretation.summary,
                statistical: \`모형 적합도: 주변 R² = \${(analysisResult.modelFit.marginalRSquared * 100).toFixed(1)}% (고정효과), 조건부 R² = \${(analysisResult.modelFit.conditionalRSquared * 100).toFixed(1)}% (전체). ICC = \${analysisResult.modelFit.icc.toFixed(3)}, AIC = \${analysisResult.modelFit.aic.toFixed(2)}, BIC = \${analysisResult.modelFit.bic.toFixed(2)}. 유의한 고정효과: \${analysisResult.fixedEffects.filter(e => e.significance && e.effect !== '(Intercept)').map(e => e.effect).join(', ') || '없음'}\`,
                practical: \`\${analysisResult.interpretation.varianceExplained} \${analysisResult.interpretation.fixedEffectsInterpretation.join(' ')} \${analysisResult.interpretation.randomEffectsInterpretation.join(' ')}\`
              } satisfies InterpretationResult}
            />

            <Alert>
              <Network className="h-4 w-4" />
              <AlertTitle>혼합 모형의 장점</AlertTitle>
              <AlertDescription>
                1. 계층적 데이터 구조 적절히 모델링<br/>
                2. 개체 간 이질성 고려한 정확한 추정<br/>
                3. 누락 데이터에 대한 강건성<br/>
                4. 집단 및 개체 수준 예측 가능
              </AlertDescription>
            </Alert>
          </ContentTabsContent>`;

content = content.replace(oldInterpretationTab, newInterpretationTab);

writeFileSync(filePath, content, 'utf8');
console.log('mixed-model page migration completed successfully!');
