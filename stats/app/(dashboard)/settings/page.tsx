'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Palette, Star, Moon, Sun, Clock, HardDrive, FileText } from 'lucide-react'
import { STATISTICS_MENU } from '@/lib/statistics/menu-config'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { clearRecentStatistics, getRecentStatistics } from '@/lib/utils/recent-statistics'
import { StorageService } from '@/lib/services/storage-service'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import {
  DEFAULT_DOCUMENT_WRITER_SETTINGS,
  useSettingsStore,
  type DocumentWriterProviderSetting,
  type DocumentWriterQuality,
  type DocumentWriterSectionId,
  type DocumentWriterSettings,
} from '@/lib/stores/settings-store'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [isThemeMounted, setIsThemeMounted] = useState(false)
  const documentWriterSettings = useSettingsStore((state) => state.documentWriterSettings)
  const setDocumentWriterSettings = useSettingsStore((state) => state.setDocumentWriterSettings)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentCount, setRecentCount] = useState<number>(0)
  // 알림 설정
  const [notifyAnalysisComplete, setNotifyAnalysisComplete] = useState<boolean>(true)
  const [notifyError, setNotifyError] = useState<boolean>(true)

  // localStorage에서 설정 로드
  useEffect(() => {
    setIsThemeMounted(true)

    // 즐겨찾기 로드
    const savedFavorites = StorageService.getItem(STORAGE_KEYS.settings.favorites)
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (error) {
        console.error('Failed to load favorites:', error)
      }
    }

    // 알림 설정 로드
    const savedNotifyComplete = StorageService.getItem(STORAGE_KEYS.settings.notifyAnalysisComplete)
    if (savedNotifyComplete !== null) {
      setNotifyAnalysisComplete(savedNotifyComplete === 'true')
    }

    const savedNotifyError = StorageService.getItem(STORAGE_KEYS.settings.notifyError)
    if (savedNotifyError !== null) {
      setNotifyError(savedNotifyError === 'true')
    }

    // 최근 사용 목록 개수 로드
    const recentItems = getRecentStatistics()
    setRecentCount(recentItems.length)
  }, [])

  // 모든 아이템 ID 가져오기
  const allItemIds = STATISTICS_MENU.flatMap((category) =>
    category.items.map((item) => item.id)
  )

  // 최근 사용 목록 초기화 핸들러
  const handleClearRecent = () => {
    clearRecentStatistics()
    setRecentCount(0)
  }

  // 알림 설정 변경 핸들러
  const handleNotifyAnalysisComplete = (checked: boolean) => {
    setNotifyAnalysisComplete(checked)
    StorageService.setItem(STORAGE_KEYS.settings.notifyAnalysisComplete, String(checked))
  }

  const handleNotifyError = (checked: boolean) => {
    setNotifyError(checked)
    StorageService.setItem(STORAGE_KEYS.settings.notifyError, String(checked))
  }

  const writerSettings = documentWriterSettings ?? DEFAULT_DOCUMENT_WRITER_SETTINGS
  const selectedTheme = isThemeMounted ? (theme ?? 'system') : 'system'
  const themeLabel = selectedTheme === 'light'
    ? '라이트'
    : selectedTheme === 'dark'
      ? '다크'
      : '시스템 자동'

  const updateDocumentWriterSettings = (next: DocumentWriterSettings) => {
    setDocumentWriterSettings(next)
  }

  const handleDefaultWriterProviderChange = (provider: DocumentWriterProviderSetting) => {
    updateDocumentWriterSettings({
      ...writerSettings,
      defaultProvider: provider,
    })
  }

  const handleWriterQualityChange = (quality: DocumentWriterQuality) => {
    updateDocumentWriterSettings({
      ...writerSettings,
      quality,
    })
  }

  const handleSectionWriterProviderChange = (
    sectionId: DocumentWriterSectionId,
    provider: DocumentWriterProviderSetting,
  ) => {
    updateDocumentWriterSettings({
      ...writerSettings,
      sectionOverrides: {
        ...writerSettings.sectionOverrides,
        [sectionId]: {
          ...writerSettings.sectionOverrides[sectionId],
          provider,
        },
      },
    })
  }

  const handleSectionWriterQualityChange = (
    sectionId: DocumentWriterSectionId,
    quality: DocumentWriterQuality | 'inherit',
  ) => {
    const currentOverride = writerSettings.sectionOverrides[sectionId] ?? {}
    const nextOverride = { ...currentOverride }
    if (quality === 'inherit') {
      const { quality: _removedQuality, ...rest } = nextOverride
      void _removedQuality
      updateDocumentWriterSettings({
        ...writerSettings,
        sectionOverrides: {
          ...writerSettings.sectionOverrides,
          [sectionId]: rest,
        },
      })
      return
    }

    updateDocumentWriterSettings({
      ...writerSettings,
      sectionOverrides: {
        ...writerSettings.sectionOverrides,
        [sectionId]: {
          ...currentOverride,
          quality,
        },
      },
    })
  }

  const writerSections: Array<{ id: DocumentWriterSectionId; label: string; help: string }> = [
    { id: 'introduction', label: '서론', help: '배경, 연구 공백, 목적 정리' },
    { id: 'methods', label: '재료 및 방법', help: '재현 가능한 방법 서술' },
    { id: 'results', label: '결과', help: '분석 결과 중심의 보수적 서술' },
    { id: 'discussion', label: '고찰', help: '문헌 비교, 해석, 한계' },
    { id: 'conclusion', label: '결론', help: '핵심 결론과 시사점' },
    { id: 'custom', label: '사용자 섹션', help: '사용자 정의 목차/섹션' },
  ]

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
          <TabsTrigger value="data">
            <HardDrive className="h-4 w-4 mr-2" />
            데이터
          </TabsTrigger>
          <TabsTrigger value="writing">
            <FileText className="h-4 w-4 mr-2" />
            자료 작성
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
                <Select value={selectedTheme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
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
                  현재 설정: <strong>{themeLabel}</strong>
                </p>
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

        {/* 데이터 설정 */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>데이터 관리</CardTitle>
              <CardDescription>
                브라우저에 저장된 앱 데이터를 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">저장된 데이터</p>
                  <p className="text-sm text-muted-foreground">
                    설정, 분석 캐시, Smart Flow 상태 등
                  </p>
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  if (confirm('모든 저장된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    // localStorage 삭제
                    localStorage.clear()
                    // sessionStorage 삭제
                    sessionStorage.clear()
                    // IndexedDB 삭제 (지원하는 브라우저만)
                    try {
                      if (typeof window.indexedDB.databases === 'function') {
                        const databases = await window.indexedDB.databases()
                        for (const db of databases) {
                          if (db.name) {
                            window.indexedDB.deleteDatabase(db.name)
                          }
                        }
                      }
                    } catch (e) {
                      console.warn('[Settings] IndexedDB cleanup failed:', e)
                    }
                    window.location.reload()
                  }
                }}
              >
                모든 데이터 삭제
              </Button>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm">
                  <strong>주의:</strong> 삭제 시 모든 설정이 기본값으로 초기화되고, 분석 캐시와 즐겨찾기가 삭제됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="writing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>자료 작성 방식 설정</CardTitle>
              <CardDescription>
                논문/보고서 섹션을 템플릿, API, 로컬 모델 중 어떤 방식으로 작성할지 정합니다. 실패하면 안전하게 템플릿 초안으로 돌아갑니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="writer-default-provider">기본 작성 방식</Label>
                  <Select
                    value={writerSettings.defaultProvider}
                    onValueChange={(value) => handleDefaultWriterProviderChange(value as DocumentWriterProviderSetting)}
                  >
                    <SelectTrigger id="writer-default-provider">
                      <SelectValue placeholder="작성 방식 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">기존 전역 LLM 설정 따름</SelectItem>
                      <SelectItem value="api">API 우선, 실패 시 로컬/템플릿</SelectItem>
                      <SelectItem value="local-model">로컬 우선, 실패 시 API/템플릿</SelectItem>
                      <SelectItem value="template">템플릿만 사용</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    전역 설정은 기존 추천/해석 LLM 설정을 그대로 사용합니다. API나 로컬이 준비되지 않으면 템플릿 초안을 사용합니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="writer-quality">기본 작성 품질</Label>
                  <Select
                    value={writerSettings.quality}
                    onValueChange={(value) => handleWriterQualityChange(value as DocumentWriterQuality)}
                  >
                    <SelectTrigger id="writer-quality">
                      <SelectValue placeholder="품질 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">빠르게</SelectItem>
                      <SelectItem value="balanced">균형</SelectItem>
                      <SelectItem value="careful">정교하게</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    정교하게는 더 긴 context와 token을 사용하고, 빠르게는 짧은 초안에 적합합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">섹션별 작성 방식</Label>
                  <p className="text-sm text-muted-foreground">
                    기본값을 따르거나, 고찰은 API 우선·결과는 템플릿처럼 섹션마다 다르게 지정할 수 있습니다.
                  </p>
                </div>
                <div className="space-y-3">
                  {writerSections.map((section) => {
                    const override = writerSettings.sectionOverrides[section.id]
                    const followsDefaultProvider = !override?.provider || override.provider === 'global'
                    const followsDefaultQuality = !override?.quality
                    return (
                      <div key={section.id} className="grid gap-3 rounded-lg bg-muted/30 p-4 md:grid-cols-[1fr_180px_160px] md:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{section.label}</p>
                            {followsDefaultProvider && followsDefaultQuality && (
                              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                                기본값 따름
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{section.help}</p>
                        </div>
                        <Select
                          value={override?.provider ?? 'global'}
                          onValueChange={(value) => handleSectionWriterProviderChange(section.id, value as DocumentWriterProviderSetting)}
                        >
                          <SelectTrigger aria-label={`${section.label} 작성 방식`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="global">기본 작성 방식 따름</SelectItem>
                            <SelectItem value="api">API 우선</SelectItem>
                            <SelectItem value="local-model">로컬 우선</SelectItem>
                            <SelectItem value="template">템플릿만</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={override?.quality ?? 'inherit'}
                          onValueChange={(value) => handleSectionWriterQualityChange(section.id, value as DocumentWriterQuality | 'inherit')}
                        >
                          <SelectTrigger aria-label={`${section.label} 작성 품질`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">기본 품질 따름</SelectItem>
                            <SelectItem value="fast">빠르게</SelectItem>
                            <SelectItem value="balanced">균형</SelectItem>
                            <SelectItem value="careful">정교하게</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => updateDocumentWriterSettings(DEFAULT_DOCUMENT_WRITER_SETTINGS)}
              >
                자료 작성 설정 초기화
              </Button>
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
                    StorageService.setItem(STORAGE_KEYS.settings.favorites, JSON.stringify(allItemIds))
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
                    StorageService.setItem(STORAGE_KEYS.settings.favorites, JSON.stringify([]))
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
