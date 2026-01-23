import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/manova/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace the effect size section in multivariate tab with EffectSizeCard
const oldEffectSizeSection = `                {/* 모델 적합도 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      다변량 효과크기
                    </CardTitle>
                    <CardDescription>전체 모델의 설명력</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">다변량 R²</h4>
                          <p className="text-2xl font-bold">
                            {(analysisResult.modelFit.rSquaredMultivariate * 100).toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            전체 다변량 변동의 설명 비율
                          </p>
                        </div>

                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">효과크기 (d)</h4>
                          <p className="text-2xl font-bold">
                            {analysisResult.modelFit.effectSize.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cohen의 다변량 효과크기
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-800 mb-3">검정 통계량 요약</h4>
                          <div className="space-y-2 text-sm">
                            <p>Pillai's Trace: {analysisResult.modelFit.pillaiTrace.toFixed(3)}</p>
                            <p>Wilks' Lambda: {analysisResult.modelFit.wilksLambda.toFixed(3)}</p>
                            <p>Hotelling's Trace: {analysisResult.modelFit.hotellingTrace.toFixed(3)}</p>
                            <p>Roy's Max Root: {analysisResult.modelFit.royMaxRoot.toFixed(3)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>`;

const newEffectSizeSection = `                {/* 모델 적합도 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      다변량 효과크기
                    </CardTitle>
                    <CardDescription>전체 모델의 설명력</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <EffectSizeCard
                          title="다변량 R²"
                          value={analysisResult.modelFit.rSquaredMultivariate}
                          type="r_squared"
                          showInterpretation={true}
                          showVisualScale={true}
                        />
                        <EffectSizeCard
                          title="Cohen's d (다변량)"
                          value={analysisResult.modelFit.effectSize}
                          type="cohens_d"
                          showInterpretation={true}
                          showVisualScale={true}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-3">검정 통계량 요약</h4>
                          <div className="space-y-2 text-sm">
                            <p>Pillai's Trace: {analysisResult.modelFit.pillaiTrace.toFixed(3)}</p>
                            <p>Wilks' Lambda: {analysisResult.modelFit.wilksLambda.toFixed(3)}</p>
                            <p>Hotelling's Trace: {analysisResult.modelFit.hotellingTrace.toFixed(3)}</p>
                            <p>Roy's Max Root: {analysisResult.modelFit.royMaxRoot.toFixed(3)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>`;

content = content.replace(oldEffectSizeSection, newEffectSizeSection);

// 3. Replace the assumptions tab content with AssumptionTestCard
const oldAssumptionsTab = `              {/* 가정검정 탭 */}
              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>다변량 정규성</CardTitle>
                    <CardDescription>종속변수들의 결합분포 정규성 검정</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">{analysisResult.assumptions.multivariateNormality.test}</h4>
                          <p className="text-sm text-muted-foreground">
                            통계량: {analysisResult.assumptions.multivariateNormality.statistic.toFixed(3)}
                          </p>
                        </div>
                        <div className="text-right">
                          <PValueBadge value={analysisResult.assumptions.multivariateNormality.pValue} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {analysisResult.assumptions.multivariateNormality.assumptionMet ? '✓ 충족' : '✗ 위반'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>공분산 행렬 동질성</CardTitle>
                    <CardDescription>Box's M 검정</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Box's M</h4>
                          <p className="text-sm text-muted-foreground">
                            M = {analysisResult.assumptions.homogeneityOfCovariance.boxM.toFixed(2)},
                            F = {analysisResult.assumptions.homogeneityOfCovariance.fStatistic.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <PValueBadge value={analysisResult.assumptions.homogeneityOfCovariance.pValue} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {analysisResult.assumptions.homogeneityOfCovariance.assumptionMet ? '✓ 충족' : '✗ 위반'}
                          </p>
                        </div>
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>가정 해석</AlertTitle>
                        <AlertDescription>
                          p-value가 0.05보다 크면 공분산 행렬 동질성 가정이 충족됩니다.
                          위반 시 Pillai's Trace를 우선 사용하세요.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>

                {analysisResult.assumptions.outliers && (
                  <Card>
                    <CardHeader>
                      <CardTitle>다변량 이상치</CardTitle>
                      <CardDescription>Mahalanobis 거리 기반 이상치 탐지</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StatisticsTable
                        title="이상치 진단"
                        columns={[
                          { key: 'observation', header: '관측치', type: 'number', align: 'center' },
                          { key: 'distance', header: 'Mahalanobis D²', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                          { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                          { key: 'outlier', header: '이상치', type: 'custom', align: 'center', formatter: (v) => v }
                        ]}
                        data={analysisResult.assumptions.outliers.multivariate
                          .filter(o => o.isOutlier)
                          .map(outlier => ({
                            observation: outlier.observation,
                            distance: outlier.mahalanobisDistance,
                            pValue: <PValueBadge value={outlier.pValue} />,
                            outlier: (
                              <Badge variant="destructive">
                                이상치
                              </Badge>
                            )
                          }))}
                        bordered
                        compactMode
                      />

                      {analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length === 0 && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>탐지된 이상치가 없습니다.</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </ContentTabsContent>`;

