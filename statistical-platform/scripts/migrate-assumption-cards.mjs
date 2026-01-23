/**
 * Migrate assumption test displays to AssumptionTestCard
 */
import { readFileSync, writeFileSync } from 'fs';

// Add AssumptionTestCard import to a page
function addImport(content, pageName) {
  if (content.includes("import { AssumptionTestCard }")) {
    console.log(`  ⏭️  ${pageName}: AssumptionTestCard already imported`);
    return content;
  }

  // Try various import locations
  const importLocations = [
    "import { EffectSizeCard }",
    "import { PValueBadge }",
    "import { StatisticsTable }",
    "import { ResultContextHeader }"
  ];

  for (const loc of importLocations) {
    if (content.includes(loc)) {
      content = content.replace(
        loc,
        `${loc}\nimport { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'`
      );
      console.log(`  ✅ ${pageName}: Added AssumptionTestCard import`);
      return content;
    }
  }

  console.log(`  ⚠️  ${pageName}: Could not find import location`);
  return content;
}

// ANCOVA migration
function migrateAncova() {
  const filePath = 'app/(dashboard)/statistics/ancova/page.tsx';
  let content = readFileSync(filePath, 'utf8');

  content = addImport(content, 'ancova');

  // Replace the assumption content section (lines 623-702)
  const oldPattern = `<CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">회귀직선 동질성</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>F 통계량:</span>
                          <span className="font-mono">{analysisResult.assumptions.homogeneityOfSlopes.statistic.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-값:</span>
                          <PValueBadge value={analysisResult.assumptions.homogeneityOfSlopes.pValue} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.homogeneityOfSlopes.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.homogeneityOfSlopes.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">등분산성 (Levene)</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Levene 통계량:</span>
                          <span className="font-mono">{analysisResult.assumptions.homogeneityOfVariance.leveneStatistic.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-값:</span>
                          <PValueBadge value={analysisResult.assumptions.homogeneityOfVariance.pValue} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.homogeneityOfVariance.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.homogeneityOfVariance.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">정규성 (Shapiro-Wilk)</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>W 통계량:</span>
                          <span className="font-mono">{analysisResult.assumptions.normalityOfResiduals.shapiroW.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-값:</span>
                          <PValueBadge value={analysisResult.assumptions.normalityOfResiduals.pValue} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.normalityOfResiduals.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.normalityOfResiduals.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">선형성 (집단별 상관)</h4>
                      <div className="space-y-2 text-sm">
                        {analysisResult.assumptions.linearityOfCovariate.correlations.map(corr => (
                          <div key={corr.group} className="flex justify-between">
                            <span>{corr.group}:</span>
                            <span className="font-mono">r = {corr.correlation.toFixed(3)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center mt-2">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.linearityOfCovariate.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.linearityOfCovariate.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>`;

  const newPattern = `<CardContent>
                  <AssumptionTestCard
                    tests={[
                      {
                        name: '회귀직선 동질성',
                        testName: 'Homogeneity of Slopes',
                        statistic: analysisResult.assumptions.homogeneityOfSlopes.statistic,
                        pValue: analysisResult.assumptions.homogeneityOfSlopes.pValue,
                        passed: analysisResult.assumptions.homogeneityOfSlopes.assumptionMet,
                        description: '집단별 회귀직선 기울기가 동일한지 검정',
                        recommendation: !analysisResult.assumptions.homogeneityOfSlopes.assumptionMet
                          ? '회귀직선이 동질하지 않습니다. Johnson-Neyman 기법을 고려하세요.'
                          : undefined
                      },
                      {
                        name: '등분산성',
                        testName: "Levene's Test",
                        statistic: analysisResult.assumptions.homogeneityOfVariance.leveneStatistic,
                        pValue: analysisResult.assumptions.homogeneityOfVariance.pValue,
                        passed: analysisResult.assumptions.homogeneityOfVariance.assumptionMet,
                        description: '집단 간 분산 동질성 검정',
                        recommendation: !analysisResult.assumptions.homogeneityOfVariance.assumptionMet
                          ? '등분산 가정이 위반되었습니다. Welch 교정을 고려하세요.'
                          : undefined
                      },
                      {
                        name: '정규성',
                        testName: 'Shapiro-Wilk',
                        statistic: analysisResult.assumptions.normalityOfResiduals.shapiroW,
                        pValue: analysisResult.assumptions.normalityOfResiduals.pValue,
                        passed: analysisResult.assumptions.normalityOfResiduals.assumptionMet,
                        description: '잔차의 정규성 검정',
                        recommendation: !analysisResult.assumptions.normalityOfResiduals.assumptionMet
                          ? '정규성 가정이 위반되었습니다. 표본 크기가 충분히 크면 중심극한정리에 의해 강건합니다.'
                          : undefined
                      },
                      {
                        name: '선형성',
                        testName: 'Linearity Check',
                        passed: analysisResult.assumptions.linearityOfCovariate.assumptionMet,
                        description: \`집단별 상관: \${analysisResult.assumptions.linearityOfCovariate.correlations.map(c => \`\${c.group}: r=\${c.correlation.toFixed(3)}\`).join(', ')}\`,
                        recommendation: !analysisResult.assumptions.linearityOfCovariate.assumptionMet
                          ? '공변량과 종속변수 간 선형 관계가 약합니다.'
                          : undefined
                      }
                    ]}
                    testType="ANCOVA"
                    showRecommendations={true}
                    showDetails={true}
                  />
                </CardContent>`;

  if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ ancova: Replaced assumption test section with AssumptionTestCard');
    return true;
  } else {
    console.log('⚠️  ancova: Pattern not found');
    return false;
  }
}

