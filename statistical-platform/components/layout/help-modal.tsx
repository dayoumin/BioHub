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
import { BookOpen, HelpCircle, Keyboard } from 'lucide-react'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>도움말</DialogTitle>
          <DialogDescription>
            NIFS 통계 분석 플랫폼 사용 가이드
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
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
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
