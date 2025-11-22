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
            <Badge variant="default" className="text-xs">NEW</Badge>
          </CardTitle>
          <CardDescription>단계별 안내 카드 - Smart Flow에서 사용 (Step 2, Step 3)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 기본 예제 */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">기본 예제 (Step 2 스타일)</h4>
            <GuidanceCard
              title="데이터 준비 완료!"
              description={
                <>
                  총 <strong>1,234개</strong> 데이터, <strong>5개</strong> 변수가 분석 준비되었습니다.
                </>
              }
              steps={[
                { emoji: '1️⃣', text: '분석 목적 선택 (그룹 비교, 관계 분석 등)' },
                { emoji: '2️⃣', text: 'AI가 데이터를 분석하여 최적의 통계 방법 추천' },
                { emoji: '3️⃣', text: '변수 선택 후 자동 분석 실행' }
              ]}
              ctaText="분석 목적 선택하기"
              ctaIcon={<Sparkles className="w-4 h-4" />}
              onCtaClick={() => toast.success('분석 목적 선택 화면으로 이동합니다')}
              data-testid="guidance-demo-basic"
            />
          </div>

          {/* 경고 메시지 포함 예제 */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">경고 메시지 포함</h4>
            <GuidanceCard
              title="데이터 준비 완료!"
              description="경고가 있지만 분석을 계속할 수 있습니다."
              steps={[
                { emoji: '1️⃣', text: '분석 목적 선택' },
                { emoji: '2️⃣', text: 'AI 추천 받기' },
                { emoji: '3️⃣', text: '변수 선택 후 실행' }
              ]}
              ctaText="계속하기"
              ctaIcon={<ArrowRight className="w-4 h-4" />}
              onCtaClick={() => toast.info('경고를 무시하고 계속합니다')}
              warningMessage="경고 사항이 있지만 분석을 계속할 수 있습니다"
              data-testid="guidance-demo-warning"
            />
          </div>

          {/* 비활성화 예제 */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">CTA 버튼 비활성화 (중복 클릭 방지)</h4>
            <GuidanceCard
              title="분석 방법이 결정되었습니다!"
              description={
                <>
                  <strong>독립표본 t-검정</strong> 방법으로 분석합니다.
                </>
              }
              steps={[
                { emoji: '1️⃣', text: '분석에 사용할 변수 선택' },
                { emoji: '2️⃣', text: '자동 분석 실행 + 가정 검정' },
                { emoji: '3️⃣', text: '결과 확인 및 해석' }
              ]}
              ctaText="변수 선택하기"
              ctaIcon={<ArrowRight className="w-4 h-4" />}
              onCtaClick={() => {}}
              ctaDisabled={true}
              animationDelay={700}
              data-testid="guidance-demo-disabled"
            />
          </div>

          {/* Props 테이블 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Props:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <code>title</code>: string - 카드 제목 (필수)</li>
              <li>• <code>description</code>: string | ReactNode - 부제목/설명 (선택)</li>
              <li>• <code>steps</code>: {`Array<{emoji: string, text: string}>`} - 다음 단계 리스트 (필수)</li>
              <li>• <code>ctaText</code>: string - CTA 버튼 텍스트 (필수)</li>
              <li>• <code>ctaIcon</code>: ReactNode - CTA 버튼 아이콘 (선택)</li>
              <li>• <code>onCtaClick</code>: () =&gt; void - CTA 클릭 핸들러 (필수)</li>
              <li>• <code>ctaDisabled</code>: boolean - CTA 비활성화 여부 (선택, 기본: false)</li>
              <li>• <code>warningMessage</code>: string - 경고 메시지 (선택)</li>
              <li>• <code>animationDelay</code>: number - 애니메이션 딜레이 ms (선택, 기본: 700)</li>
              <li>• <code>data-testid</code>: string - 테스트 ID (선택)</li>
            </ul>
          </div>

          {/* 사용 예제 */}
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`<GuidanceCard
  title="데이터 준비 완료!"
  description="총 1,234개 데이터가 준비되었습니다."
  steps={[
    { emoji: '1️⃣', text: '분석 목적 선택' },
    { emoji: '2️⃣', text: 'AI 추천 받기' },
    { emoji: '3️⃣', text: '변수 선택 후 실행' }
  ]}
  ctaText="분석 목적 선택하기"
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