// Chi-Square Independence migration
function migrateChiSquareIndependence() {
  const filePath = 'app/(dashboard)/statistics/chi-square-independence/page.tsx';
  let content = readFileSync(filePath, 'utf8');

  content = addImport(content, 'chi-square-independence');

  // Just add import for now - the assumption section needs manual review
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ chi-square-independence: Import added (manual review needed for assumption section)');
  return true;
}

// Correlation migration
function migrateCorrelation() {
  const filePath = 'app/(dashboard)/statistics/correlation/page.tsx';
  let content = readFileSync(filePath, 'utf8');

  content = addImport(content, 'correlation');

  writeFileSync(filePath, content, 'utf8');
  console.log('✅ correlation: Import added (manual review needed for assumption section)');
  return true;
}

// Kruskal-Wallis - add import even though non-parametric
function migrateKruskalWallis() {
  const filePath = 'app/(dashboard)/statistics/kruskal-wallis/page.tsx';
  let content = readFileSync(filePath, 'utf8');

  content = addImport(content, 'kruskal-wallis');

  writeFileSync(filePath, content, 'utf8');
  console.log('✅ kruskal-wallis: Import added (non-parametric - minimal assumptions)');
  return true;
}

// Poisson migration
function migratePoisson() {
  const filePath = 'app/(dashboard)/statistics/poisson/page.tsx';
  let content = readFileSync(filePath, 'utf8');

  content = addImport(content, 'poisson');

  // Replace assumptions tab content with AssumptionTestCard
  const oldPattern = `<ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">과산포 검정</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium">{results.assumptions.overdispersion.test_name}</h5>
                            <p className="text-sm text-muted-foreground">
                              분산이 평균보다 과도하게 큰지 검정
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {results.assumptions.overdispersion.dispersion_ratio.toFixed(3)}
                            </div>
                            <PValueBadge value={results.assumptions.overdispersion.p_value} />
                          </div>
                        </div>

                        <Alert>
                          {results.assumptions.overdispersion.assumption_met ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <AlertDescription>
                            {results.assumptions.overdispersion.assumption_met ? (
                              <span className="text-muted-foreground">
                                과산포가 없습니다. 포아송 모델이 적절합니다.
                                (산포비 = {results.assumptions.overdispersion.dispersion_ratio.toFixed(3)})
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                과산포가 감지되었습니다. 준-포아송 모델이나 음이항 회귀를 고려하세요.
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-3">적합도 검정</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Pearson 카이제곱</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">통계량:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.pearson_gof.statistic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">자유도:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.pearson_gof.df}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">p-value:</span>
                          <PValueBadge value={results.goodness_of_fit.pearson_gof.p_value} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">편차 검정</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">편차:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.deviance_gof.statistic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">자유도:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.deviance_gof.df}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">p-value:</span>
                          <PValueBadge value={results.goodness_of_fit.deviance_gof.p_value} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ContentTabsContent>`;

  const newPattern = `<ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
                <AssumptionTestCard
                  title="가정 검정 결과"
                  testType="poisson-regression"
                  tests={[
                    {
                      name: '과산포 검정 (Overdispersion)',
                      testName: results.assumptions.overdispersion.test_name,
                      pValue: results.assumptions.overdispersion.p_value,
                      statistic: results.assumptions.overdispersion.dispersion_ratio,
                      passed: results.assumptions.overdispersion.assumption_met,
                      description: '분산이 평균과 같은지 검정합니다. 포아송 분포는 평균=분산을 가정합니다.',
                      details: \`산포비 = \${results.assumptions.overdispersion.dispersion_ratio.toFixed(3)}\`,
                      recommendation: '과산포가 감지되면 준-포아송 모델이나 음이항 회귀분석을 고려하세요.',
                      severity: results.assumptions.overdispersion.assumption_met ? 'low' : 'high'
                    },
                    {
                      name: '적합도 검정 (Pearson)',
                      testName: 'Pearson Chi-square',
                      pValue: results.goodness_of_fit.pearson_gof.p_value,
                      statistic: results.goodness_of_fit.pearson_gof.statistic,
                      passed: results.goodness_of_fit.pearson_gof.p_value > 0.05,
                      description: 'Pearson 카이제곱 적합도 검정입니다.',
                      details: \`χ² = \${results.goodness_of_fit.pearson_gof.statistic.toFixed(2)}, df = \${results.goodness_of_fit.pearson_gof.df}\`,
                      recommendation: 'p < 0.05이면 모델 적합도가 낮을 수 있습니다.',
                      severity: results.goodness_of_fit.pearson_gof.p_value > 0.05 ? 'low' : 'medium'
                    },
                    {
                      name: '적합도 검정 (Deviance)',
                      testName: 'Deviance',
                      pValue: results.goodness_of_fit.deviance_gof.p_value,
                      statistic: results.goodness_of_fit.deviance_gof.statistic,
                      passed: results.goodness_of_fit.deviance_gof.p_value > 0.05,
                      description: 'Deviance 적합도 검정입니다.',
                      details: \`Deviance = \${results.goodness_of_fit.deviance_gof.statistic.toFixed(2)}, df = \${results.goodness_of_fit.deviance_gof.df}\`,
                      recommendation: 'p < 0.05이면 모델 개선이 필요할 수 있습니다.',
                      severity: results.goodness_of_fit.deviance_gof.p_value > 0.05 ? 'low' : 'medium'
                    }
                  ]}
                />
              </ContentTabsContent>`;

  if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ poisson: Replaced assumption test section with AssumptionTestCard');
    return true;
  } else {
    console.log('⚠️  poisson: Pattern not found - adding import only');
    writeFileSync(filePath, content, 'utf8');
    return false;
  }
}

