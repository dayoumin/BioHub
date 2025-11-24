import { readFileSync, writeFileSync } from 'fs';

console.log('=== Step 2에 데이터 시각화 카드 추가 ===\n');

const filePath = 'statistical-platform/components/smart-flow/steps/DataValidationStep.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Import 추가
const importSection = `import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'`;

const newImportSection = `import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'
import { Histogram } from '@/components/charts/histogram'
import { SimpleBoxPlot } from '@/components/charts/simple-boxplot'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'`;

content = content.replace(importSection, newImportSection);

console.log('✅ Import 추가 완료 (Histogram, SimpleBoxPlot, Tabs)');

// 2. 시각화 카드 추가 (가정 검증 카드 바로 위에)
const visualizationCard = `
      {/* 데이터 시각화 카드 */}
      {!hasErrors && hasColumnStats(validationResults) && (
        <Card className="border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20">
          <CardHeader>
            <CardTitle className="text-base">📊 데이터 분포 시각화</CardTitle>
            <p className="text-sm text-muted-foreground">
              변수를 선택하기 전에 데이터 분포를 확인하세요
            </p>
          </CardHeader>
          <CardContent>
            {validationResults.columnStats && validationResults.columnStats.filter(col => col.type === 'numeric').length > 0 ? (
              <Tabs defaultValue={validationResults.columnStats.filter(col => col.type === 'numeric')[0]?.name} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {validationResults.columnStats
                    .filter(col => col.type === 'numeric')
                    .slice(0, 3)
                    .map(col => (
                      <TabsTrigger key={col.name} value={col.name}>
                        {col.name}
                      </TabsTrigger>
                    ))}
                </TabsList>

                {validationResults.columnStats
                  .filter(col => col.type === 'numeric')
                  .slice(0, 3)
                  .map(col => {
                    const colData = data
                      .map(row => row[col.name])
                      .filter(v => v !== null && v !== undefined && v !== '')
                      .map(Number)
                      .filter(v => !isNaN(v))

                    return (
                      <TabsContent key={col.name} value={col.name} className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Histogram */}
                          <div>
                            <Histogram
                              data={colData}
                              title={\`\${col.name} 분포\`}
                              xAxisLabel={col.name}
                              yAxisLabel="빈도"
                              bins={10}
                            />
                          </div>

                          {/* Box Plot */}
                          <div>
                            <SimpleBoxPlot
                              data={colData}
                              title={\`\${col.name} 박스 플롯\`}
                              variable={col.name}
                            />
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground bg-background p-3 rounded-lg border">
                          <p className="font-medium mb-1">해석 가이드:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>히스토그램</strong>: 데이터의 분포 형태 (정규분포, 왜도, 첨도)</li>
                            <li><strong>박스 플롯</strong>: 중앙값, 사분위수, 이상치 확인</li>
                          </ul>
                        </div>
                      </TabsContent>
                    )
                  })}
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">수치형 변수가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 가정 검증 결과 카드 */}`;

const targetComment = '      {/* 가정 검증 결과 카드 */}';
content = content.replace(targetComment, visualizationCard);

console.log('✅ 시각화 카드 추가 완료 (가정 검증 카드 위)');

// 3. 파일 저장
writeFileSync(filePath, content, 'utf8');

console.log('\n📋 추가된 기능:');
console.log('   - Tabs 컴포넌트로 변수별 시각화 전환');
console.log('   - Histogram + BoxPlot 나란히 배치 (lg:grid-cols-2)');
console.log('   - 최대 3개 수치형 변수 시각화 (성능)');
console.log('   - 해석 가이드 추가 (사용자 친화적)');
console.log('   - Cyan 테마 (시각화 전용 색상)');
