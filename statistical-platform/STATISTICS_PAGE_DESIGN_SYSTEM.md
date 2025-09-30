# 📊 통계 페이지 디자인 시스템 가이드

**통계 분석 플랫폼의 모든 통계 페이지는 이 가이드를 준수해야 합니다.**

## 🏗️ 필수 구조 패턴

### 1. 기본 레이아웃 템플릿
```tsx
<StatisticsPageLayout
  title="검정 이름"
  subtitle="영문명 또는 부제목"
  description="한 줄 설명"
  icon={<IconComponent className="w-6 h-6" />}
  steps={steps}
  currentStep={currentStep}
  onStepChange={setCurrentStep}
  methodInfo={{
    formula: "수학 공식",
    assumptions: ["가정1", "가정2", "가정3"],
    sampleSize: "표본 크기 요구사항",
    usage: "사용 상황 설명"
  }}
>
  {/* 4단계 콘텐츠 */}
</StatisticsPageLayout>
```

### 2. 표준 4단계 구조
```tsx
// Step 1: 방법론 소개
{currentStep === 0 && (
  <StepCard
    title="[검정명] 소개"
    description="개념과 적용 조건 설명"
    icon={<Info className="w-5 h-5 text-blue-500" />}
  >
    {/* 이론적 배경, 목적, 적용 조건, vs 다른 검정 비교 */}
  </StepCard>
)}

// Step 2: 데이터 업로드
{currentStep === 1 && (
  <StepCard
    title="데이터 업로드"
    description="분석할 데이터 파일을 업로드하세요"
    icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
  >
    <DataUploadStep
      onNext={handleDataUpload}
      acceptedFormats={['.csv', '.xlsx', '.xls']}
    />
  </StepCard>
)}

// Step 3: 변수 선택
{currentStep === 2 && uploadedData && (
  <StepCard
    title="변수 선택"
    description="분석에 사용할 변수를 선택하세요"
    icon={<BarChart3 className="w-5 h-5 text-primary" />}
  >
    <VariableSelector
      methodId="검정_method_id"
      data={uploadedData}
      onVariablesSelected={handleVariableSelection}
      onBack={() => setCurrentStep(1)}
    />
  </StepCard>
)}

// Step 4: 결과 해석
{currentStep === 3 && analysisResult && (
  <div className="space-y-6">
    {/* 주요 결과 카드들 */}
    {/* 상세 결과 탭들 */}
    {/* 액션 버튼들 */}
  </div>
)}
```

## 🎨 시각적 일관성

### 1. 주요 결과 카드 (3개 그리드)
```tsx
<div className="grid md:grid-cols-3 gap-4">
  <Card className="border-2">
    <CardContent className="pt-6">
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">{주요통계량}</div>
        <p className="text-sm text-muted-foreground mt-1">통계량 이름</p>
      </div>
    </CardContent>
  </Card>

  <Card className="border-2">
    <CardContent className="pt-6">
      <div className="text-center">
        <div className="text-2xl font-bold">
          <PValueBadge value={pValue} size="lg" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">유의확률</p>
      </div>
    </CardContent>
  </Card>

  <Card className="border-2">
    <CardContent className="pt-6">
      <div className="text-center">
        <div className="text-3xl font-bold text-orange-600">{effectSize}</div>
        <p className="text-sm text-muted-foreground mt-1">효과크기</p>
        <Badge variant="outline">{해석}</Badge>
      </div>
    </CardContent>
  </Card>
</div>
```

### 2. 상세 결과 탭 구조
```tsx
<Tabs defaultValue="statistics" className="space-y-4">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="statistics">통계량</TabsTrigger>
    <TabsTrigger value="descriptives">기술통계</TabsTrigger>
    <TabsTrigger value="interpretation">해석</TabsTrigger>
    <TabsTrigger value="visualization">시각화</TabsTrigger>
  </TabsList>

  {/* 각 탭 콘텐츠 */}
</Tabs>
```

### 3. 표준 테이블 형식
```tsx
<table className="w-full border-collapse border">
  <thead>
    <tr className="bg-muted">
      <th className="border p-2 text-left">항목</th>
      <th className="border p-2 text-right">값</th>
      <th className="border p-2 text-center">설명</th>
    </tr>
  </thead>
  <tbody>
    {/* font-mono 클래스 사용으로 숫자 정렬 */}
    <tr>
      <td className="border p-2 font-medium">통계량명</td>
      <td className="border p-2 text-right font-mono">{value.toFixed(4)}</td>
      <td className="border p-2 text-sm text-muted-foreground">설명</td>
    </tr>
  </tbody>
</table>
```

## 🧩 필수 컴포넌트 임포트