// Stepwise migration
function migrateStepwise() {
  const filePath = 'app/(dashboard)/statistics/stepwise/page.tsx';
  let content = readFileSync(filePath, 'utf8');

  content = addImport(content, 'stepwise');

  // Replace diagnostics tab content with AssumptionTestCard
  const oldPattern = `<ContentTabsContent tabId="diagnostics" show={activeResultTab === 'diagnostics'} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>모델 진단</CardTitle>
                <CardDescription>
                  회귀분석 가정 검토를 위한 진단 통계량
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">자기상관성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Durbin-Watson</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.durbin_watson.toFixed(3)}</div>
                          <Badge className={Math.abs(results.model_diagnostics.durbin_watson - 2) < 0.5 ? 'bg-muted ' : 'bg-muted '}>
                            {Math.abs(results.model_diagnostics.durbin_watson - 2) < 0.5 ? '양호' : '주의'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">잔차 정규성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Jarque-Bera p값</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.jarque_bera_p.toFixed(3)}</div>
                          <Badge className={results.model_diagnostics.jarque_bera_p > 0.05 ? 'bg-muted ' : 'bg-muted '}>
                            {results.model_diagnostics.jarque_bera_p > 0.05 ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">등분산성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Breusch-Pagan p값</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.breusch_pagan_p.toFixed(3)}</div>
                          <Badge className={results.model_diagnostics.breusch_pagan_p > 0.05 ? 'bg-muted ' : 'bg-muted '}>
                            {results.model_diagnostics.breusch_pagan_p > 0.05 ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">다중공선성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">조건수</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.condition_number.toFixed(1)}</div>
                          <Badge className={results.model_diagnostics.condition_number < 30 ? 'bg-muted ' : results.model_diagnostics.condition_number < 100 ? 'bg-muted ' : 'bg-muted '}>
                            {results.model_diagnostics.condition_number < 30 ? '양호' : results.model_diagnostics.condition_number < 100 ? '주의' : '문제'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>`;

  const newPattern = `<ContentTabsContent tabId="diagnostics" show={activeResultTab === 'diagnostics'} className="space-y-4">
            <AssumptionTestCard
              title="모델 진단"
              testType="stepwise-regression"
              tests={[
                {
                  name: '자기상관성 (Durbin-Watson)',
                  testName: 'Durbin-Watson',
                  pValue: null,
                  statistic: results.model_diagnostics.durbin_watson,
                  passed: Math.abs(results.model_diagnostics.durbin_watson - 2) < 0.5,
                  description: '잔차의 자기상관을 검정합니다. 값이 2에 가까울수록 자기상관이 없습니다.',
                  details: \`DW = \${results.model_diagnostics.durbin_watson.toFixed(3)} (이상값: 2)\`,
                  recommendation: '자기상관이 있으면 시계열 모델이나 Newey-West 표준오차를 고려하세요.',
                  severity: Math.abs(results.model_diagnostics.durbin_watson - 2) < 0.5 ? 'low' : 'medium'
                },
                {
                  name: '잔차 정규성 (Jarque-Bera)',
                  testName: 'Jarque-Bera',
                  pValue: results.model_diagnostics.jarque_bera_p,
                  statistic: null,
                  passed: results.model_diagnostics.jarque_bera_p > 0.05,
                  description: '잔차가 정규분포를 따르는지 검정합니다.',
                  details: \`p = \${results.model_diagnostics.jarque_bera_p.toFixed(4)}\`,
                  recommendation: '정규성이 위배되면 부트스트랩이나 비모수 방법을 고려하세요.',
                  severity: results.model_diagnostics.jarque_bera_p > 0.05 ? 'low' : 'medium'
                },
                {
                  name: '등분산성 (Breusch-Pagan)',
                  testName: 'Breusch-Pagan',
                  pValue: results.model_diagnostics.breusch_pagan_p,
                  statistic: null,
                  passed: results.model_diagnostics.breusch_pagan_p > 0.05,
                  description: '잔차의 분산이 일정한지 검정합니다.',
                  details: \`p = \${results.model_diagnostics.breusch_pagan_p.toFixed(4)}\`,
                  recommendation: '이분산이 있으면 가중최소제곱법(WLS)이나 robust 표준오차를 사용하세요.',
                  severity: results.model_diagnostics.breusch_pagan_p > 0.05 ? 'low' : 'medium'
                },
                {
                  name: '다중공선성 (조건수)',
                  testName: 'Condition Number',
                  pValue: null,
                  statistic: results.model_diagnostics.condition_number,
                  passed: results.model_diagnostics.condition_number < 30,
                  description: '예측변수 간 다중공선성을 검정합니다. 조건수 < 30이 권장됩니다.',
                  details: \`조건수 = \${results.model_diagnostics.condition_number.toFixed(1)}\`,
                  recommendation: '다중공선성이 높으면 변수 제거나 릿지 회귀를 고려하세요.',
                  severity: results.model_diagnostics.condition_number < 30 ? 'low' : results.model_diagnostics.condition_number < 100 ? 'medium' : 'high'
                }
              ]}
            />
          </ContentTabsContent>`;

  if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ stepwise: Replaced diagnostics section with AssumptionTestCard');
    return true;
  } else {
    console.log('⚠️  stepwise: Pattern not found - adding import only');
    writeFileSync(filePath, content, 'utf8');
    return false;
  }
}

console.log('=== Migrating Assumption Test Cards ===\n');
migrateAncova();
migrateChiSquareIndependence();
migrateCorrelation();
migrateKruskalWallis();
migratePoisson();
migrateStepwise();
console.log('\n✅ Migration complete');
