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
import { Moon, Sun, Monitor, Settings2 } from 'lucide-react'
import { StorageService } from '@/lib/services/storage-service'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { LanguageSwitcher } from '@/components/terminology/LanguageSwitcher'
import { DomainSwitcher } from '@/components/terminology/DomainSwitcher'
import { useAppPreferences } from '@/hooks/use-app-preferences'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const UI_TEXT = {
  ko: {
    title: '설정',
    description: '플랫폼 설정을 변경할 수 있습니다',
    theme: '테마',
    light: '라이트',
    dark: '다크',
    system: '시스템',
    languageAndTerminology: '언어 및 용어',
    languageAndTerminologyHelp: 'UI 언어와 도메인별 전문 용어를 각각 분리해서 설정합니다.',
    notifications: '알림',
    notifyAnalysisComplete: '분석 완료 시 알림',
    notifyError: '에러 발생 시 알림',
    advancedSettings: '상세 설정 보기',
    advancedSettingsHelp: '상세 설정에서 고급 기능을 설정할 수 있습니다.',
  },
  en: {
    title: 'Settings',
    description: 'Change platform preferences and behavior.',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    languageAndTerminology: 'Language & Terminology',
    languageAndTerminologyHelp: 'Configure UI language and domain-specific terminology independently.',
    notifications: 'Notifications',
    notifyAnalysisComplete: 'Notify when analysis completes',
    notifyError: 'Notify on errors',
    advancedSettings: 'Open advanced settings',
    advancedSettingsHelp: 'Use advanced settings to configure more detailed options.',
  },
} as const

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { currentLanguage } = useAppPreferences()
  const text = UI_TEXT[currentLanguage]

  // 알림 설정
  const [notifyAnalysisComplete, setNotifyAnalysisComplete] = useState<boolean>(true)
  const [notifyError, setNotifyError] = useState<boolean>(true)

  // 설정 로드
  useEffect(() => {
    // 알림 설정
    const savedNotifyComplete = StorageService.getItem(STORAGE_KEYS.settings.notifyAnalysisComplete)
    if (savedNotifyComplete !== null) {
      setNotifyAnalysisComplete(savedNotifyComplete === 'true')
    }

    const savedNotifyError = StorageService.getItem(STORAGE_KEYS.settings.notifyError)
    if (savedNotifyError !== null) {
      setNotifyError(savedNotifyError === 'true')
    }
  }, [])

  // 알림 설정 변경
  const handleNotifyAnalysisComplete = (checked: boolean) => {
    setNotifyAnalysisComplete(checked)
    StorageService.setItem(STORAGE_KEYS.settings.notifyAnalysisComplete, String(checked))
  }

  const handleNotifyError = (checked: boolean) => {
    setNotifyError(checked)
    StorageService.setItem(STORAGE_KEYS.settings.notifyError, String(checked))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>
            {text.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 테마 설정 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{text.theme}</Label>
            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                  <span className="text-sm font-medium">{text.light}</span>
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
                  <span className="text-sm font-medium">{text.dark}</span>
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
                  <span className="text-sm font-medium">{text.system}</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* 언어 및 용어 설정 */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-base font-semibold">{text.languageAndTerminology}</Label>
              <p className="text-xs text-muted-foreground">
                {text.languageAndTerminologyHelp}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/30 p-4">
                <LanguageSwitcher />
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <DomainSwitcher />
              </div>
            </div>
          </div>

          <Separator />

          {/* 알림 설정 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">{text.notifications}</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="analysis-complete" className="text-sm font-normal cursor-pointer">
                  {text.notifyAnalysisComplete}
                </Label>
                <Switch
                  id="analysis-complete"
                  checked={notifyAnalysisComplete}
                  onCheckedChange={handleNotifyAnalysisComplete}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="error-notification" className="text-sm font-normal cursor-pointer">
                  {text.notifyError}
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
              {text.advancedSettings}
            </Button>
            <p className="text-xs text-muted-foreground">
              {text.advancedSettingsHelp}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
