'use client'

import { VariableSelectorToggle } from '@/components/common/VariableSelectorToggle'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { SAMPLE_DATA } from '../constants'

export function VariableSelectorDemo() {
  return (
    <div className="space-y-4 mt-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            VariableSelectorToggle
            <Badge variant="default" className="text-xs">NEW</Badge>
          </CardTitle>
          <CardDescription>토글 방식 변수 선택 - 클릭 한 번으로 즉시 선택/해제</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 라이브 데모 */}
          <VariableSelectorToggle
            data={SAMPLE_DATA}
            onComplete={(selection) => {
              toast.success(`선택 완료: 종속=${selection.dependent}, 독립=${selection.independent}`)
            }}
            onBack={() => toast.info('이전 화면으로 돌아갑니다')}
            title="변수 선택 데모"
            description="클릭 한 번으로 즉시 선택/해제됩니다"
          />

          {/* Props 테이블 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Props:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <code>data</code>: DataRow[] - 데이터 (필수)</li>
              <li>• <code>onComplete</code>: (selection) =&gt; void - 완료 핸들러 (필수)</li>
              <li>• <code>onBack</code>: () =&gt; void - 뒤로가기 핸들러 (필수)</li>
              <li>• <code>title</code>: string - 제목 (선택)</li>
              <li>• <code>description</code>: string - 설명 (선택)</li>
            </ul>
          </div>

          {/* 디자인 특징 */}
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">✨ 디자인 특징:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• ✅ 즉시 피드백 (클릭 시 바로 선택/해제)</li>
              <li>• ✅ 시각적 하이라이트 (선택된 변수 강조)</li>
              <li>• ✅ 좌우 영역 구분 (종속/독립 명확히)</li>
              <li>• ✅ 선택 요약 표시 (하단에 현재 선택 상태)</li>
              <li>• ✅ 체크 마크 애니메이션 (선택 시각화)</li>
            </ul>
          </div>

          {/* 사용 예제 */}
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`<VariableSelectorToggle
  data={uploadedData}
  onComplete={(selection) => {
    console.log('종속:', selection.dependent)
    console.log('독립:', selection.independent)
    startAnalysis(selection)
  }}
  onBack={goToPreviousStep}
  title="분석 변수 선택"
  description="클릭 한 번으로 즉시 선택/해제됩니다"
/>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
