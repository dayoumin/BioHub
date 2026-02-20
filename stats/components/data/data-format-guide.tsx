"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileSpreadsheet, AlertCircle, CheckCircle2, Info, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DataFormatGuide() {
  const testRequirements = [
    {
      name: "기초 통계량",
      variables: "최소 1개의 수치형 변수",
      minSamples: "제한 없음",
      example: "age, height, weight 등"
    },
    {
      name: "One-sample t-test",
      variables: "1개의 수치형 변수",
      minSamples: "최소 3개",
      example: "before_treatment 또는 score"
    },
    {
      name: "Two-sample t-test",
      variables: "1개의 수치형 + 1개의 그룹 변수",
      minSamples: "각 그룹당 최소 3개",
      example: "score, group (A/B)"
    },
    {
      name: "Paired t-test",
      variables: "2개의 수치형 변수 (사전-사후)",
      minSamples: "최소 3쌍",
      example: "before_score, after_score"
    },
    {
      name: "One-way ANOVA",
      variables: "1개의 수치형 + 1개의 그룹 변수",
      minSamples: "각 그룹당 최소 3개",
      example: "score, treatment_group (A/B/C)"
    },
    {
      name: "상관분석",
      variables: "2개의 수치형 변수",
      minSamples: "최소 5개 (권장 30개 이상)",
      example: "study_hours, test_score"
    },
    {
      name: "단순 선형회귀",
      variables: "2개의 수치형 변수",
      minSamples: "최소 5개 (권장 30개 이상)",
      example: "x_variable, y_variable"
    }
  ]

  const dataTypeExamples = {
    numeric: ["나이", "키", "몸무게", "점수", "온도", "시간", "거리", "가격"],
    categorical: ["성별 (남/여)", "그룹 (A/B/C)", "등급 (상/중/하)", "지역", "브랜드"],
    text: ["이름", "주소", "설명", "댓글"],
    date: ["2024-01-15", "2024/01/15", "15-01-2024"]
  }

  const commonIssues = [
    {
      issue: "열 이름이 없거나 중복됨",
      solution: "첫 번째 행에 고유한 열 이름을 입력하세요",
      example: "subject_id, age, height (O) | 이름없음, age, age (X)"
    },
    {
      issue: "수치형 데이터에 텍스트 포함",
      solution: "숫자 데이터에는 숫자만 입력하세요",
      example: "25, 30, 35 (O) | 25세, 30살, 35 (X)"
    },
    {
      issue: "그룹 변수가 일관되지 않음",
      solution: "같은 그룹은 동일한 이름으로 표기하세요",
      example: "A, A, B, B (O) | Group A, A, GroupB, b (X)"
    },
    {
      issue: "결측값 표기가 다름",
      solution: "결측값은 빈 칸으로 두거나 'NA' 사용",
      example: "25, , 30, NA (O) | 25, 없음, 30, - (X)"
    }
  ]

  const handleDownloadSample = (filename: string) => {
    // 샘플 파일 다운로드 기능
    const link = document.createElement('a')
    link.href = `/test-data/${filename}`
    link.download = filename
    link.click()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>데이터 형식 가이드</CardTitle>
              <CardDescription>
                통계 분석을 위한 올바른 데이터 형식과 요구사항을 확인하세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="requirements" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="requirements">분석별 요구사항</TabsTrigger>
              <TabsTrigger value="data-types">데이터 유형</TabsTrigger>
              <TabsTrigger value="common-issues">일반적 문제</TabsTrigger>
              <TabsTrigger value="samples">샘플 파일</TabsTrigger>
            </TabsList>
            
            <TabsContent value="requirements" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  각 통계 분석에는 특정한 데이터 형식과 최소 샘플 수가 필요합니다.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-4">
                {testRequirements.map((test, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">필요 변수:</span>
                          <p className="text-muted-foreground">{test.variables}</p>
                        </div>
                        <div>
                          <span className="font-medium">최소 샘플:</span>
                          <p className="text-muted-foreground">{test.minSamples}</p>
                        </div>
                        <div>
                          <span className="font-medium">예시:</span>
                          <p className="text-muted-foreground font-mono text-xs">{test.example}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="data-types" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  데이터 유형을 올바르게 구분하면 적절한 통계 분석을 선택할 수 있습니다.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="default">수치형</Badge>
                      숫자 데이터
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        계산 가능한 연속적인 숫자 값
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dataTypeExamples.numeric.map((example, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="secondary">범주형</Badge>
                      카테고리 데이터
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        구분되는 그룹이나 카테고리
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dataTypeExamples.categorical.map((example, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline">텍스트</Badge>
                      문자 데이터
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        자유형식 텍스트 (분석 제한적)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dataTypeExamples.text.map((example, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="destructive">날짜</Badge>
                      날짜/시간 데이터
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        표준 날짜 형식 사용 권장
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dataTypeExamples.date.map((example, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="common-issues" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  데이터 업로드 시 자주 발생하는 문제들과 해결 방법입니다.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {commonIssues.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium text-destructive">{item.issue}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{item.solution}</p>
                          </div>
                        </div>
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-xs font-mono">{item.example}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="samples" className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  다양한 분석 유형에 맞는 샘플 데이터를 다운로드하여 참고하세요.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">기초 통계용 데이터</CardTitle>
                    <CardDescription>기술통계, 단일표본 t검정용</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        20개 행 × 5개 변수 (subject_id, age, height, weight, score)
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadSample('sample-basic-stats.csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">두 그룹 비교 데이터</CardTitle>
                    <CardDescription>독립표본 t검정, 일원분산분석용</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        20개 행 × 5개 변수 (subject_id, group, score, reaction_time, satisfaction)
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadSample('sample-two-groups.csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">상관분석 데이터</CardTitle>
                    <CardDescription>상관분석, 단순회귀분석용</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        20개 행 × 5개 변수 (student_id, study_hours, test_score, motivation, sleep_hours)
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadSample('sample-correlation.csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">사전-사후 데이터</CardTitle>
                    <CardDescription>대응표본 t검정용</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        20개 행 × 4개 변수 (subject_id, before_treatment, after_treatment, improvement)
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadSample('sample-before-after.csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}