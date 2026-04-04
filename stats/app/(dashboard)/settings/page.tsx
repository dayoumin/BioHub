'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Palette, Star, Moon, Sun, Clock, HardDrive } from 'lucide-react'
import { STATISTICS_MENU } from '@/lib/statistics/menu-config'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { clearRecentStatistics, getRecentStatistics } from '@/lib/utils/recent-statistics'
import { StorageService } from '@/lib/services/storage-service'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentCount, setRecentCount] = useState<number>(0)
  // 알림 설정
  const [notifyAnalysisComplete, setNotifyAnalysisComplete] = useState<boolean>(true)
  const [notifyError, setNotifyError] = useState<boolean>(true)

  // localStorage에서 설정 로드
  useEffect(() => {
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            외관 및 알림
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
