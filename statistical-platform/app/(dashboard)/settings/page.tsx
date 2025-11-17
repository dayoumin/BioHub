'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Palette, Bot, Database, Star, Moon, Sun, Clock, Bell, HardDrive } from 'lucide-react'
import { STATISTICS_MENU } from '@/lib/statistics/menu-config'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { ChatStorage } from '@/lib/services/chat-storage'
import { clearRecentStatistics, getRecentStatistics } from '@/lib/utils/recent-statistics'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentCount, setRecentCount] = useState<number>(0)
  const [chatbotModel, setChatbotModel] = useState<string>('llama3.2')
  const [vectorDb, setVectorDb] = useState<string>('chromadb')
  const [floatingButtonEnabled, setFloatingButtonEnabled] = useState<boolean>(true)

  // RAG 설정
  const [ollamaEndpoint, setOllamaEndpoint] = useState<string>('http://localhost:11434')
  const [embeddingModel, setEmbeddingModel] = useState<string>('nomic-embed-text')
  const [inferenceModel, setInferenceModel] = useState<string>('qwen3:4b-q4_K_M')
  const [topK, setTopK] = useState<number>(5)

  // 알림 설정
  const [notifyAnalysisComplete, setNotifyAnalysisComplete] = useState<boolean>(true)
  const [notifyError, setNotifyError] = useState<boolean>(true)

  // 로컬 저장 허용
  const [localStorageEnabled, setLocalStorageEnabled] = useState<boolean>(true)

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

    // RAG 설정 로드
    const savedOllamaEndpoint = localStorage.getItem('statPlatform_ollamaEndpoint')
    if (savedOllamaEndpoint) {
      setOllamaEndpoint(savedOllamaEndpoint)
    }

    const savedEmbeddingModel = localStorage.getItem('statPlatform_embeddingModel')
    if (savedEmbeddingModel) {
      setEmbeddingModel(savedEmbeddingModel)
    }

    const savedInferenceModel = localStorage.getItem('statPlatform_inferenceModel')
    if (savedInferenceModel) {
      setInferenceModel(savedInferenceModel)
    }

    const savedTopK = localStorage.getItem('statPlatform_topK')
    if (savedTopK) {
      setTopK(parseInt(savedTopK, 10))
    }

    // 알림 설정 로드
    const savedNotifyComplete = localStorage.getItem('statPlatform_notifyAnalysisComplete')
    if (savedNotifyComplete !== null) {
      setNotifyAnalysisComplete(savedNotifyComplete === 'true')
    }

    const savedNotifyError = localStorage.getItem('statPlatform_notifyError')
    if (savedNotifyError !== null) {
      setNotifyError(savedNotifyError === 'true')
    }

    // 로컬 저장 설정 로드
    const savedLocalStorage = localStorage.getItem('statPlatform_localStorageEnabled')
    if (savedLocalStorage !== null) {
      setLocalStorageEnabled(savedLocalStorage === 'true')
    }

    // 최근 사용 목록 개수 로드
    const recentItems = getRecentStatistics()
    setRecentCount(recentItems.length)
  }, [])

  // 모든 아이템 ID 가져오기
  const allItemIds = STATISTICS_MENU.flatMap((category) =>
    category.items.map((item) => item.id)
  )

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

  // RAG 설정 변경 핸들러
  const handleOllamaEndpointChange = (value: string) => {
    setOllamaEndpoint(value)
    localStorage.setItem('statPlatform_ollamaEndpoint', value)
  }

  const handleEmbeddingModelChange = (value: string) => {
    setEmbeddingModel(value)
    localStorage.setItem('statPlatform_embeddingModel', value)
  }

  const handleInferenceModelChange = (value: string) => {
    setInferenceModel(value)
    localStorage.setItem('statPlatform_inferenceModel', value)
  }

  const handleTopKChange = (value: number[]) => {
    const newValue = value[0]
    setTopK(newValue)
    localStorage.setItem('statPlatform_topK', String(newValue))
  }

  // 알림 설정 변경 핸들러
  const handleNotifyAnalysisComplete = (checked: boolean) => {
    setNotifyAnalysisComplete(checked)
    localStorage.setItem('statPlatform_notifyAnalysisComplete', String(checked))
  }

  const handleNotifyError = (checked: boolean) => {
    setNotifyError(checked)
    localStorage.setItem('statPlatform_notifyError', String(checked))
  }

  // 로컬 저장 설정 변경 핸들러
  const handleLocalStorageToggle = (checked: boolean) => {
    setLocalStorageEnabled(checked)
    localStorage.setItem('statPlatform_localStorageEnabled', String(checked))
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
            외관 및 알림
          </TabsTrigger>
          <TabsTrigger value="rag">
            <Bot className="h-4 w-4 mr-2" />
            AI 챗봇 (RAG)
          </TabsTrigger>
          <TabsTrigger value="data">
            <HardDrive className="h-4 w-4 mr-2" />
            데이터
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-4 w-4 mr-2" />
            즐겨찾기
          </TabsTrigger>
        </TabsList>

        {/* 외관 및 알림 설정 */}
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
                <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
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
                  <Label htmlFor="floating-button-page" className="text-base font-medium">
                    플로팅 버튼 표시
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {floatingButtonEnabled
                      ? '플로팅 챗봇 버튼이 화면에 표시됩니다'
                      : '플로팅 챗봇 버튼이 숨겨집니다'}
                  </p>
                </div>
                <Switch
                  id="floating-button-page"
                  checked={floatingButtonEnabled}
                  onCheckedChange={handleFloatingButtonToggle}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>
                분석 완료 및 에러 발생 시 알림을 받을 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="notify-complete" className="text-base font-medium">
                    분석 완료 시 알림
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    통계 분석이 완료되면 브라우저 알림을 표시합니다
                  </p>
                </div>
                <Switch
                  id="notify-complete"
                  checked={notifyAnalysisComplete}
                  onCheckedChange={handleNotifyAnalysisComplete}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="notify-error" className="text-base font-medium">
                    에러 발생 시 알림
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    분석 중 에러가 발생하면 브라우저 알림을 표시합니다
                  </p>
                </div>
                <Switch
                  id="notify-error"
                  checked={notifyError}
                  onCheckedChange={handleNotifyError}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  <strong>참고:</strong> 브라우저 알림을 받으려면 브라우저 설정에서 알림 권한을 허용해야 합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RAG 설정 */}
        <TabsContent value="rag" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ollama 엔드포인트</CardTitle>
              <CardDescription>
                로컬 또는 원격 Ollama 서버 주소를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="ollama-endpoint">Ollama 서버 주소</Label>
                <Input
                  id="ollama-endpoint"
                  type="url"
                  value={ollamaEndpoint}
                  onChange={(e) => handleOllamaEndpointChange(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <p className="text-sm text-muted-foreground">
                  기본값: <code className="bg-muted px-1 py-0.5 rounded">http://localhost:11434</code>
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm">
                  <strong>참고:</strong> Ollama 서버가 실행 중이어야 RAG 챗봇을 사용할 수 있습니다.
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Ollama 다운로드
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>임베딩 모델</CardTitle>
              <CardDescription>
                문서 검색에 사용할 임베딩 모델을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="embedding-model">임베딩 모델</Label>
                <Select value={embeddingModel} onValueChange={handleEmbeddingModelChange}>
                  <SelectTrigger id="embedding-model">
                    <SelectValue placeholder="모델 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nomic-embed-text">nomic-embed-text (274MB, 추천)</SelectItem>
                    <SelectItem value="mxbai-embed-large">mxbai-embed-large (669MB)</SelectItem>
                    <SelectItem value="ZimaBlueAI/Qwen3-Embedding-0.6B:f16">Qwen3-Embedding (1.2GB, 더 정확)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  현재 모델: <strong>{embeddingModel}</strong>
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  <strong>모델 설치:</strong> <code className="bg-muted px-1 py-0.5 rounded">ollama pull {embeddingModel}</code>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>추론 모델 (채팅)</CardTitle>
              <CardDescription>
                챗봇 응답 생성에 사용할 LLM 모델을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="inference-model">추론 모델</Label>
                <Select value={inferenceModel} onValueChange={handleInferenceModelChange}>
                  <SelectTrigger id="inference-model">
                    <SelectValue placeholder="모델 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwen3:4b-q4_K_M">Qwen3 4B (2.6GB, 한국어 우수, 추천)</SelectItem>
                    <SelectItem value="deepseek-r1:7b">DeepSeek R1 7B (4.7GB, 추론 능력 우수)</SelectItem>
                    <SelectItem value="exaone-deep">EXAONE Deep (4.8GB, 한국어 특화)</SelectItem>
                    <SelectItem value="llama3.2">Llama 3.2 (2GB)</SelectItem>
                    <SelectItem value="gemma">Gemma (1.7GB)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  현재 모델: <strong>{inferenceModel}</strong>
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  <strong>모델 설치:</strong> <code className="bg-muted px-1 py-0.5 rounded">ollama pull {inferenceModel}</code>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>검색 설정</CardTitle>
              <CardDescription>
                RAG 시스템의 검색 결과 개수를 조절하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="top-k">Top-K 검색 결과 수</Label>
                  <span className="text-sm font-medium">{topK}개</span>
                </div>
                <Slider
                  id="top-k"
                  min={1}
                  max={10}
                  step={1}
                  value={[topK]}
                  onValueChange={handleTopKChange}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  검색 결과가 많을수록 더 많은 문맥을 참고하지만, 응답 시간이 길어질 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 데이터 설정 */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>로컬 저장 설정</CardTitle>
              <CardDescription>
                브라우저에 데이터를 저장할지 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="local-storage-page" className="text-base font-medium">
                    로컬 저장 허용
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    분석 기록, 설정, 즐겨찾기 등을 브라우저에 저장합니다
                  </p>
                </div>
                <Switch
                  id="local-storage-page"
                  checked={localStorageEnabled}
                  onCheckedChange={handleLocalStorageToggle}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  <strong>참고:</strong> 로컬 저장을 비활성화하면 브라우저를 닫을 때 모든 설정과 기록이 삭제됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vector 데이터베이스</CardTitle>
              <CardDescription>
                RAG 시스템에서 사용하는 Vector DB 정보
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>현재 사용 중인 Vector DB</Label>
                <div className="p-4 border rounded-lg bg-muted">
                  <p className="text-sm font-medium">로컬 파일 시스템 (IndexedDB)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    브라우저 내장 IndexedDB를 사용하여 벡터 임베딩을 저장합니다
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm">
                  <strong>참고:</strong> 웹 플랫폼이므로 Vector DB는 브라우저 IndexedDB를 사용합니다.
                  외부 Vector DB(ChromaDB, FAISS 등)는 데스크탑 앱 버전에서 지원됩니다.
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
