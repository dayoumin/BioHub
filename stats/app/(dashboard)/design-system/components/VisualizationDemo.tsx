'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Histogram } from '@/components/charts/histogram'
import { BoxPlot } from '@/components/charts/boxplot'
import { Scatterplot } from '@/components/charts/scatterplot'
import { CorrelationHeatmap } from '@/components/analysis/steps/validation/charts/CorrelationHeatmap'

// 샘플 데이터
const sampleHistogramData = [
  23, 25, 27, 30, 32, 35, 38, 40, 42, 45,
  48, 50, 52, 55, 58, 60, 62, 65, 68, 70
]

// BoxPlot 샘플 데이터 (다중 그룹 비교)
const sampleBoxPlotData = [
  {
    name: '그룹 A',
    min: 10,
    q1: 20,
    median: 30,
    q3: 40,
    max: 50,
    mean: 31,
    std: 12,
    outliers: [5, 55, 60]
  },
  {
    name: '그룹 B',
    min: 15,
    q1: 25,
    median: 35,
    q3: 45,
    max: 55,
    mean: 36,
    std: 10,
    outliers: [8, 62]
  },
  {
    name: '그룹 C',
    min: 12,
    q1: 22,
    median: 32,
    q3: 42,
    max: 52,
    mean: 33,
    std: 11,
    outliers: [6, 58]
  }
]

const sampleScatterData = Array.from({ length: 30 }, (_, i) => ({
  x: i + 1,
  y: 10 + i * 2 + Math.random() * 10 - 5
}))

// CorrelationHeatmap 샘플 데이터
const sampleCorrelationMatrix = [
  [1.00,  0.85, -0.32,  0.12],
  [0.85,  1.00, -0.45,  0.08],
  [-0.32, -0.45, 1.00,  0.67],
  [0.12,  0.08,  0.67,  1.00]
]
const sampleCorrelationLabels = ['체중', '체장', '수온', '염분']