### 1. shadcn/ui 컴포넌트
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
```

### 2. Lucide 아이콘
```tsx
import {
  Activity,        // 로딩 아이콘
  BarChart3,      // 차트 관련
  CheckCircle,    // 성공 상태
  AlertTriangle,  // 경고/오류
  Info,           // 정보
  Calculator,     // 계산 관련
  TrendingUp,     // 증가 트렌드
  FileSpreadsheet, // 파일 업로드
  Download,       // 다운로드
  Target          // 목표/목적
} from 'lucide-react'
```

### 3. 프로젝트 전용 컴포넌트
```tsx
// 레이아웃
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'

// 단계별 컴포넌트
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'

// 결과 표시 컴포넌트
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'

// 서비스
import { pyodideStats } from '@/lib/services/pyodide-statistics'
```

## 🔄 표준 상태 관리 패턴

### 1. 기본 State 구조
```tsx
const [currentStep, setCurrentStep] = useState(0)
const [uploadedData, setUploadedData] = useState<DataRow[] | null>(null)
const [selectedVariables, setSelectedVariables] = useState<VariableAssignment | null>(null)
const [analysisResult, setAnalysisResult] = useState<ResultType | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)
const [error, setError] = useState<string | null>(null)
const [pyodide, setPyodide] = useState<typeof pyodideStats | null>(null)
```

### 2. 표준 이벤트 핸들러
```tsx
// 데이터 업로드 처리
const handleDataUpload = useCallback((data: any[]) => {
  const processedData = data.map((row, index) => ({ ...row, _id: index }))
  setUploadedData(processedData)
  setCurrentStep(2)
  setError(null)
}, [])

// 변수 선택 처리
const handleVariableSelection = useCallback((variables: VariableAssignment) => {
  setSelectedVariables(variables)
  if (/* 변수 검증 조건 */) {
    runAnalysis(variables)
  }
}, [])

// 분석 실행
const runAnalysis = async (variables: VariableAssignment) => {
  setIsAnalyzing(true)
  setError(null)
  try {
    const result = await pyodide.분석메서드(uploadedData, ...)
    setAnalysisResult(result)
    setCurrentStep(3)
  } catch (err) {
    setError('분석 중 오류가 발생했습니다.')
  } finally {
    setIsAnalyzing(false)
  }
}
```

## 📋 단계별 콘텐츠 가이드

### Step 1: 방법론 소개
- **목적**: 분석 방법의 이론적 배경 설명
- **구성**: 2x2 그리드 카드 (분석 목적 + 적용 조건)
- **포함 요소**:
  - 분석 목적과 활용처
  - 다른 검정과의 비교
  - 가정사항 설명
  - 적용 조건과 제한사항

### Step 2: 데이터 업로드
- **목적**: 표준화된 파일 업로드 인터페이스
- **지원 형식**: CSV, Excel (xlsx, xls)
- **자동 기능**: 데이터 타입 감지, 결측값 확인

### Step 3: 변수 선택
- **목적**: 분석에 필요한 변수 선택
- **기능**: 변수 타입별 분류, 자동 추천
- **검증**: 필요 변수 개수와 타입 검증

### Step 4: 결과 해석
- **주요 결과 카드**: 3개 그리드 (통계량, p-값, 효과크기)
- **상세 탭**: 통계량 → 기술통계 → 해석 → 시각화
- **액션 버튼**: 이전, 결과 내보내기, 새로운 분석

## 🚨 로딩 및 에러 처리

### 1. 로딩 상태 모달
```tsx
{isAnalyzing && (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
    <Card className="w-96">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-4">
          <Activity className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">[검정명] 분석 중...</p>
            <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

### 2. 에러 표시
```tsx
{error && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>오류</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

## 🎯 명명 규칙

- **파일명**: `/statistics/[검정-이름]/page.tsx` (kebab-case)
- **컴포넌트명**: `[검정이름]Page` (PascalCase)
- **State 변수**: camelCase
- **상수**: UPPER_SNAKE_CASE

## ✅ 품질 체크리스트

- [ ] StatisticsPageLayout 사용
- [ ] 4단계 구조 준수
- [ ] 표준 컴포넌트 임포트
- [ ] PValueBadge로 p-값 표시
- [ ] 3개 주요 결과 카드
- [ ] 4개 탭 구조 (통계량/기술통계/해석/시각화)
- [ ] 로딩 상태 모달
- [ ] 에러 처리 Alert
- [ ] TypeScript 타입 안전성
- [ ] 반응형 디자인 (md: 브레이크포인트)

---

**이 가이드를 따라 구현하면 모든 통계 페이지가 일관된 UX/UI를 제공합니다.**