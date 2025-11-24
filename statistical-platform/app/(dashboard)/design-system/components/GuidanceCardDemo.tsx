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
          <CardTitle>GuidanceCard</CardTitle>
          <CardDescription>
            Smart Flow 단계 안내 카드 - Step 2 (데이터 검증), Step 3 (분석 목적 선택)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 디자인 특징 */}
          <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-sm">🎨 디자인 특징</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ul className="text-xs space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  <span>그라데이션 배경 (blue → purple)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  <span>최소주의 레이아웃</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  <span>부드러운 음영 + hover 효과</span>
                </li>
              </ul>
              <ul className="text-xs space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  <span>반응형 (모바일/데스크탑)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  <span>다크 모드 완벽 지원</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  <span>접근성 (prefers-reduced-motion)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 기본 예제 */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">기본 예제</h4>
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

          {/* Props */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Props</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <code>title</code>: string - 카드 제목 (필수)</li>
              <li>• <code>description</code>: string | ReactNode - 부제목/설명 (선택)</li>
              <li>• <code>ctaText</code>: string - CTA 버튼 텍스트 (필수)</li>
              <li>• <code>ctaIcon</code>: ReactNode - CTA 버튼 아이콘 (선택)</li>
              <li>• <code>onCtaClick</code>: () =&gt; void - CTA 클릭 핸들러 (필수)</li>
              <li>• <code>ctaDisabled</code>: boolean - CTA 비활성화 여부 (선택, 기본: false)</li>
              <li>• <code>warningMessage</code>: string - 경고 메시지 (선택)</li>
              <li>• <code>animationDelay</code>: number - 애니메이션 딜레이 ms (선택, 기본: 700)</li>
              <li>• <code>data-testid</code>: string - 테스트 ID (선택)</li>
              <li className="text-muted-foreground/50">• <code>steps</code>: Array - 현재 사용하지 않음 (하위 호환성 유지)</li>
            </ul>
          </div>

          {/* 사용 예제 */}
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto border border-blue-200 dark:border-blue-800">
              <code>{`<GuidanceCard
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