export function VisualizationDemo() {
  return (
    <div className="space-y-8">
      {/* Histogram */}
      <Card>
        <CardHeader>
          <CardTitle>Histogram (히스토그램)</CardTitle>
          <CardDescription>
            데이터 분포를 막대 그래프로 표시합니다 (Recharts 기반)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Histogram
            data={sampleHistogramData}
            title="연령 분포"
            xAxisLabel="나이"
            yAxisLabel="빈도"
            bins={8}
            color="#8884d8"
          />

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">사용 예제:</p>
            <pre className="overflow-x-auto">
{`<Histogram
  data={[23, 25, 27, ...]}
  title="연령 분포"
  xAxisLabel="나이"
  yAxisLabel="빈도"
  bins={8}
  color="#8884d8"
/>`}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Props:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>data: number[]</code> - 숫자 배열 데이터</li>
              <li><code>title?: string</code> - 차트 제목 (기본값: "분포 히스토그램")</li>
              <li><code>xAxisLabel?: string</code> - X축 레이블 (기본값: "값")</li>
              <li><code>yAxisLabel?: string</code> - Y축 레이블 (기본값: "빈도")</li>
              <li><code>bins?: number</code> - 막대 개수 (기본값: 10)</li>
              <li><code>color?: string</code> - 막대 색상 (기본값: "#8884d8")</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* BoxPlot (Recharts 기반) */}
      <Card>
        <CardHeader>
          <CardTitle>BoxPlot (박스 플롯)</CardTitle>
          <CardDescription>
            여러 그룹의 데이터 분포를 비교합니다 (Recharts 기반, 인터랙티브)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BoxPlot
            data={sampleBoxPlotData}
            title="그룹별 데이터 분포 비교"
            unit="점"
            showMean={true}
            showOutliers={true}
            showStatistics={true}
            interactive={true}
          />

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">사용 예제:</p>
            <pre className="overflow-x-auto">
{`<BoxPlot
  data={[
    { name: '그룹 A', min: 10, q1: 20, median: 30, q3: 40, max: 50, mean: 31, outliers: [5, 55] }
  ]}
  title="그룹별 데이터 분포"
  unit="점"
  showMean={true}
  showOutliers={true}
/>`}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Props:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>data: BoxPlotData[]</code> - 박스 플롯 데이터 배열</li>
              <li><code>title?: string</code> - 차트 제목</li>
              <li><code>unit?: string</code> - 단위 표시</li>
              <li><code>showMean?: boolean</code> - 평균 표시 (기본값: true)</li>
              <li><code>showOutliers?: boolean</code> - 이상치 표시 (기본값: true)</li>
              <li><code>showStatistics?: boolean</code> - 상세 통계 표시 (기본값: true)</li>
              <li><code>interactive?: boolean</code> - 인터랙티브 모드 (기본값: true)</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">BoxPlotData 인터페이스:</p>
            <pre className="bg-background p-2 rounded border overflow-x-auto">
{`interface BoxPlotData {
  name: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers?: number[]
  mean?: number
  std?: number
  color?: string
}`}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground bg-info-bg border border-info-border p-3 rounded-lg">
            <p className="font-medium mb-1">인터랙티브 기능:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>박스 클릭 시 상세 통계 표시 (min, Q1, median, Q3, max, mean, IQR)</li>
              <li>호버 시 강조 효과</li>
              <li>차트/테이블 뷰 전환</li>
              <li>CSV 다운로드</li>
              <li>전체 화면 모드</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950/20 border border-purple-200 p-3 rounded-lg">
            <p className="font-medium mb-1">통계 해석:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>박스</strong>: IQR (Q3 - Q1), 데이터의 50%가 포함</li>
              <li><strong>중앙선</strong>: 중앙값 (median)</li>
              <li><strong>수염</strong>: 1.5 × IQR 룰</li>
              <li><strong>흰색 점</strong>: 평균 (mean)</li>
              <li><strong>빈 원</strong>: 이상치 (outliers)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Scatterplot */}
      <Card>
        <CardHeader>
          <CardTitle>Scatterplot (산점도)</CardTitle>
          <CardDescription>
            두 변수 간 상관관계 + 추세선을 표시합니다 (Recharts 기반)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Scatterplot
            data={sampleScatterData}
            title="키와 몸무게의 관계"
            xAxisLabel="키 (cm)"
            yAxisLabel="몸무게 (kg)"
            showTrendLine={true}
            correlationCoefficient={0.85}
            pValue={0.001}
            color="#82ca9d"
          />

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">사용 예제:</p>
            <pre className="overflow-x-auto">
{`<Scatterplot
  data={[{ x: 1, y: 10 }, { x: 2, y: 12 }, ...]}
  title="키와 몸무게의 관계"
  xAxisLabel="키 (cm)"
  yAxisLabel="몸무게 (kg)"
  showTrendLine={true}
  correlationCoefficient={0.85}
  pValue={0.001}
  color="#82ca9d"
/>`}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Props:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>data: {'Array<{ x: number; y: number }>'}</code> - 좌표 배열</li>
              <li><code>title?: string</code> - 차트 제목</li>
              <li><code>xAxisLabel?: string</code> - X축 레이블</li>
              <li><code>yAxisLabel?: string</code> - Y축 레이블</li>
              <li><code>showTrendLine?: boolean</code> - 추세선 표시 (기본값: false)</li>
              <li><code>color?: string</code> - 점 색상</li>
              <li><code>correlationCoefficient?: number</code> - 상관계수 (r)</li>
              <li><code>pValue?: number</code> - p-value</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* CorrelationHeatmap */}
      <Card>
        <CardHeader>
          <CardTitle>CorrelationHeatmap (상관계수 히트맵)</CardTitle>
          <CardDescription>
            변수 간 상관관계를 색상 행렬로 표시합니다 (Plotly 기반)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CorrelationHeatmap
            matrix={sampleCorrelationMatrix}
            labels={sampleCorrelationLabels}
            height={350}
          />

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">사용 예제:</p>
            <pre className="overflow-x-auto">
{`<CorrelationHeatmap
  matrix={[
    [1.00, 0.85, -0.32],
    [0.85, 1.00, -0.45],
    [-0.32, -0.45, 1.00]
  ]}
  labels={['체중', '체장', '수온']}
  height={350}
/>`}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Props:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>matrix: number[][]</code> - 상관계수 행렬 (대칭)</li>
              <li><code>labels: string[]</code> - 변수명 배열</li>
              <li><code>height?: number</code> - 차트 높이 (기본값: 400)</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950/20 border border-purple-200 p-3 rounded-lg">
            <p className="font-medium mb-1">색상 스케일:</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded bg-blue-500"></span>
                <span>-1 (음의 상관)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded bg-gray-200"></span>
                <span>0 (무상관)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded bg-red-500"></span>
                <span>+1 (양의 상관)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용 시나리오 */}
      <Card className="border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20">
        <CardHeader>
          <CardTitle>사용 시나리오</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">📊 Histogram</p>
            <p className="text-muted-foreground">
              • 데이터 분포 확인 (정규성, 왜도, 첨도)<br />
              • 변수 선택 전 데이터 탐색 (Step 2)<br />
              • 통계 분석 결과 시각화
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">📦 BoxPlot</p>
            <p className="text-muted-foreground">
              • 여러 그룹 간 분포 비교 (ANOVA, t-test)<br />
              • 사분위수, 중앙값, 평균 확인<br />
              • 이상치 감지 및 분석<br />
              • 인터랙티브 탐색 (클릭, 호버, 테이블 뷰)
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">📈 Scatterplot</p>
            <p className="text-muted-foreground">
              • 두 변수 간 상관관계 확인<br />
              • 선형 회귀 추세선 표시<br />
              • 상관계수, p-value 표시
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">🔥 CorrelationHeatmap</p>
            <p className="text-muted-foreground">
              • 다변량 상관관계 한눈에 파악<br />
              • 변수 선택/제외 결정에 활용<br />
              • 다중공선성 진단
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
