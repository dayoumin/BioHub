'use client'

import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Monitor, ExternalLink, Settings2 } from 'lucide-react'
import { ChatStorage } from '@/lib/services/chat-storage'
import Link from 'next/link'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()

  // 플로팅 챗봇 버튼 설정
  const [floatingButtonEnabled, setFloatingButtonEnabled] = useState<boolean>(false)

  // 알림 설정
  const [notifyAnalysisComplete, setNotifyAnalysisComplete] = useState<boolean>(true)
  const [notifyError, setNotifyError] = useState<boolean>(true)

  // 로컬 저장 허용
  const [localStorageEnabled, setLocalStorageEnabled] = useState<boolean>(true)

  // 설정 로드
  useEffect(() => {
    // 플로팅 버튼 설정
    const chatSettings = ChatStorage.loadSettings()
    setFloatingButtonEnabled(chatSettings.floatingButtonEnabled)

    // 알림 설정
    const savedNotifyComplete = localStorage.getItem('statPlatform_notifyAnalysisComplete')
    if (savedNotifyComplete !== null) {
      setNotifyAnalysisComplete(savedNotifyComplete === 'true')
    }

    const savedNotifyError = localStorage.getItem('statPlatform_notifyError')
    if (savedNotifyError !== null) {
      setNotifyError(savedNotifyError === 'true')
    }

    // 로컬 저장 설정
    const savedLocalStorage = localStorage.getItem('statPlatform_localStorageEnabled')
    if (savedLocalStorage !== null) {
      setLocalStorageEnabled(savedLocalStorage === 'true')
    }
  }, [])

  // 플로팅 버튼 토글
  const handleFloatingButtonToggle = (enabled: boolean) => {
    setFloatingButtonEnabled(enabled)
    const settings = ChatStorage.loadSettings()
    settings.floatingButtonEnabled = enabled
    ChatStorage.saveSettings(settings)
    window.dispatchEvent(new CustomEvent('chatbot-settings-changed'))
  }

  // 알림 설정 변경
  const handleNotifyAnalysisComplete = (checked: boolean) => {
    setNotifyAnalysisComplete(checked)
    localStorage.setItem('statPlatform_notifyAnalysisComplete', String(checked))
  }

  const handleNotifyError = (checked: boolean) => {
    setNotifyError(checked)
    localStorage.setItem('statPlatform_notifyError', String(checked))
  }

  // 로컬 저장 설정 변경
  const handleLocalStorageToggle = (checked: boolean) => {
    setLocalStorageEnabled(checked)
    localStorage.setItem('statPlatform_localStorageEnabled', String(checked))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
          <DialogDescription>
            플랫폼 설정을 변경할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 테마 설정 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">테마</Label>
            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
              <div>
                <RadioGroupItem
                  value="light"
                  id="light"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Sun className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">라이트</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="dark"
                  id="dark"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Moon className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">다크</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="system"
                  id="system"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Monitor className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">시스템</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* 플로팅 챗봇 버튼 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">플로팅 챗봇 버튼</Label>
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Label htmlFor="floating-button" className="text-sm font-normal cursor-pointer">
                  화면 우측 하단에 챗봇 버튼 표시
                </Label>
                <p className="text-xs text-muted-foreground">
                  {floatingButtonEnabled
                    ? '플로팅 챗봇 버튼이 화면에 표시됩니다'
                    : '플로팅 챗봇 버튼이 숨겨집니다 (전용 페이지는 사용 가능)'}
                </p>
              </div>
              <Switch
                id="floating-button"
                checked={floatingButtonEnabled}
                onCheckedChange={handleFloatingButtonToggle}
              />
            </div>
          </div>

          <Separator />

          {/* 알림 설정 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">알림</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="analysis-complete" className="text-sm font-normal cursor-pointer">
                  분석 완료 시 알림
                </Label>
                <Switch
                  id="analysis-complete"
                  checked={notifyAnalysisComplete}
                  onCheckedChange={handleNotifyAnalysisComplete}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="error-notification" className="text-sm font-normal cursor-pointer">
                  에러 발생 시 알림
                </Label>
                <Switch
                  id="error-notification"
                  checked={notifyError}
                  onCheckedChange={handleNotifyError}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 데이터 설정 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">데이터</Label>
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Label htmlFor="local-storage" className="text-sm font-normal cursor-pointer">
                  로컬 저장 허용
                </Label>
                <p className="text-xs text-muted-foreground">
                  분석 기록 및 설정을 브라우저에 저장합니다
                </p>
              </div>
              <Switch
                id="local-storage"
                checked={localStorageEnabled}
                onCheckedChange={handleLocalStorageToggle}
              />
            </div>
          </div>

          <Separator />

          {/* 상세 설정 및 챗봇 페이지 */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false)
                window.location.href = '/settings'
              }}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              상세 설정 보기
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open('/chatbot', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              전용 챗봇 페이지 열기 (새 창)
            </Button>
            <p className="text-xs text-muted-foreground">
              상세 설정에서 RAG 모델, Vector DB 등 고급 기능을 설정할 수 있습니다.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
