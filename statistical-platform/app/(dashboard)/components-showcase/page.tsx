'use client'

/**
 * 공통 컴포넌트 쇼케이스 페이지
 *
 * 목적:
 * 1. 모든 공통 컴포넌트를 한 페이지에서 시각적으로 확인
 * 2. 다양한 Props 조합을 실시간으로 테스트
 * 3. Storybook 대체 (빌드 없이 바로 확인)
 * 4. 개발 중 컴포넌트 동작 검증
 *
 * 사용법:
 * npm run dev
 * → http://localhost:3000/components-showcase
 */

import { useState } from 'react'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import { DataProfileSummary } from '@/components/common/analysis/DataProfileSummary'
import { VariableSelectorSimple } from '@/components/common/VariableSelectorSimple'
import { GitCompare, TrendingUp, PieChart, LineChart, Clock, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ComponentsShowcasePage() {
  // PurposeCard 상태
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null)

  // AIAnalysisProgress 상태
  const [progress, setProgress] = useState(0)
  const [isProgressing, setIsProgressing] = useState(false)

  // AIAnalysisProgress 시뮬레이션
  const startProgress = () => {
    setIsProgressing(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsProgressing(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const resetProgress = () => {
    setProgress(0)
    setIsProgressing(false)
  }

  // VariableSelectorSimple 샘플 데이터
  const sampleData = [
    { group: 'A', value: 12.5, age: 25, score: 85, time: 120 },
    { group: 'B', value: 10.3, age: 22, score: 78, time: 105 },
    { group: 'A', value: 13.2, age: 28, score: 92, time: 135 },
    { group: 'B', value: 9.7, age: 20, score: 73, time: 98 },
    { group: 'A', value: 11.8, age: 26, score: 88, time: 125 }
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">공통 컴포넌트 쇼케이스</h1>
        <p className="text-muted-foreground">
          모든 공통 컴포넌트를 한눈에 확인하고 테스트할 수 있습니다.
        </p>
        <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm">
            <strong>💡 사용 목적:</strong> Storybook 대체, 실시간 컴포넌트 동작 확인, Props 조합 테스트
          </p>
        </div>
      </div>

      <Tabs defaultValue="purpose-card" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="purpose-card">PurposeCard</TabsTrigger>
          <TabsTrigger value="ai-progress">AIAnalysisProgress</TabsTrigger>
          <TabsTrigger value="data-profile">DataProfileSummary</TabsTrigger>
          <TabsTrigger value="variable-selector">VariableSelector</TabsTrigger>
        </TabsList>

        {/* ========================================
            1. PurposeCard 쇼케이스
        ======================================== */}
        <TabsContent value="purpose-card" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PurposeCard - 선택 가능한 카드 컴포넌트</CardTitle>
              <CardDescription>
                사용처: Smart Flow 목적 선택, 개별 통계 페이지 방법 선택
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 사용 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">기본 사용 예제</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  5개의 분석 목적 카드 (클릭하여 선택)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <PurposeCard
                    icon={<GitCompare className="w-5 h-5" />}
                    title="그룹 간 차이 비교"
                    description="두 개 이상의 그룹을 비교하여 평균이나 비율의 차이를 검정합니다."
                    examples="예: 남녀 간 키 차이, 약물 효과 비교"
                    selected={selectedPurpose === 'compare'}
                    onClick={() => setSelectedPurpose('compare')}
                  />
                  <PurposeCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="변수 간 관계 분석"
                    description="두 개 이상의 변수 사이의 상관관계나 연관성을 분석합니다."
                    examples="예: 키와 몸무게의 관계"
                    selected={selectedPurpose === 'relationship'}
                    onClick={() => setSelectedPurpose('relationship')}
                  />
                  <PurposeCard
                    icon={<PieChart className="w-5 h-5" />}
                    title="분포와 빈도 분석"
                    description="데이터의 분포 형태를 파악하고 각 범주의 빈도를 분석합니다."
                    examples="예: 나이 분포, 성별 비율"
                    selected={selectedPurpose === 'distribution'}
                    onClick={() => setSelectedPurpose('distribution')}
                  />
                  <PurposeCard
                    icon={<LineChart className="w-5 h-5" />}
                    title="예측 모델링"
                    description="독립변수를 사용하여 종속변수를 예측하는 모델을 만듭니다."
                    examples="예: 공부시간으로 성적 예측"
                    selected={selectedPurpose === 'prediction'}
                    onClick={() => setSelectedPurpose('prediction')}
                  />
                  <PurposeCard
                    icon={<Clock className="w-5 h-5" />}
                    title="시계열 분석"
                    description="시간에 따른 데이터의 변화 패턴을 분석하고 미래를 예측합니다."
                    examples="예: 월별 매출 추이"
                    selected={selectedPurpose === 'timeseries'}
                    onClick={() => setSelectedPurpose('timeseries')}
                  />
                </div>
              </div>

              {/* 상태별 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">상태별 예제</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">기본 상태</p>
                    <PurposeCard
                      icon={<GitCompare className="w-5 h-5" />}
                      title="기본 카드"
                      description="선택되지 않은 기본 상태입니다."
                      selected={false}
                      onClick={() => {}}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">선택 상태</p>
                    <PurposeCard
                      icon={<GitCompare className="w-5 h-5 text-primary" />}
                      title="선택된 카드"
                      description="사용자가 선택한 상태입니다."
                      selected={true}
                      onClick={() => {}}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">비활성화 상태</p>
                    <PurposeCard
                      icon={<GitCompare className="w-5 h-5" />}
                      title="비활성화 카드"
                      description="클릭할 수 없는 비활성화 상태입니다."
                      selected={false}
                      onClick={() => {}}
                      disabled={true}
                    />
                  </div>
                </div>
              </div>

              {/* Props 테이블 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Props 명세</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Prop</th>
                        <th className="p-2 text-left">타입</th>
                        <th className="p-2 text-left">필수</th>
                        <th className="p-2 text-left">설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono">icon</td>
                        <td className="p-2 font-mono text-xs">React.ReactNode</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">카드 아이콘 (lucide-react 권장)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">title</td>
                        <td className="p-2 font-mono text-xs">string</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">카드 제목</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">description</td>
                        <td className="p-2 font-mono text-xs">string</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">카드 설명</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">examples</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">예시 텍스트 (옵션)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">selected</td>
                        <td className="p-2 font-mono text-xs">boolean</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">선택 상태</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">onClick</td>
                        <td className="p-2 font-mono text-xs">() =&gt; void</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">클릭 핸들러</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">disabled</td>
                        <td className="p-2 font-mono text-xs">boolean?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">비활성화 상태 (기본: false)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================
            2. AIAnalysisProgress 쇼케이스
        ======================================== */}
        <TabsContent value="ai-progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AIAnalysisProgress - AI 분석 진행 표시</CardTitle>
              <CardDescription>
                사용처: Smart Flow AI 추천, 모든 비동기 분석 작업
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 인터랙티브 데모 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">인터랙티브 데모</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  버튼을 클릭하여 진행 상태를 시뮬레이션하세요.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={startProgress}
                      disabled={isProgressing}
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      시작
                    </Button>
                    <Button
                      onClick={resetProgress}
                      variant="outline"
                      size="sm"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      리셋
                    </Button>
                    <span className="text-sm text-muted-foreground self-center ml-4">
                      현재 진행률: {progress}%
                    </span>
                  </div>
                  <AIAnalysisProgress
                    progress={progress}
                    title="AI가 최적의 통계 방법을 찾고 있습니다..."
                  />
                </div>
              </div>

              {/* 단계별 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">단계별 예제</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">0% - 시작</p>
                    <AIAnalysisProgress progress={0} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">30% - 데이터 특성 분석 중</p>
                    <AIAnalysisProgress progress={30} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">60% - 통계 가정 검정 중</p>
                    <AIAnalysisProgress progress={60} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">100% - 완료</p>
                    <AIAnalysisProgress progress={100} />
                  </div>
                </div>
              </div>

              {/* 커스텀 단계 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">커스텀 단계 예제</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  steps prop으로 커스텀 단계 정의 가능
                </p>
                <AIAnalysisProgress
                  progress={75}
                  title="데이터 전처리 중..."
                  steps={[
                    { label: '결측치 처리 중...', threshold: 25 },
                    { label: '이상치 탐지 중...', threshold: 50 },
                    { label: '변수 변환 중...', threshold: 75 },
                    { label: '완료!', threshold: 100 }
                  ]}
                />
              </div>

              {/* Props 테이블 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Props 명세</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Prop</th>
                        <th className="p-2 text-left">타입</th>
                        <th className="p-2 text-left">필수</th>
                        <th className="p-2 text-left">설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono">progress</td>
                        <td className="p-2 font-mono text-xs">number</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">진행률 (0~100)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">title</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">제목 (기본값 있음)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">steps</td>
                        <td className="p-2 font-mono text-xs">AnalysisStep[]?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">커스텀 단계 배열</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">className</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">추가 CSS 클래스</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================
            3. DataProfileSummary 쇼케이스
        ======================================== */}
        <TabsContent value="data-profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>DataProfileSummary - 데이터 요약 표시</CardTitle>
              <CardDescription>
                사용처: Smart Flow Step 2 결과, 개별 통계 페이지 데이터 검증 후
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">기본 예제 (충분한 표본)</h3>
                <DataProfileSummary
                  sampleSize={100}
                  numericVars={3}
                  categoricalVars={2}
                  missingValues={0}
                  totalCells={500}
                  recommendedType="parametric"
                />
              </div>

              {/* 소표본 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">소표본 예제 (비모수 권장)</h3>
                <DataProfileSummary
                  sampleSize={15}
                  numericVars={2}
                  categoricalVars={1}
                  missingValues={2}
                  totalCells={45}
                  recommendedType="nonparametric"
                />
              </div>

              {/* 결측치 있는 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">결측치가 있는 경우</h3>
                <DataProfileSummary
                  sampleSize={50}
                  numericVars={4}
                  categoricalVars={1}
                  missingValues={15}
                  totalCells={250}
                  recommendedType="parametric"
                  title="데이터 검증 완료 (결측치 있음)"
                />
              </div>

              {/* 대규모 데이터 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">대규모 데이터</h3>
                <DataProfileSummary
                  sampleSize={1000}
                  numericVars={10}
                  categoricalVars={5}
                  missingValues={50}
                  totalCells={15000}
                  recommendedType="parametric"
                  title="대규모 데이터 분석 준비 완료"
                />
              </div>

              {/* Props 테이블 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Props 명세</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Prop</th>
                        <th className="p-2 text-left">타입</th>
                        <th className="p-2 text-left">필수</th>
                        <th className="p-2 text-left">설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono">sampleSize</td>
                        <td className="p-2 font-mono text-xs">number</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">표본 크기</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">numericVars</td>
                        <td className="p-2 font-mono text-xs">number</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">수치형 변수 개수</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">categoricalVars</td>
                        <td className="p-2 font-mono text-xs">number</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">범주형 변수 개수</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">missingValues</td>
                        <td className="p-2 font-mono text-xs">number?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">결측치 개수 (기본: 0)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">totalCells</td>
                        <td className="p-2 font-mono text-xs">number?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">전체 셀 개수 (결측 비율 계산용)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">recommendedType</td>
                        <td className="p-2 font-mono text-xs">'parametric' | 'nonparametric' | null</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">권장 분석 유형</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">title</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">제목 (기본: '데이터 검증 완료')</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">className</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">추가 CSS 클래스</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================
            4. VariableSelectorSimple 쇼케이스
        ======================================== */}
        <TabsContent value="variable-selector" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>VariableSelectorSimple - 초간단 변수 선택</CardTitle>
              <CardDescription>
                사용처: 스마트 분석, 개별 통계 페이지 변수 선택
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 사용 예제 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">기본 사용 예제</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  드래그앤드롭 없이 버튼 클릭만으로 변수 선택
                </p>
                <VariableSelectorSimple
                  data={sampleData}
                  onComplete={(selection) => {
                    alert(`종속변수: ${selection.dependent}\n독립변수: ${selection.independent}`)
                  }}
                  title="변수 선택 데모"
                  description="아래 버튼을 클릭하여 변수를 선택하세요"
                />
              </div>

              {/* 디자인 특징 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">디자인 특징</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-2">✅ 장점</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>드래그앤드롭 제거 (번거로움 해소)</li>
                        <li>할당 개념 제거 (초보자 친화적)</li>
                        <li>버튼 클릭만으로 선택 (가장 직관적)</li>
                        <li>한 화면에 모든 정보</li>
                        <li>선택 상태 즉시 확인</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-2">🎯 사용 시나리오</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>스마트 분석 변수 선택</li>
                        <li>단순 회귀 분석</li>
                        <li>상관 분석</li>
                        <li>t-검정 (2변수)</li>
                        <li>모든 기본 통계 분석</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Props 테이블 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Props 명세</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Prop</th>
                        <th className="p-2 text-left">타입</th>
                        <th className="p-2 text-left">필수</th>
                        <th className="p-2 text-left">설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono">data</td>
                        <td className="p-2 font-mono text-xs">Record&lt;string, unknown&gt;[]</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">분석할 데이터</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">onComplete</td>
                        <td className="p-2 font-mono text-xs">(selection) =&gt; void</td>
                        <td className="p-2">✅</td>
                        <td className="p-2">선택 완료 콜백</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">onBack</td>
                        <td className="p-2 font-mono text-xs">() =&gt; void?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">이전 버튼 핸들러</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">title</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">제목 (기본: '변수 선택')</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">description</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">설명 텍스트</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono">className</td>
                        <td className="p-2 font-mono text-xs">string?</td>
                        <td className="p-2">❌</td>
                        <td className="p-2">추가 CSS 클래스</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 사용 예제 코드 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">사용 예제 코드</h3>
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
{`import { VariableSelectorSimple } from '@/components/common/VariableSelectorSimple'

function MyComponent() {
  const [data, setData] = useState([...])

  return (
    <VariableSelectorSimple
      data={data}
      onComplete={(selection) => {
        console.log('종속변수:', selection.dependent)
        console.log('독립변수:', selection.independent)
        // 분석 로직 실행
      }}
      onBack={() => goToPreviousStep()}
    />
  )
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 페이지 하단 정보 */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <h3 className="font-semibold mb-2">📌 개발 팁</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>이 페이지는 개발 모드 전용입니다 (프로덕션 빌드에서 제외 가능)</li>
          <li>새 공통 컴포넌트를 추가하면 이 페이지에도 탭을 추가하세요</li>
          <li>컴포넌트 수정 후 여기서 실시간으로 확인하세요 (HMR 지원)</li>
          <li>다양한 Props 조합을 테스트하여 엣지 케이스를 발견할 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
}
