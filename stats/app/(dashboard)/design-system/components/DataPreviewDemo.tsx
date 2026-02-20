'use client'

import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { SAMPLE_DATA } from '../constants'

export function DataPreviewDemo() {
  return (
    <div className="space-y-4 mt-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>DataPreviewTable</CardTitle>
          <CardDescription>데이터 미리보기 테이블 - 토글 방식으로 대용량 데이터 표시</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 라이브 데모 */}
          <DataPreviewTable
            data={SAMPLE_DATA}
            maxRows={50}
            defaultOpen={true}
            title="샘플 데이터"
            height="300px"
          />

          {/* Props 테이블 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Props:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <code>data</code>: DataRow[] - 표시할 데이터</li>
              <li>• <code>maxRows</code>: number - 최대 표시 행 (기본: 100)</li>
              <li>• <code>defaultOpen</code>: boolean - 초기 열림 상태 (기본: false)</li>
              <li>• <code>title</code>: string - 제목 (기본: "데이터 미리보기")</li>
              <li>• <code>height</code>: string - 테이블 높이 (기본: "400px")</li>
            </ul>
          </div>

          {/* 사용 예제 */}
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`<DataPreviewTable
  data={uploadedData}
  maxRows={100}
  defaultOpen={false}
  title="업로드된 데이터"
  height="400px"
/>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
