/**
 * 설정 페이지
 *
 * 기능:
 * - 플로팅 챗봇 on/off
 * - 테마 설정 (향후 확장 가능)
 * - 데이터 관리 (채팅 내역 삭제 등)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MessageCircle,
  Trash2,
  AlertTriangle,
  Settings as SettingsIcon,
  Database,
} from 'lucide-react'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSettings } from '@/lib/types/chat'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function SettingsPage() {
  const [settings, setSettings] = useState<ChatSettings>({
    floatingButtonEnabled: true,
    theme: 'system',
  })
  const [isSaved, setIsSaved] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [storageSize, setStorageSize] = useState('0 KB')

  // 설정 및 통계 로드
  useEffect(() => {
    const loadedSettings = ChatStorage.loadSettings()
    setSettings(loadedSettings)

    const sessions = ChatStorage.loadSessions()
    setSessionCount(sessions.length)

    // LocalStorage 크기 계산
    const data = localStorage.getItem('rag-chat-sessions')
    if (data) {
      const sizeInKB = (data.length / 1024).toFixed(2)
      const sizeInMB = (data.length / 1024 / 1024).toFixed(2)
      setStorageSize(
        parseFloat(sizeInMB) >= 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`
      )
    }
  }, [])

  // 설정 저장
  const handleSaveSettings = useCallback(() => {
    ChatStorage.saveSettings(settings)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)

    // 페이지 새로고침 (플로팅 버튼 상태 반영)
    window.location.reload()
  }, [settings])

  // 플로팅 버튼 토글
  const handleToggleFloatingButton = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, floatingButtonEnabled: enabled }))
  }, [])

  // 모든 채팅 내역 삭제
  const handleClearAllData = useCallback(() => {
    ChatStorage.clearAll()
    setSessionCount(0)
    setStorageSize('0 KB')
  }, [])

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">설정</h1>
        </div>
        <p className="text-muted-foreground">
          AI 챗봇 및 플랫폼 설정을 관리하세요
        </p>
      </div>

      {/* 저장 완료 알림 */}
      {isSaved && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <AlertDescription className="text-green-800 dark:text-green-200">
            ✓ 설정이 저장되었습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* AI 챗봇 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            AI 챗봇 설정
          </CardTitle>
          <CardDescription>
            플로팅 챗봇 및 대화 관련 설정을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 플로팅 버튼 on/off */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="floating-button" className="text-base font-medium">
                플로팅 챗봇 버튼
              </Label>
              <p className="text-sm text-muted-foreground">
                화면 우하단에 고정된 챗봇 버튼을 표시합니다
              </p>
            </div>
            <Switch
              id="floating-button"
              checked={settings.floatingButtonEnabled}
              onCheckedChange={handleToggleFloatingButton}
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSaveSettings} className="w-full sm:w-auto">
              설정 저장
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 데이터 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터 관리
          </CardTitle>
          <CardDescription>
            저장된 채팅 데이터를 확인하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 통계 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">저장된 대화</p>
              <p className="text-2xl font-bold">{sessionCount}개</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">사용 중인 용량</p>
              <p className="text-2xl font-bold">{storageSize}</p>
            </div>
          </div>

          {/* 경고 메시지 */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              모든 데이터 삭제는 되돌릴 수 없습니다. 신중하게 선택하세요.
            </AlertDescription>
          </Alert>

          {/* 삭제 버튼 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                모든 채팅 내역 삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  모든 채팅 세션과 메시지가 영구적으로 삭제됩니다.
                  이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* 추가 정보 */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>💡 팁:</strong> 플로팅 챗봇은 일상적인 질문에 편리하게 사용할 수 있습니다.
            </p>
            <p>
              <strong>📝 참고:</strong> 더 많은 기능을 원하시면{' '}
              <a href="/chatbot" className="text-primary hover:underline font-medium">
                전용 챗봇 페이지
              </a>
              를 이용하세요.
            </p>
            <p>
              <strong>💾 저장 공간:</strong> LocalStorage는 최대 5MB까지 사용 가능합니다.
              용량 초과 시 오래된 대화가 자동으로 삭제됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
