'use client'

import { useTheme } from 'next-themes'
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
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Monitor, ExternalLink } from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()

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

          {/* 알림 설정 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">알림</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="analysis-complete" className="text-sm font-normal cursor-pointer">
                  분석 완료 시 알림
                </Label>
                <Switch id="analysis-complete" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="error-notification" className="text-sm font-normal cursor-pointer">
                  에러 발생 시 알림
                </Label>
                <Switch id="error-notification" defaultChecked />
              </div>
            </div>
          </div>

          <Separator />

          {/* 데이터 설정 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">데이터</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="local-storage" className="text-sm font-normal cursor-pointer">
                로컬 저장 허용
              </Label>
              <Switch id="local-storage" defaultChecked />
            </div>
          </div>

          <Separator />

          {/* 챗봇 설정 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">AI 챗봇</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open('/chatbot', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              전용 챗봇 페이지 열기 (새 창)
            </Button>
            <p className="text-xs text-muted-foreground">
              더 넓은 화면에서 채팅 기록 관리, 검색 등의 고급 기능을 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
