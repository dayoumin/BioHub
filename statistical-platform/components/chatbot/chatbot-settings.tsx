/**
 * ChatbotSettings - 설정 팝업 모달
 *
 * 기능:
 * - 플로팅 버튼 활성화/비활성화
 * - 테마 선택 (light/dark/system)
 * - 설정 저장/취소
 * - 중앙 팝업 레이아웃
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Moon, Sun, Settings as SettingsIcon } from 'lucide-react'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSettings } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

interface ChatbotSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatbotSettings({ isOpen, onClose }: ChatbotSettingsProps) {
  const [settings, setSettings] = useState<ChatSettings>({
    floatingButtonEnabled: true,
    theme: 'system',
  })
  const [hasChanges, setHasChanges] = useState(false)

  // 설정 로드
  useEffect(() => {
    if (isOpen) {
      const savedSettings = ChatStorage.loadSettings()
      setSettings(savedSettings)
      setHasChanges(false)
    }
  }, [isOpen])

  // 설정 변경 핸들러
  const handleToggleButton = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      floatingButtonEnabled: !prev.floatingButtonEnabled,
    }))
    setHasChanges(true)
  }, [])

  const handleThemeChange = useCallback((theme: 'light' | 'dark' | 'system') => {
    setSettings((prev) => ({
      ...prev,
      theme,
    }))
    setHasChanges(true)
  }, [])

  // 저장 핸들러
  const handleSave = useCallback(() => {
    ChatStorage.saveSettings(settings)

    // 설정 변경 이벤트 발송 (FloatingChatbot에서 감지)
    window.dispatchEvent(new Event('chatbot-settings-changed'))

    setHasChanges(false)
    onClose()
  }, [settings, onClose])

  // 취소 핸들러
  const handleCancel = useCallback(() => {
    setHasChanges(false)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* 설정 팝업 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className={cn(
          'fixed z-50 bg-background border rounded-lg shadow-2xl',
          'w-full max-w-sm mx-auto',
          'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          'max-md:max-w-[90vw] max-md:w-[90vw]',
          'flex flex-col'
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <h3 id="settings-title" className="font-semibold text-lg">
              설정
            </h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleCancel}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 플로팅 버튼 설정 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">플로팅 버튼</label>
            <p className="text-xs text-muted-foreground mb-3">
              화면 우하단의 AI 도우미 버튼을 표시할지 선택합니다.
            </p>
            <Button
              variant={settings.floatingButtonEnabled ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={handleToggleButton}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  'h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  settings.floatingButtonEnabled
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground'
                )}>
                  {settings.floatingButtonEnabled && (
                    <div className="h-2 w-2 bg-primary-foreground rounded-full" />
                  )}
                </div>
                <span className="flex-1 text-left">
                  플로팅 버튼 {settings.floatingButtonEnabled ? '활성화' : '비활성화'}
                </span>
              </div>
            </Button>
          </div>

          {/* 테마 설정 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">테마</label>
            <p className="text-xs text-muted-foreground mb-3">
              챗봇의 색상 테마를 선택합니다.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {/* 라이트 테마 */}
              <Button
                variant={settings.theme === 'light' ? 'default' : 'outline'}
                className="h-auto flex flex-col gap-2 py-3"
                onClick={() => handleThemeChange('light')}
              >
                <Sun className="h-4 w-4" />
                <span className="text-xs">라이트</span>
              </Button>

              {/* 다크 테마 */}
              <Button
                variant={settings.theme === 'dark' ? 'default' : 'outline'}
                className="h-auto flex flex-col gap-2 py-3"
                onClick={() => handleThemeChange('dark')}
              >
                <Moon className="h-4 w-4" />
                <span className="text-xs">다크</span>
              </Button>

              {/* 시스템 테마 */}
              <Button
                variant={settings.theme === 'system' ? 'default' : 'outline'}
                className="h-auto flex flex-col gap-2 py-3"
                onClick={() => handleThemeChange('system')}
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="text-xs">시스템</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex gap-2 p-6 border-t bg-muted/30">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            저장
          </Button>
        </div>
      </div>
    </>
  )
}