const newAssumptionsTab = `              {/* 가정검정 탭 */}
              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="mt-6 space-y-6">
                <AssumptionTestCard
                  title="MANOVA 가정 검정"
                  tests={[
                    {
                      name: '다변량 정규성',
                      description: \`\${analysisResult.assumptions.multivariateNormality.test} (통계량: \${analysisResult.assumptions.multivariateNormality.statistic.toFixed(3)})\`,
                      pValue: analysisResult.assumptions.multivariateNormality.pValue,
                      passed: analysisResult.assumptions.multivariateNormality.assumptionMet,
                      details: analysisResult.assumptions.multivariateNormality.assumptionMet
                        ? '종속변수들의 결합분포가 다변량 정규분포를 따릅니다'
                        : '다변량 정규성 위반 시 표본 크기가 충분하면 (n > 30) MANOVA는 여전히 강건합니다'
                    } satisfies AssumptionTest,
                    {
                      name: '공분산 행렬 동질성',
                      description: \`Box's M = \${analysisResult.assumptions.homogeneityOfCovariance.boxM.toFixed(2)}, F = \${analysisResult.assumptions.homogeneityOfCovariance.fStatistic.toFixed(2)}\`,
                      pValue: analysisResult.assumptions.homogeneityOfCovariance.pValue,
                      passed: analysisResult.assumptions.homogeneityOfCovariance.assumptionMet,
                      details: analysisResult.assumptions.homogeneityOfCovariance.assumptionMet
                        ? '집단 간 공분산 행렬이 동질합니다'
                        : '공분산 행렬 동질성 위반 시 Pillai\\'s Trace를 사용하세요 (가정 위반에 가장 강건함)'
                    } satisfies AssumptionTest,
                    {
                      name: '다변량 이상치',
                      description: 'Mahalanobis 거리 기반 이상치 탐지',
                      pValue: null,
                      passed: analysisResult.assumptions.outliers
                        ? analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length === 0
                        : true,
                      details: analysisResult.assumptions.outliers
                        ? analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length === 0
                          ? '탐지된 다변량 이상치가 없습니다'
                          : \`\${analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length}개의 다변량 이상치가 탐지되었습니다. 이상치 제거 또는 강건한 방법 사용을 고려하세요\`
                        : '이상치 정보가 없습니다'
                    } satisfies AssumptionTest
                  ]}
                  testType="manova"
                  showRecommendations={true}
                  showDetails={true}
                />

                {/* 이상치 상세 테이블 - 이상치가 있는 경우에만 표시 */}
                {analysisResult.assumptions.outliers &&
                  analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>다변량 이상치 상세</CardTitle>
                      <CardDescription>Mahalanobis 거리 기반 이상치 목록</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StatisticsTable
                        title="이상치 진단"
                        columns={[
                          { key: 'observation', header: '관측치', type: 'number', align: 'center' },
                          { key: 'distance', header: 'Mahalanobis D²', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                          { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                          { key: 'outlier', header: '이상치', type: 'custom', align: 'center', formatter: (v) => v }
                        ]}
                        data={analysisResult.assumptions.outliers.multivariate
                          .filter(o => o.isOutlier)
                          .map(outlier => ({
                            observation: outlier.observation,
                            distance: outlier.mahalanobisDistance,
                            pValue: <PValueBadge value={outlier.pValue} />,
                            outlier: (
                              <Badge variant="destructive">
                                이상치
                              </Badge>
                            )
                          }))}
                        bordered
                        compactMode
                      />
                    </CardContent>
                  </Card>
                )}
              </ContentTabsContent>`;

content = content.replace(oldAssumptionsTab, newAssumptionsTab);

// 4. Replace interpretation tab with ResultInterpretation component
const oldInterpretationTab = `              {/* 해석 탭 */}
              <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>결과 해석 및 권장사항</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">전체 요약</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.interpretation.summary}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">다변량 효과</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.interpretation.overallEffect}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">단변량 효과</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {analysisResult.interpretation.univariateEffects.map((effect, i) => (
                          <li key={i}>• {effect}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">판별함수 해석</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.interpretation.discriminantInterpretation}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">권장사항</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {analysisResult.interpretation.recommendations.map((rec, i) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>

                    <Alert>
                      <Layers3 className="h-4 w-4" />
                      <AlertTitle>MANOVA 해석 순서</AlertTitle>
                      <AlertDescription>
                        1. 다변량 검정에서 유의성 확인 → 2. 단변량 F 검정 해석 →
                        3. 사후검정으로 구체적 차이 확인 → 4. 판별분석으로 차이 패턴 이해
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </ContentTabsContent>`;

const newInterpretationTab = `              {/* 해석 탭 */}
              <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="mt-6">
                <ResultInterpretation
                  result={{
                    title: 'MANOVA 분석 결과 해석',
                    summary: analysisResult.interpretation.summary,
                    statistical: \`다변량 검정: Wilks' Λ = \${analysisResult.modelFit.wilksLambda.toFixed(3)}, Pillai's Trace = \${analysisResult.modelFit.pillaiTrace.toFixed(3)}. 다변량 R² = \${(analysisResult.modelFit.rSquaredMultivariate * 100).toFixed(1)}%, 다변량 효과크기 d = \${analysisResult.modelFit.effectSize.toFixed(2)}. \${analysisResult.interpretation.overallEffect}\`,
                    practical: \`\${analysisResult.interpretation.discriminantInterpretation} 단변량 효과: \${analysisResult.interpretation.univariateEffects.join('; ')}\`
                  } satisfies InterpretationResult}
                />

                <Alert className="mt-4">
                  <Layers3 className="h-4 w-4" />
                  <AlertTitle>MANOVA 해석 순서</AlertTitle>
                  <AlertDescription>
                    1. 다변량 검정에서 유의성 확인 → 2. 단변량 F 검정 해석 →
                    3. 사후검정으로 구체적 차이 확인 → 4. 판별분석으로 차이 패턴 이해
                  </AlertDescription>
                </Alert>
              </ContentTabsContent>`;

content = content.replace(oldInterpretationTab, newInterpretationTab);

writeFileSync(filePath, content, 'utf8');
console.log('manova page migration completed successfully!');
