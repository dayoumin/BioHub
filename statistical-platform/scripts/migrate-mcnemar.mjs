import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/statistics/mcnemar/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'`;
const newImport = `import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import type { InterpretationResult } from '@/lib/interpretation/engine'`;

content = content.replace(oldImport, newImport);

// 2. Replace the effect size display (오즈비) with EffectSizeCard
const oldEffectSizeSection = `                {effectSize && isFinite(effectSize) && (
                  <div className="flex justify-between">
                    <span>오즈비</span>
                    <Badge variant={effectSize > 2 ? "default" : effectSize > 1.5 ? "secondary" : "outline"}>
                      {effectSize.toFixed(3)}
                    </Badge>
                  </div>
                )}`;

const newEffectSizeSection = `                {effectSize && isFinite(effectSize) && (
                  <div className="flex justify-between">
                    <span>오즈비 (Odds Ratio)</span>
                    <Badge variant={effectSize > 2 ? "default" : effectSize > 1.5 ? "secondary" : "outline"}>
                      {effectSize.toFixed(3)}
                    </Badge>
                  </div>
                )}`;

content = content.replace(oldEffectSizeSection, newEffectSizeSection);

// 3. Replace the interpretation guide section with ResultInterpretation component
const oldInterpretationGuide = `        {/* 해석 가이드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결과 해석 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>McNemar 검정 해석</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2 text-sm">
                  <p><strong>귀무가설(H₀):</strong> 두 처리의 효과가 동일하다 (marginal probability가 같다)</p>
                  <p><strong>대립가설(H₁):</strong> 두 처리의 효과가 다르다</p>
                  <p><strong>판단기준:</strong> p-value &lt; 0.05이면 귀무가설 기각</p>
                </div>
              </AlertDescription>
            </Alert>

            {effectSize && isFinite(effectSize) && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">오즈비 해석</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>1에 가까움</strong>: 처리 효과 차이 없음</p>
                  <p>• <strong>1보다 큼</strong>: 첫 번째 처리가 더 효과적</p>
                  <p>• <strong>1보다 작음</strong>: 두 번째 처리가 더 효과적</p>
                  <p className="mt-2 font-medium">현재 오즈비: {effectSize.toFixed(3)}</p>
                </div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">주의사항</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 불일치 쌍이 5개 미만일 때는 정확검정 사용 권장</li>
                <li>• 대응성이 중요: 동일한 개체의 전후 비교여야 함</li>
                <li>• 일치하는 쌍은 검정에 기여하지 않음</li>
                <li>• 표본 크기가 작을 때 연속성 수정 자동 적용</li>
              </ul>
            </div>
          </CardContent>
        </Card>`;

const newInterpretationGuide = `        {/* 효과크기 카드 */}
        {effectSize && isFinite(effectSize) && (
          <EffectSizeCard
            title="효과크기 (Odds Ratio)"
            value={effectSize}
            type="odds_ratio"
            showInterpretation={true}
            showVisualScale={true}
          />
        )}

        {/* 결과 해석 */}
        <ResultInterpretation
          result={{
            title: 'McNemar 검정 결과 해석',
            summary: significant
              ? \`두 처리 간에 통계적으로 유의한 차이가 있습니다 (χ² = \${mcnemarStatistic.toFixed(3)}, p = \${pValue < 0.001 ? '< 0.001' : pValue.toFixed(3)}). 불일치 쌍 수 = \${discordantPairs}개로, \${contingencyTable.first_positive_second_negative > contingencyTable.first_negative_second_positive ? '첫 번째 처리에서 양성 → 음성 전환이 더 많았습니다' : '두 번째 처리에서 양성 → 음성 전환이 더 많았습니다'}.\`
              : \`두 처리 간에 통계적으로 유의한 차이가 없습니다 (χ² = \${mcnemarStatistic.toFixed(3)}, p = \${pValue.toFixed(3)}). 불일치 쌍 수 = \${discordantPairs}개로, 두 처리의 효과가 유사합니다.\`,
            statistical: \`McNemar χ² = \${mcnemarStatistic.toFixed(4)}, df = 1, p = \${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, n = \${sampleSize}, 불일치 쌍 = \${discordantPairs}\${effectSize && isFinite(effectSize) ? \`, Odds Ratio = \${effectSize.toFixed(3)}\` : ''}\${continuityCorrection ? ' (연속성 수정 적용)' : ''}\`,
            practical: effectSize && isFinite(effectSize)
              ? effectSize > 2 || effectSize < 0.5
                ? \`Odds Ratio = \${effectSize.toFixed(3)}로 큰 효과를 보입니다. \${effectSize > 1 ? '첫 번째 처리가 양성 반응을 유도하는 경향이 더 강합니다.' : '두 번째 처리가 양성 반응을 유도하는 경향이 더 강합니다.'}\`
                : effectSize > 1.5 || effectSize < 0.67
                  ? \`Odds Ratio = \${effectSize.toFixed(3)}로 중간 정도의 효과를 보입니다.\`
                  : \`Odds Ratio = \${effectSize.toFixed(3)}로 효과가 작거나 차이가 없습니다.\`
              : '효과크기를 계산할 수 없습니다 (불일치 쌍 부족).'
          } satisfies InterpretationResult}
        />

        {/* 주의사항 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">주의사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 불일치 쌍이 5개 미만일 때는 정확검정 사용 권장</li>
                <li>• 대응성이 중요: 동일한 개체의 전후 비교여야 함</li>
                <li>• 일치하는 쌍은 검정에 기여하지 않음</li>
                <li>• 표본 크기가 작을 때 연속성 수정 자동 적용</li>
              </ul>
            </div>
          </CardContent>
        </Card>`;

content = content.replace(oldInterpretationGuide, newInterpretationGuide);

writeFileSync(filePath, content, 'utf8');
console.log('mcnemar page migration completed successfully!');
