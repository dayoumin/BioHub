import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/pca/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace the interpretation guide section with ResultInterpretation
const oldInterpretationSection = `          {/* 해석 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">결과 해석 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>주성분 해석</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>고유값 &gt; 1:</strong> 해당 성분은 원래 변수보다 많은 분산을 설명</p>
                    <p><strong>적재량 &gt; |0.5|:</strong> 해당 변수가 성분에 강하게 기여</p>
                    <p><strong>누적 분산 &gt; 70%:</strong> 데이터의 주요 패턴을 충분히 설명</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">활용 방안</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 선택된 주성분으로 차원 축소된 데이터 사용</li>
                  <li>• 높은 적재량을 가진 변수들로 성분의 의미 해석</li>
                  <li>• Scree plot에서 급격한 감소 지점으로 성분 수 결정</li>
                  <li>• 주성분 점수를 새로운 변수로 활용</li>
                </ul>
              </div>
            </CardContent>
          </Card>`;

const newInterpretationSection = `          {/* 결과 해석 */}
          <ResultInterpretation
            result={{
              title: '주성분분석 결과 해석',
              summary: interpretation,
              statistical: \`PCA: \${components.length}개 주성분 추출, Kaiser 기준 \${selectedComponents}개 선택, KMO = \${qualityMetrics.kmo?.toFixed(3) ?? 'N/A'}, Bartlett p = \${qualityMetrics.bartlett.pValue?.toFixed(4) ?? 'N/A'}, 총 분산 설명률 = \${(components.slice(0, selectedComponents).reduce((sum, comp) => sum + comp.varianceExplained, 0) * 100).toFixed(1)}%\`,
              practical: qualityMetrics.kmo !== null && qualityMetrics.kmo > 0.6 && qualityMetrics.bartlett.significant
                ? \`KMO = \${qualityMetrics.kmo.toFixed(3)}으로 \${qualityMetrics.kmo > 0.8 ? '우수한' : '적절한'} 표본 적합도를 보이며, Bartlett 검정이 유의하여 PCA가 적합합니다. \${selectedComponents}개의 주성분이 전체 분산의 \${(components.slice(0, selectedComponents).reduce((sum, comp) => sum + comp.varianceExplained, 0) * 100).toFixed(1)}%를 설명합니다. 각 주성분의 적재량을 통해 변수 기여도를 확인하세요.\`
                : \`KMO 또는 Bartlett 검정 결과, PCA 적용에 주의가 필요합니다. 변수 간 상관관계를 재검토하거나 추가 변수를 고려하세요.\`
            } satisfies InterpretationResult}
          />

          {/* 해석 기준 안내 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">주성분 해석 기준</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium text-sm mb-1">고유값 기준</p>
                  <p className="text-xs text-muted-foreground">고유값 &gt; 1인 성분은 원래 변수보다 많은 분산을 설명</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium text-sm mb-1">적재량 기준</p>
                  <p className="text-xs text-muted-foreground">|적재량| &gt; 0.5인 변수가 해당 성분에 강하게 기여</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium text-sm mb-1">분산 기준</p>
                  <p className="text-xs text-muted-foreground">누적 분산 &gt; 70%면 주요 패턴을 충분히 설명</p>
                </div>
              </div>
            </CardContent>
          </Card>`;

content = content.replace(oldInterpretationSection, newInterpretationSection);

writeFileSync(filePath, content, 'utf8');
console.log('pca page migration completed successfully!');
