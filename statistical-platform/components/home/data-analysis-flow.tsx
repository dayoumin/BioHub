"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  BarChart3, 
  TrendingUp,
  Users,
  GitBranch,
  Activity,
  Target
} from "lucide-react"
import { useAppStore } from "@/lib/store"

interface DataAnalysisFlowProps {
  datasetId: string
  onAnalysisComplete?: () => void
}

interface ColumnInfo {
  name: string
  type: string
}

interface ValidationResult {
  warnings?: string[]
  errors?: string[]
}

interface DatasetInfo {
  name: string
  rowCount: number
  columns: ColumnInfo[]
  validation?: ValidationResult
}

// 규칙 기반 통계 방법 추천 (AI 없이)
function recommendStatisticalMethod(purpose: string, dataInfo: { columns: ColumnInfo[]; rowCount: number }) {
  const recommendations: Array<{ method: string; reason: string; icon: any }> = []
  
  // 키워드 기반 추천
  const purposeLower = purpose.toLowerCase()
  
  if (purposeLower.includes("평균") || purposeLower.includes("차이") || purposeLower.includes("비교")) {
    if (purposeLower.includes("두") || purposeLower.includes("2개")) {
      recommendations.push({
        method: "독립표본 t-검정",
        reason: "두 그룹의 평균을 비교하려고 하시는군요",
        icon: Users
      })
    } else if (purposeLower.includes("여러") || purposeLower.includes("3개") || purposeLower.includes("세")) {
      recommendations.push({
        method: "일원분산분석 (ANOVA)",
        reason: "3개 이상 그룹의 평균을 비교하려고 하시는군요",
        icon: BarChart3
      })
    }
  }
  
  if (purposeLower.includes("관계") || purposeLower.includes("상관") || purposeLower.includes("연관")) {
    recommendations.push({
      method: "상관분석",
      reason: "변수 간의 관계를 파악하려고 하시는군요",
      icon: GitBranch
    })
  }
  
  if (purposeLower.includes("예측") || purposeLower.includes("영향")) {
    recommendations.push({
      method: "회귀분석",
      reason: "한 변수가 다른 변수에 미치는 영향을 분석하려고 하시는군요",
      icon: TrendingUp
    })
  }
  
  if (purposeLower.includes("빈도") || purposeLower.includes("비율") || purposeLower.includes("범주")) {
    recommendations.push({
      method: "카이제곱 검정",
      reason: "범주형 데이터의 관계를 분석하려고 하시는군요",
      icon: Target
    })
  }
  
  // 기본 추천
  if (recommendations.length === 0) {
    recommendations.push({
      method: "기술통계",
      reason: "먼저 데이터의 기본적인 특성을 파악해보세요",
      icon: Activity
    })
  }
  
  return recommendations
}

export function DataAnalysisFlow({ datasetId, onAnalysisComplete }: DataAnalysisFlowProps) {
  const { getDataset } = useAppStore() as { getDataset?: (id: string) => DatasetInfo | unknown }
  const dataset = getDataset?.(datasetId) as DatasetInfo | undefined
  const [step, setStep] = useState(2) // Step 1은 이미 완료 (파일 업로드)
  const [purpose, setPurpose] = useState("")
  const [dataType, setDataType] = useState("")
  const [recommendations, setRecommendations] = useState<any[]>([])

  useEffect(() => {
    if (!dataset) return
    
    // 데이터 검증 정보 표시
    console.log("Dataset loaded:", dataset)
  }, [dataset])

  const handleAnalyze = () => {
    if (!purpose) return
    
    // 규칙 기반 추천
    const recs = recommendStatisticalMethod(purpose, {
      columns: dataset?.columns || [],
      rowCount: dataset?.rowCount || 0
    })
    
    setRecommendations(recs)
    setStep(3)
  }

  if (!dataset) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>데이터셋을 찾을 수 없습니다</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 2: 데이터 검증 결과 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary">Step 2</Badge>
          <span className="font-medium">데이터 검증 결과</span>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>파일명: {dataset.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>행 개수: {dataset.rowCount?.toLocaleString()}개</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>열 개수: {dataset.columns?.length || 0}개</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {dataset.validation?.warnings?.map((warning: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span className="text-muted-foreground">{warning}</span>
                  </div>
                ))}
                {dataset.validation?.errors?.map((error: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <span className="text-muted-foreground">{error}</span>
                  </div>
                ))}
                {!dataset.validation?.warnings?.length && !dataset.validation?.errors?.length && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>데이터 품질 양호</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* 열 정보 */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">데이터 열 정보:</p>
              <div className="flex flex-wrap gap-2">
                {dataset.columns?.map((col: { name: string; type: string }, i: number) => (
                  <Badge key={i} variant="outline">
                    {col.name} ({col.type})
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3: 분석 목적 설명 */}
      {step >= 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={step === 2 ? "bg-primary" : "bg-muted"}>Step 3</Badge>
            <span className="font-medium">분석 목적 설명</span>
          </div>
          
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">무엇을 알고 싶으신가요?</Label>
                <Textarea
                  id="purpose"
                  placeholder="예: 남녀 간의 평균 점수 차이를 알고 싶습니다 / A, B, C 세 그룹의 만족도를 비교하고 싶습니다 / 광고비와 매출의 관계를 분석하고 싶습니다"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>주요 데이터 유형</Label>
                <RadioGroup value={dataType} onValueChange={setDataType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="continuous" id="continuous" />
                    <Label htmlFor="continuous">연속형 (숫자 데이터)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="categorical" id="categorical" />
                    <Label htmlFor="categorical">범주형 (그룹, 카테고리)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mixed" id="mixed" />
                    <Label htmlFor="mixed">혼합형</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button 
                onClick={handleAnalyze}
                disabled={!purpose}
                className="w-full"
              >
                분석 방법 추천받기
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: 추천 결과 */}
      {step >= 3 && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary">Step 4</Badge>
            <span className="font-medium">추천 통계 방법</span>
          </div>
          
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const Icon = rec.icon
              return (
                <Card key={i} className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{rec.method}</CardTitle>
                        <CardDescription>{rec.reason}</CardDescription>
                      </div>
                      <Button size="sm" asChild>
                        <a href={`/statistics?method=${encodeURIComponent(rec.method)}&dataset=${datasetId}`}>
                          이 방법으로 분석
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              추천된 방법이 적합하지 않다면, "직접 선택" 탭에서 29가지 통계 방법을 직접 선택할 수 있습니다.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}