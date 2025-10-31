"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from 'next/link'
import {
  Brain,
  Target,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Download,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Home
} from "lucide-react"
// import { StatisticalGuidanceComponent } from "@/components/analysis/statistical-guidance"
// import { StatisticalGuideSystem, FileNamingSystem } from "@/lib/statistical-guide"
// import { StatisticalTestResult, CorrelationResult } from "@/lib/statistics"
import { useState } from "react"

export default function HelpPage() {
  const [currentDemo, setCurrentDemo] = useState<'ttest' | 'correlation'>('ttest')

  // 샘플 t-검정 결과
  const sampleTTestResult = {
    testName: "독립표본 t-검정",
    statistic: 2.45,
    pValue: 0.016,
    degreesOfFreedom: 38,
    effectSize: 0.68,
    confidenceInterval: [0.25, 2.15] as [number, number],
    interpretation: "두 그룹 간에 통계적으로 유의한 차이가 있습니다",
    isSignificant: true,
    assumptions: [
      { name: "정규성", met: true, description: "두 그룹 모두 정규분포를 따름", pValue: 0.15 },
      { name: "등분산성", met: true, description: "두 그룹의 분산이 동일함", pValue: 0.24 },
      { name: "독립성", met: true, description: "관측값들이 서로 독립적임" }
    ],
    multipleComparisons: {
      method: 'bonferroni',
      originalPValue: 0.016,
      adjustedPValue: 0.032,
      isSignificantAfterCorrection: true,
      alpha: 0.05,
      numberOfComparisons: 2,
      correctionApplied: true
    }
  }

  // 샘플 상관분석 결과
  const sampleCorrelationResult = {
    testName: "Pearson 상관분석",
    statistic: 0.72,
    correlation: 0.72,
    rSquared: 0.52,
    pValue: 0.001,
    confidenceInterval: [0.45, 0.87] as [number, number],
    interpretation: "강한 정적 상관관계",
    sampleSize: 50,
    isSignificant: true,
    multipleComparisons: {
      method: 'holm',
      originalPValue: 0.001,
      adjustedPValue: 0.002,
      isSignificantAfterCorrection: true,
      alpha: 0.05,
      numberOfComparisons: 3,
      correctionApplied: true
    }
  }

  const handleNextAnalysis = (analysisType: string) => {
    console.log('다음 분석:', analysisType)
  }

  const handleDownloadResult = (filename: string) => {
    console.log('파일 다운로드:', filename)
  }

  const features = [
    {
      icon: <Brain className="h-6 w-6 text-blue-500" />,
      title: "전문가급 통계 분석",
      description: "SciPy 기반의 정확한 통계 계산과 다양한 검정 방법을 제공합니다"
    },
    {
      icon: <Target className="h-6 w-6 text-green-500" />,
      title: "맞춤형 분석 가이드",
      description: "데이터 특성에 맞는 적절한 통계 방법을 가이드하고 추천합니다"
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-purple-500" />,
      title: "상세한 결과 해석",
      description: "복잡한 통계 결과를 단계별로 자세히 해석하고 다음 단계를 안내합니다"
    }
  ]

  const steps = [
    "데이터 파일 업로드 (CSV, Excel 지원)",
    "데이터 품질 확인 및 전처리",
    "적절한 통계 분석 방법 선택",
    "SciPy 기반 정확한 분석 실행",
    "상세한 결과 해석 및 다음 단계 안내"
  ]

  const handleDownloadSample = (filename: string) => {
    const link = document.createElement('a')
    link.href = `/test-data/${filename}`
    link.download = filename
    link.click()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                홈
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">|</span>
            <h1 className="text-lg font-bold">도움말</h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">도움말 센터</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            통계 분석 플랫폼 사용법과 자주 묻는 질문들을 확인하세요.
          </p>
        </div>

      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="getting-started">시작하기</TabsTrigger>
          <TabsTrigger value="features">기능 소개</TabsTrigger>
          <TabsTrigger value="samples">샘플 데이터</TabsTrigger>
          <TabsTrigger value="guide-demo">결과 해석 가이드</TabsTrigger>
          <TabsTrigger value="faq">자주 묻는 질문</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                통계 분석 플랫폼 사용법
              </CardTitle>
              <CardDescription>
                5단계로 완료되는 체계적인 분석 과정
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>데이터 준비 가이드</CardTitle>
              <CardDescription>올바른 데이터 형식으로 업로드하는 방법</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>중요:</strong> 데이터의 첫 번째 행에는 반드시 열 이름(변수명)을 입력해주세요. 
                  예: &quot;나이&quot;, &quot;성별&quot;, &quot;점수&quot; 등
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">✅ 올바른 예시</h4>
                  <div className="bg-green-50 p-3 rounded text-xs font-mono">
                    나이,성별,점수<br/>
                    25,남성,85<br/>
                    30,여성,92<br/>
                    28,남성,78
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">❌ 잘못된 예시</h4>
                  <div className="bg-red-50 p-3 rounded text-xs font-mono">
                    25,남성,85점<br/>
                    30세,여성,92<br/>
                    28,Female,78<br/>
                    평균,28.5,85
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {feature.icon}
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>지원하는 분석 방법</CardTitle>
              <CardDescription>플랫폼에서 자동으로 제안하는 통계 분석들</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">기본 통계 분석</h4>
                  <div className="space-y-2 text-sm">
                    <div>• 기술통계량 (평균, 표준편차 등)</div>
                    <div>• 일표본 t-검정</div>
                    <div>• 이표본 t-검정</div>
                    <div>• 대응표본 t-검정</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">고급 통계 분석</h4>
                  <div className="space-y-2 text-sm">
                    <div>• 일원분산분석 (ANOVA)</div>
                    <div>• 상관분석 (Pearson, Spearman)</div>
                    <div>• 단순회귀분석</div>
                    <div>• 비모수 검정 (Mann-Whitney, Wilcoxon)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="samples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>샘플 데이터 다운로드</CardTitle>
              <CardDescription>
                다양한 분석 유형에 맞는 예제 데이터를 다운로드하여 연습해보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide-demo" className="space-y-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                통계 결과 해석 가이드 체험
              </CardTitle>
              <CardDescription>
                실제 분석 결과를 통해 해석 방법과 다음 단계를 배워보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>이 가이드의 목적:</strong> 분석 결과를 받았을 때 무엇을 보고, 어떻게 해석하고, 
                  다음에 무엇을 해야 하는지 구체적으로 알려드립니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">예제 선택</CardTitle>
                    <CardDescription>체험해볼 분석 결과를 선택하세요</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Button 
                        variant={currentDemo === 'ttest' ? 'default' : 'outline'}
                        onClick={() => setCurrentDemo('ttest')}
                        className="flex items-center gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        t-검정 결과 해석
                      </Button>
                      <Button 
                        variant={currentDemo === 'correlation' ? 'default' : 'outline'}
                        onClick={() => setCurrentDemo('correlation')}
                        className="flex items-center gap-2"
                      >
                        <TrendingUp className="h-4 w-4" />
                        상관분석 결과 해석
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* t-검정 가이드 */}
                {currentDemo === 'ttest' && (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-500" />
                          예제: 신약 효과 검정 결과
                        </CardTitle>
                        <CardDescription>실험군과 대조군 비교 분석 (다중비교 보정 적용)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted p-4 rounded-lg">
                          <div>
                            <span className="font-medium">t-통계량:</span> {sampleTTestResult.statistic}
                          </div>
                          <div>
                            <span className="font-medium">p-value:</span> {sampleTTestResult.pValue}
                          </div>
                          <div>
                            <span className="font-medium">자유도:</span> {sampleTTestResult.degreesOfFreedom}
                          </div>
                          <div>
                            <span className="font-medium">효과크기:</span> {sampleTTestResult.effectSize}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* <StatisticalGuidanceComponent
                      guidance={StatisticalGuideSystem.generateTTestGuidance(sampleTTestResult)}
                      fileNaming={FileNamingSystem.generateFileName('two-sample-t-test', '신약효과검정', '다중보정적용')}
                      onNextAnalysis={handleNextAnalysis}
                      onDownloadResult={handleDownloadResult}
                    /> */}
                  </div>
                )}

                {/* 상관분석 가이드 */}
                {currentDemo === 'correlation' && (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          예제: 학습시간과 성적 상관관계
                        </CardTitle>
                        <CardDescription>연속변수 간의 선형관계 분석</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted p-4 rounded-lg">
                          <div>
                            <span className="font-medium">상관계수:</span> {sampleCorrelationResult.correlation}
                          </div>
                          <div>
                            <span className="font-medium">p-value:</span> {sampleCorrelationResult.pValue}
                          </div>
                          <div>
                            <span className="font-medium">표본크기:</span> {sampleCorrelationResult.sampleSize}
                          </div>
                          <div>
                            <span className="font-medium">유의성:</span> {sampleCorrelationResult.isSignificant ? '유의함' : '유의하지 않음'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* <StatisticalGuidanceComponent
                      guidance={StatisticalGuideSystem.generateCorrelationGuidance(sampleCorrelationResult)}
                      fileNaming={FileNamingSystem.generateFileName('correlation', '학습시간vs성적', '강한정적상관')}
                      onNextAnalysis={handleNextAnalysis}
                      onDownloadResult={handleDownloadResult}
                    /> */}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  자주 묻는 질문
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Q. 통계 지식이 없어도 사용할 수 있나요?</h4>
                  <p className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                    네! 플랫폼이 단계별로 자세히 안내해드리고, 결과 해석 가이드를 통해 쉽게 이해할 수 있습니다. 
                    데이터를 업로드하면 적절한 분석 방법을 추천해드립니다.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Q. 어떤 파일 형식을 지원하나요?</h4>
                  <p className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                    CSV, Excel (.xls, .xlsx), TSV 파일을 지원합니다. 최대 파일 크기는 50MB입니다.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Q. 데이터에 문제가 있다고 나오는데 어떻게 해야 하나요?</h4>
                  <p className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                    시스템이 구체적인 문제점과 해결방법을 알려드립니다. 대부분은 데이터 형식을 맞추거나 
                    결측값을 처리하는 것으로 해결됩니다.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Q. 결과를 어떻게 해석하나요?</h4>
                  <p className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                    플랫폼의 결과 해석 가이드가 통계 결과를 단계별로 상세히 설명해드립니다. 
                    p-value, 효과크기 등의 의미와 다음 단계까지 명확하게 안내합니다.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Q. 가이드 모드와 전문가 모드의 차이는 무엇인가요?</h4>
                  <p className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                    가이드 모드는 플랫폼이 단계별로 분석 방법을 추천하고 상세히 설명하는 초보자용입니다. 
                    전문가 모드는 통계 전문가가 직접 모든 옵션을 설정할 수 있는 고급 모드입니다.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Q. 분석 결과를 어떻게 저장하거나 공유할 수 있나요?</h4>
                  <p className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                    분석 결과는 PDF 보고서나 이미지로 다운로드할 수 있으며, 
                    브라우저에서 인쇄 기능을 사용해 저장할 수도 있습니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}