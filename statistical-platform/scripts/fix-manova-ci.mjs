import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/manova/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add ConfidenceIntervalDisplay import
const oldImport = `import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'`;
const newImport = `import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'`;

content = content.replace(oldImport, newImport);

// 2. Find the descriptive stats table and add CI visualization after it
// Looking for the ci95 column in the StatisticsTable and adding a visual CI section after
const oldDescriptiveSection = `                        ci95: \`[\${stat.ci95Lower.toFixed(2)}, \${stat.ci95Upper.toFixed(2)}]\`
                      }))}
                      bordered
                      compactMode
                    />
                  </CardContent>
                </Card>
              </ContentTabsContent>`;

const newDescriptiveSection = `                        ci95: \`[\${stat.ci95Lower.toFixed(2)}, \${stat.ci95Upper.toFixed(2)}]\`
                      }))}
                      bordered
                      compactMode
                    />

                    {/* 95% 신뢰구간 시각화 */}
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">집단별 평균의 95% 신뢰구간</h4>
                      <div className="space-y-4">
                        {analysisResult.descriptiveStats.slice(0, 6).map((stat, index) => (
                          <div key={index} className="space-y-1">
                            <p className="text-sm font-medium">{stat.group} - {stat.variable}</p>
                            <ConfidenceIntervalDisplay
                              lower={stat.ci95Lower}
                              upper={stat.ci95Upper}
                              estimate={stat.mean}
                              level={0.95}
                              showVisualization={true}
                            />
                          </div>
                        ))}
                        {analysisResult.descriptiveStats.length > 6 && (
                          <p className="text-sm text-muted-foreground">
                            ... 외 {analysisResult.descriptiveStats.length - 6}개 추가 신뢰구간
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ContentTabsContent>`;

content = content.replace(oldDescriptiveSection, newDescriptiveSection);

writeFileSync(filePath, content, 'utf8');
console.log('manova: ConfidenceIntervalDisplay added successfully!');
