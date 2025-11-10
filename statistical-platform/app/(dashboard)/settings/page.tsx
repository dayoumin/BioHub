'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Palette, Bot, Database, Star, Moon, Sun, Clock } from 'lucide-react'
import { STATISTICS_MENU } from '@/lib/statistics/menu-config'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ChatStorage } from '@/lib/services/chat-storage'
import { clearRecentStatistics, getRecentStatistics } from '@/lib/utils/recent-statistics'

export default function SettingsPage() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentCount, setRecentCount] = useState<number>(0)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [chatbotModel, setChatbotModel] = useState<string>('llama3.2')
  const [vectorDb, setVectorDb] = useState<string>('chromadb')
  const [floatingButtonEnabled, setFloatingButtonEnabled] = useState<boolean>(true)

  // localStorage에서 설정 로드
  useEffect(() => {
    // 즐겨찾기 로드
    const savedFavorites = localStorage.getItem('statPlatform_favorites')
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (error) {
        console.error('Failed to load favorites:', error)
      }
    }

    // 테마 로드
    const savedTheme = localStorage.getItem('statPlatform_theme') as 'light' | 'dark' | 'system' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }

    // 챗봇 모델 로드
    const savedModel = localStorage.getItem('statPlatform_chatbotModel')
    if (savedModel) {
      setChatbotModel(savedModel)
    }

    // Vector DB 로드
    const savedDb = localStorage.getItem('statPlatform_vectorDb')
    if (savedDb) {
      setVectorDb(savedDb)
    }

    // 플로팅 버튼 설정 로드
    const chatSettings = ChatStorage.loadSettings()
    setFloatingButtonEnabled(chatSettings.floatingButtonEnabled)

    // 최근 사용 목록 개수 로드
    const recentItems = getRecentStatistics()
    setRecentCount(recentItems.length)
  }, [])

  // 모든 아이템 ID 가져오기
  const allItemIds = STATISTICS_MENU.flatMap((category) =>
    category.items.map((item) => item.id)
  )

  // 테마 변경 핸들러
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('statPlatform_theme', newTheme)

    // 실제 테마 적용 로직 (준비 중)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // system: 브라우저 설정 따라가기
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  // 챗봇 모델 변경 핸들러
  const handleModelChange = (model: string) => {
    setChatbotModel(model)
    localStorage.setItem('statPlatform_chatbotModel', model)
  }

  // Vector DB 변경 핸들러
  const handleDbChange = (db: string) => {
    setVectorDb(db)
    localStorage.setItem('statPlatform_vectorDb', db)
  }

  // 플로팅 버튼 토글 핸들러
  const handleFloatingButtonToggle = (enabled: boolean) => {
    setFloatingButtonEnabled(enabled)
    const settings = ChatStorage.loadSettings()
    settings.floatingButtonEnabled = enabled
    ChatStorage.saveSettings(settings)

    // 페이지 새로고침 없이 즉시 반영되도록 window 이벤트 발생
    window.dispatchEvent(new CustomEvent('chatbot-settings-changed'))
  }

  // 최근 사용 목록 초기화 핸들러
  const handleClearRecent = () => {
    clearRecentStatistics()
    setRecentCount(0)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">설정</h1>
        <p className="text-muted-foreground">
          애플리케이션 설정을 관리하세요
        </p>
      </div>

      {/* 탭 기반 설정 UI */}
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            외관
          </TabsTrigger>
          <TabsTrigger value="chatbot">
            <Bot className="h-4 w-4 mr-2" />
            챗봇
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            데이터베이스
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-4 w-4 mr-2" />
            즐겨찾기
          </TabsTrigger>
        </TabsList>

        {/* 외관 설정 */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>테마 설정</CardTitle>
              <CardDescription>
                애플리케이션의 색상 테마를 변경하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="theme">테마 모드</Label>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="테마 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <span>라이트 모드</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        <span>다크 모드</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>시스템 설정 따르기</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  현재 설정: <strong>{theme === 'light' ? '라이트' : theme === 'dark' ? '다크' : '시스템 자동'}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 챗봇 설정 */}
        <TabsContent value="chatbot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>플로팅 챗봇 버튼</CardTitle>
              <CardDescription>
                화면 우측 하단의 플로팅 챗봇 버튼 표시 여부를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="floating-button" className="text-base font-medium">
                    플로팅 버튼 표시
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {floatingButtonEnabled
                      ? '플로팅 챗봇 버튼이 화면에 표시됩니다'
                      : '플로팅 챗봇 버튼이 숨겨집니다'}
                  </p>
                </div>
                <Switch
                  id="floating-button"
                  checked={floatingButtonEnabled}
                  onCheckedChange={handleFloatingButtonToggle}
                />
              </div>

              {!floatingButtonEnabled && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm">
                    <strong>안내:</strong> 플로팅 버튼을 다시 켜려면 이 설정을 활성화하세요. 챗봇 전용 페이지는 여전히 사용할 수 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI 챗봇 설정</CardTitle>
              <CardDescription>
                챗봇에 사용할 AI 모델을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="model">AI 모델</Label>
                <Select value={chatbotModel} onValueChange={handleModelChange}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="모델 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama3.2">Llama 3.2 (추천)</SelectItem>
                    <SelectItem value="llama3.1">Llama 3.1</SelectItem>
                    <SelectItem value="mistral">Mistral</SelectItem>
                    <SelectItem value="gemma">Gemma</SelectItem>
                    <SelectItem value="phi">Phi-3</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  현재 모델: <strong>{chatbotModel}</strong>
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  <strong>참고:</strong> AI 챗봇 기능은 준비 중입니다. 모델 설정은 챗봇 기능 출시 후 적용됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 데이터베이스 설정 */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vector 데이터베이스 설정</CardTitle>
              <CardDescription>
                RAG 시스템에 사용할 Vector DB를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="vectordb">Vector DB 종류</Label>
                <Select value={vectorDb} onValueChange={handleDbChange}>
                  <SelectTrigger id="vectordb">
                    <SelectValue placeholder="DB 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chromadb">ChromaDB (추천)</SelectItem>
                    <SelectItem value="faiss">FAISS</SelectItem>
                    <SelectItem value="pinecone">Pinecone</SelectItem>
                    <SelectItem value="qdrant">Qdrant</SelectItem>
                    <SelectItem value="weaviate">Weaviate</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  현재 DB: <strong>{vectorDb}</strong>
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  <strong>참고:</strong> Vector DB 설정은 RAG 시스템에서 사용됩니다. 변경 시 챗봇 응답 품질에 영향을 줄 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 즐겨찾기 관리 */}
        <TabsContent value="favorites" className="space-y-4">
          {/* 즐겨찾기 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>즐겨찾기 관리</CardTitle>
              <CardDescription>
                통계 분석 즐겨찾기를 일괄 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">현재 즐겨찾기</p>
                  <p className="text-sm text-muted-foreground">
                    {favorites.length}개의 통계 분석
                  </p>
                </div>
                <div className="text-3xl font-bold text-primary">
                  {favorites.length}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setFavorites(allItemIds)
                    localStorage.setItem('statPlatform_favorites', JSON.stringify(allItemIds))
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  모든 통계를 즐겨찾기에 추가 ({allItemIds.length}개)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setFavorites([])
                    localStorage.setItem('statPlatform_favorites', JSON.stringify([]))
                  }}
                  disabled={favorites.length === 0}
                >
                  모든 즐겨찾기 해제
                </Button>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm">
                  <strong>참고:</strong> 개별 통계의 즐겨찾기는 통계분석 페이지에서 별표(⭐) 아이콘을 클릭하여 관리할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 최근 사용 목록 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 사용한 분석 관리</CardTitle>
              <CardDescription>
                최근 방문한 통계 분석 목록을 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">최근 사용 목록</p>
                  <p className="text-sm text-muted-foreground">
                    최대 5개까지 저장됩니다
                  </p>
                </div>
                <div className="text-3xl font-bold text-primary">
                  {recentCount}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleClearRecent}
                disabled={recentCount === 0}
              >
                <Clock className="h-4 w-4 mr-2" />
                최근 사용 목록 초기화
              </Button>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  <strong>참고:</strong> 최근 사용 목록은 통계 페이지를 방문할 때 자동으로 추가되며, 대시보드에서 빠르게 재접근할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
