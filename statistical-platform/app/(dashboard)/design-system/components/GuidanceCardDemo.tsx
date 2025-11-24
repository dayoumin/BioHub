'use client'

import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export function GuidanceCardDemo() {
  return (
    <div className="space-y-4 mt-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            GuidanceCard
            <Badge variant="default" className="text-xs">v3 VERCEL</Badge>
          </CardTitle>
          <CardDescription>
            단계별 안내 카드 - Smart Flow에서 사용 (Step 2, Step 3)
            <br />
            <span className="text-xs font-medium text-success">✅ v3: Vercel 스타일 - 최소주의 + 그라데이션 (2025-11-24)</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* v1 vs v2 vs v3 비교 */}
          <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <span>📐 버전 비교</span>
              <Badge variant="secondary" className="text-xs">v1 → v2 → v3 진화</Badge>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* v1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">v1</Badge>
                  <span className="text-xs text-muted-foreground">~280px</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>❌ 수직 레이아웃</li>
                  <li>❌ 아이콘 64px</li>
                  <li>❌ 단계 박스 분리</li>
                  <li>❌ 과도한 여백</li>
                </ul>
              </div>
              {/* v2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">v2</Badge>
                  <span className="text-xs text-muted-foreground">~80px</span>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>🔸 수평 레이아웃</li>
                  <li>🔸 아이콘 32px</li>
                  <li>🔸 인라인 배지 3개</li>
                  <li>❌ 회색 톤 밋밋함</li>
                </ul>
              </div>
              {/* v3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">v3</Badge>
                  <span className="text-xs text-muted-foreground">~60px</span>
                </div>
                <ul className="text-xs text-success space-y-1 ml-4">
                  <li>✅ 그라데이션 배경</li>
                  <li>✅ 아이콘 24px</li>
                  <li>✅ 배지 완전 제거</li>
                  <li>✅ 최소주의 디자인</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 기본 예제 (v3) */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              기본 예제 (v3 - Vercel 스타일)
              <Badge variant="outline" className="text-xs">최소주의</Badge>
            </h4>
            <GuidanceCard
              title="데이터 준비 완료!"
              description="총 1,234개 데이터, 5개 변수가 분석 준비되었습니다."
              ctaText="분석 시작"
              ctaIcon={<Sparkles className="w-4 h-4" />}
              onCtaClick={() => toast.success('분석을 시작합니다')}
              data-testid="guidance-demo-basic"
            />
          </div>

          {/* 경고 메시지 포함 예제 */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">경고 메시지 포함</h4>
            <GuidanceCard
              title="데이터 검증 완료"
              description="일부 경고가 있지만 분석을 계속할 수 있습니다."
              ctaText="계속하기"
              ctaIcon={<ArrowRight className="w-4 h-4" />}
              onCtaClick={() => toast.info('경고를 무시하고 계속합니다')}
              warningMessage="3개 컬럼에서 결측치가 발견되었습니다"
              data-testid="guidance-demo-warning"
            />
          </div>

          {/* 비활성화 예제 */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">CTA 버튼 비활성화</h4>
            <GuidanceCard
              title="분석 방법 결정됨"
              description="독립표본 t-검정 방법으로 분석합니다."
              ctaText="변수 선택 중..."
              ctaIcon={<ArrowRight className="w-4 h-4" />}
              onCtaClick={() => {}}
              ctaDisabled={true}
              data-testid="guidance-demo-disabled"
            />
          </div>

          {/* Props 테이블 (v3) */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-800">
            <h4 className="font-medium text-sm flex items-center gap-2">
              Props (v3)
              <Badge variant="outline" className="text-xs">steps 제거됨</Badge>
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <code>title</code>: string - 카드 제목 (필수)</li>
              <li>• <code>description</code>: string | ReactNode - 부제목/설명 (선택)</li>
              <li className="line-through opacity-50">• <code>steps</code>: Array - 다음 단계 리스트 (v3부터 제거됨)</li>
              <li>• <code>ctaText</code>: string - CTA 버튼 텍스트 (필수)</li>
              <li>• <code>ctaIcon</code>: ReactNode - CTA 버튼 아이콘 (선택)</li>
              <li>• <code>onCtaClick</code>: () =&gt; void - CTA 클릭 핸들러 (필수)</li>
              <li>• <code>ctaDisabled</code>: boolean - CTA 비활성화 여부 (선택, 기본: false)</li>
              <li>• <code>warningMessage</code>: string - 경고 메시지 (선택)</li>
              <li>• <code>animationDelay</code>: number - 애니메이션 딜레이 ms (선택, 기본: 700)</li>
              <li>• <code>data-testid</code>: string - 테스트 ID (선택)</li>
            </ul>
          </div>

          {/* 사용 예제 (v3) */}
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto border border-blue-200 dark:border-blue-800">
              <code>{`// v3: 단계 배지 제거, 최소주의 디자인
<GuidanceCard
  title="데이터 준비 완료!"
  description="총 1,234개 데이터, 5개 변수가 분석 준비되었습니다."
  ctaText="분석 시작"
  ctaIcon={<Sparkles className="w-4 h-4" />}
  onCtaClick={handleNext}
  ctaDisabled={isNavigating}
/>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
