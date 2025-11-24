'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BookOpen, HelpCircle, Keyboard, Database, FileText } from 'lucide-react'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle>도움말</DialogTitle>
          <DialogDescription>
            NIFS 통계 분석 플랫폼 사용 가이드
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="guide" className="gap-2">
              <BookOpen className="h-4 w-4" />
              사용 가이드
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
                        <TabsTrigger value="shortcuts" className="gap-2">
              <Keyboard className="h-4 w-4" />
              단축키
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-2">
              <FileText className="h-4 w-4" />
              변수 선택
            </TabsTrigger>
            <TabsTrigger value="data-format" className="gap-2">
              <Database className="h-4 w-4" />
              데이터 형식
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] max-h-[500px] mt-4">
            {/* 사용 가이드 */}
            <TabsContent value="guide" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. 통계 분석 시작하기</CardTitle>
                  <CardDescription>
                    원하는 분석 방법을 선택하고 데이터를 업로드하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">분석 방법 선택</h4>
                    <p className="text-sm text-muted-foreground">
                      홈 화면에서 원하는 통계 분석 방법을 선택합니다.
                      회귀분석, ANOVA, 상관분석 등 다양한 방법을 제공합니다.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">데이터 업로드</h4>
                    <p className="text-sm text-muted-foreground">
                      CSV, Excel, SPSS 파일을 업로드할 수 있습니다.
                      드래그 앤 드롭 또는 클릭하여 파일을 선택하세요.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. 변수 선택 및 분석</CardTitle>
                  <CardDescription>
                    분석에 사용할 변수를 선택하고 옵션을 설정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">독립변수/종속변수 선택</h4>
                    <p className="text-sm text-muted-foreground">
                      업로드한 데이터의 변수 중에서 분석에 사용할 변수를 선택합니다.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">분석 실행</h4>
                    <p className="text-sm text-muted-foreground">
                      모든 설정이 완료되면 "분석 시작" 버튼을 클릭하여 분석을 실행합니다.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. 결과 확인 및 내보내기</CardTitle>
                  <CardDescription>
                    분석 결과를 확인하고 필요한 형식으로 내보내세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">결과 해석</h4>
                    <p className="text-sm text-muted-foreground">
                      통계량, p-value, 그래프 등을 확인하고 결과를 해석합니다.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">결과 내보내기</h4>
                    <p className="text-sm text-muted-foreground">
                      결과를 PDF, Excel, 이미지 등 다양한 형식으로 내보낼 수 있습니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ */}
            <TabsContent value="faq" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">어떤 파일 형식을 지원하나요?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    CSV (.csv), Excel (.xlsx, .xls), SPSS (.sav), TSV (.tsv), HWP (.hwp) 파일을 지원합니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">데이터는 안전하게 보관되나요?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    업로드한 데이터는 브라우저의 로컬 스토리지에만 저장되며,
                    서버로 전송되지 않습니다. 브라우저를 닫으면 데이터가 삭제됩니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">분석 결과를 저장할 수 있나요?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    네, 분석 결과를 PDF, Excel, 이미지 등의 형식으로 내보낼 수 있습니다.
                    각 결과 페이지에서 "내보내기" 버튼을 클릭하세요.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI 챗봇은 어떻게 사용하나요?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    상단 헤더의 챗봇 아이콘을 클릭하면 우측에 챗봇 패널이 열립니다.
                    통계 분석 관련 질문을 자유롭게 입력하세요.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 단축키 */}
            <TabsContent value="shortcuts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">일반</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">도움말 열기</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                      F1
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">설정 열기</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                      Ctrl + ,
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">AI 챗봇 열기</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                      Ctrl + K
                    </kbd>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">분석 화면</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">이전 단계로 이동</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                      Ctrl + ←
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">다음 단계로 이동</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                      Ctrl + →
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">분석 시작</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                      Ctrl + Enter
                    </kbd>
                  </div>
                </CardContent>
              </Card>
                        </TabsContent>

            {/* 변수 선택 가이드 */}
            <TabsContent value="variables" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">변수 역할 이해하기</CardTitle>
                  <CardDescription>
                    통계 분석에서 변수는 역할에 따라 구분됩니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">종속변수 (Dependent Variable)</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>설명하려는 대상</strong> (결과, Y)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      예: 넙치 체중, 시험 점수, 수확량
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">독립변수 (Independent Variable)</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>설명에 사용하는 변수</strong> (원인, X)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      예: 사료 종류, 학습 시간, 비료량
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">요인 (Factor)</h4>
                    <p className="text-sm text-muted-foreground">
                      그룹을 구분하는 범주형 변수 (ANOVA, t-검정)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      예: 사료 종류 (A, B, C), 성별 (남/여)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">변수 타입 구분</CardTitle>
                  <CardDescription>
                    데이터의 성질에 따른 분류
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-semibold">연속형 (Continuous)</span>
                      <p className="text-xs text-muted-foreground">실수값 (예: 체중 150.5g)</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-semibold">범주형 (Categorical)</span>
                      <p className="text-xs text-muted-foreground">문자열 (예: 사료 종류 A, B, C)</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-semibold">이진형 (Binary)</span>
                      <p className="text-xs text-muted-foreground">2개 값 (예: 성별 남/여)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📚 전체 가이드 보기</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    통계 방법별 상세 변수 선택 가이드는 다음 문서를 참조하세요:
                  </p>
                  <a
                    href="/guides/VARIABLE_SELECTION_GUIDE.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    변수 선택 가이드 (전체 문서) →
                  </a>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 데이터 형식 가이드 */}
            <TabsContent value="data-format" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">지원 파일 형식</CardTitle>
                  <CardDescription>
                    업로드 가능한 데이터 형식
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">CSV (.csv)</span>
                    <span className="text-xs text-muted-foreground">⭐⭐⭐⭐⭐ 가장 권장</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Excel (.xlsx, .xls)</span>
                    <span className="text-xs text-muted-foreground">⭐⭐⭐⭐</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">SPSS (.sav)</span>
                    <span className="text-xs text-muted-foreground">⭐⭐⭐</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">TSV (.tsv)</span>
                    <span className="text-xs text-muted-foreground">⭐⭐⭐</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">데이터 구조: Wide vs Long</CardTitle>
                  <CardDescription>
                    통계 방법에 따라 다른 형식 필요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Wide Format (넓은 형식)</h4>
                    <p className="text-sm text-muted-foreground mb-1">
                      각 개체가 1개 행, 반복 측정은 여러 열
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      id, pre_score, post_score
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">
                      사용: 대응표본 t-검정, MANOVA
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Long Format (긴 형식)</h4>
                    <p className="text-sm text-muted-foreground mb-1">
                      각 측정값이 1개 행, 개체가 여러 행으로 반복
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      id, time_point, score
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">
                      사용: 반복측정 ANOVA, 혼합모형
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CSV 파일 작성 규칙</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm">✅ 첫 번째 행은 변수명 (필수)</span>
                  </div>
                  <div>
                    <span className="text-sm">✅ 인코딩은 UTF-8 (한글 사용 시)</span>
                  </div>
                  <div>
                    <span className="text-sm">✅ 변수명에 공백 사용 금지 → 언더스코어(_) 사용</span>
                  </div>
                  <div>
                    <span className="text-sm">✅ 결측치는 빈칸 또는 NA로 표시</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📚 전체 가이드 보기</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    데이터 형식, 결측치 처리, CSV 템플릿 등 상세 가이드:
                  </p>
                  <a
                    href="/guides/DATA_FORMAT_GUIDE.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    데이터 형식 가이드 (전체 문서) →
                  </a>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
