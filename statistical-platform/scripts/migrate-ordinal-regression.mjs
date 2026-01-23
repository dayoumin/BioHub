import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/ordinal-regression/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable, TableColumn, TableRow as StatTableRow } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable, TableColumn, TableRow as StatTableRow } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace assumptions tab content with AssumptionTestCard
const oldAssumptionsTab = `              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">비례 오즈 가정 검정</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium">{results.assumptions.proportional_odds.test_name}</h5>
                            <p className="text-sm text-gray-600">
                              독립변수의 효과가 모든 임계값에서 동일한지 검정
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {results.assumptions.proportional_odds.test_statistic.toFixed(3)}
                            </div>
                            <PValueBadge value={results.assumptions.proportional_odds.p_value} />
                          </div>
                        </div>

                        <Alert>
                          {results.assumptions.proportional_odds.assumption_met ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <AlertDescription>
                            {results.assumptions.proportional_odds.assumption_met ? (
                              <span className="text-muted-foreground">
                                비례 오즈 가정이 충족됩니다. 표준 서열 회귀모델을 사용할 수 있습니다.
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                비례 오즈 가정이 위반되었습니다. 부분 비례 오즈 모델을 고려하세요.
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-3">다중공선성 진단</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'variable', header: '변수', type: 'text' },
                      { key: 'vif', header: 'VIF', type: 'number' },
                      { key: 'tolerance', header: 'Tolerance', type: 'number' },
                      {
                        key: 'judgment',
                        header: '판정',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const vifValue = row?.vif as number | undefined
                          if (vifValue === undefined) return '-'
                          return (
                            <Badge variant={vifValue < 5 ? "default" : vifValue < 10 ? "secondary" : "destructive"}>
                              {vifValue < 5 ? '양호' : vifValue < 10 ? '주의' : '위험'}
                            </Badge>
                          )
                        }
                      }
                    ] as TableColumn[]}
                    data={results.assumptions.multicollinearity.map(vif => ({
                      variable: vif.variable,
                      vif: vif.vif,
                      tolerance: vif.tolerance
                    }))}
                    compactMode
                  />
                </div>
              </ContentTabsContent>`;

const newAssumptionsTab = `              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
                <AssumptionTestCard
                  title="서열 회귀분석 가정 검정"
                  tests={[
                    {
                      name: '비례 오즈 가정',
                      description: '독립변수의 효과가 모든 임계값에서 동일한지 검정합니다',
                      testName: results.assumptions.proportional_odds.test_name,
                      pValue: results.assumptions.proportional_odds.p_value,
                      passed: results.assumptions.proportional_odds.assumption_met,
                      details: results.assumptions.proportional_odds.assumption_met
                        ? '비례 오즈 가정이 충족됩니다. 표준 서열 회귀모델을 사용할 수 있습니다.'
                        : '비례 오즈 가정이 위반되었습니다. 부분 비례 오즈 모델을 고려하세요.',
                      recommendation: !results.assumptions.proportional_odds.assumption_met
                        ? '부분 비례 오즈 모델 또는 다항 로지스틱 회귀 고려'
                        : undefined,
                      severity: !results.assumptions.proportional_odds.assumption_met ? 'high' : undefined
                    } satisfies AssumptionTest,
                    ...results.assumptions.multicollinearity.map(vif => ({
                      name: \`다중공선성: \${vif.variable}\`,
                      description: \`VIF = \${vif.vif.toFixed(2)}, Tolerance = \${vif.tolerance.toFixed(3)}\`,
                      pValue: null,
                      passed: vif.vif < 10,
                      details: vif.vif < 5
                        ? '다중공선성 문제 없음'
                        : vif.vif < 10
                          ? '주의 필요 - 다중공선성 존재 가능'
                          : '심각한 다중공선성 - 변수 제거 권장',
                      recommendation: vif.vif >= 10 ? '해당 변수 제거 또는 결합 고려' : undefined,
                      severity: vif.vif >= 10 ? 'high' : vif.vif >= 5 ? 'medium' : undefined
                    } satisfies AssumptionTest))
                  ]}
                  testType="ordinal-regression"
                  showRecommendations={true}
                  showDetails={true}
                />
              </ContentTabsContent>`;

content = content.replace(oldAssumptionsTab, newAssumptionsTab);

// 3. Replace interpretation tab with ResultInterpretation
const oldInterpretationTab = `              <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">결과 해석</h4>
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>모델 적합도:</strong> McFadden R² = {results.model_fit.pseudo_r_squared_mcfadden.toFixed(3)}으로,
                        모델이 데이터의 {(results.model_fit.pseudo_r_squared_mcfadden * 100).toFixed(1)}%를 설명합니다.
                        일반적으로 0.2 이상이면 양호한 적합도로 판단됩니다.
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>계수 해석:</strong> 각 독립변수의 오즈비가 1보다 크면 해당 변수가 증가할 때
                        더 높은 범주에 속할 가능성이 증가함을 의미합니다. 예를 들어,
                        교육수준의 오즈비가 {results.coefficients.find(c => c.variable === 'education')?.odds_ratio.toFixed(2)}라면,
                        교육수준이 한 단계 올라갈 때마다 더 높은 만족도를 가질 오즈가 {results.coefficients.find(c => c.variable === 'education')?.odds_ratio.toFixed(2)}배 증가합니다.
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <BarChart3 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>예측 성능:</strong> 모델의 전체 정확도는 {(results.classification_metrics.accuracy * 100).toFixed(1)}%입니다.
                        이는 실제 범주를 올바르게 예측한 비율을 나타냅니다.
                        각 범주별로 정밀도와 재현율을 확인하여 특정 범주에서의 예측 성능을 파악할 수 있습니다.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">실용적 함의</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>정책 결정:</strong> 각 변수의 영향력을 통해 만족도 향상을 위한 우선순위 설정</li>
                      <li>• <strong>자원 배분:</strong> 가장 효과적인 변수에 집중적으로 투자</li>
                      <li>• <strong>위험 관리:</strong> 낮은 만족도가 예측되는 집단에 대한 사전 대응</li>
                      <li>• <strong>성과 모니터링:</strong> 모델을 통한 지속적인 만족도 예측 및 평가</li>
                      <li>• <strong>개선 방안:</strong> 비례 오즈 가정 {results.assumptions.proportional_odds.assumption_met ? '충족' : '위반'} 상황에 따른 모델 개선 필요성</li>
                    </ul>
                  </div>
                </div>
              </ContentTabsContent>`;

const newInterpretationTab = `              <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
                {/* 주요 계수에 대한 신뢰구간 표시 */}
                {results.coefficients.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">주요 계수의 95% 신뢰구간</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {results.coefficients.slice(0, 3).map((coef, index) => (
                        <div key={index} className="space-y-2">
                          <p className="font-medium text-sm">{coef.variable}</p>
                          <ConfidenceIntervalDisplay
                            lower={coef.ciLower}
                            upper={coef.ciUpper}
                            estimate={coef.coefficient}
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
                    title: '서열 회귀분석 결과 해석',
                    summary: \`McFadden R² = \${results.model_fit.pseudo_r_squared_mcfadden.toFixed(3)}으로 모델이 데이터의 \${(results.model_fit.pseudo_r_squared_mcfadden * 100).toFixed(1)}%를 설명합니다. 모델의 전체 예측 정확도는 \${(results.classification_metrics.accuracy * 100).toFixed(1)}%입니다.\`,
                    statistical: \`Ordinal Logistic Regression: n = \${results.model_info.n_observations}, AIC = \${results.model_fit.aic.toFixed(2)}, BIC = \${results.model_fit.bic.toFixed(2)}, McFadden R² = \${results.model_fit.pseudo_r_squared_mcfadden.toFixed(3)}, Nagelkerke R² = \${results.model_fit.pseudo_r_squared_nagelkerke.toFixed(3)}, 정확도 = \${(results.classification_metrics.accuracy * 100).toFixed(1)}%\`,
                    practical: results.model_fit.pseudo_r_squared_mcfadden >= 0.2
                      ? \`McFadden R² ≥ 0.2로 양호한 모델 적합도를 보입니다. 각 독립변수의 오즈비를 통해 종속변수 범주에 미치는 영향력을 해석할 수 있습니다. 비례 오즈 가정이 \${results.assumptions.proportional_odds.assumption_met ? '충족되어 표준 서열 회귀모델이 적합합니다' : '위반되어 부분 비례 오즈 모델을 고려해야 합니다'}.\`
                      : \`McFadden R² < 0.2로 모델 설명력이 낮습니다. 추가 예측 변수를 고려하거나 다른 모델링 방법을 검토하세요. 비례 오즈 가정이 \${results.assumptions.proportional_odds.assumption_met ? '충족됩니다' : '위반되었습니다'}.\`
                  } satisfies InterpretationResult}
                />
              </ContentTabsContent>`;

content = content.replace(oldInterpretationTab, newInterpretationTab);

writeFileSync(filePath, content, 'utf8');
console.log('ordinal-regression page migration completed successfully!');
