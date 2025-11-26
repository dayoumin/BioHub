"use client"

import { Button } from "@/components/ui/button"
import { HelpCircle, Settings, MessageCircle } from "lucide-react"
import Link from "next/link"
import { memo } from "react"
import { useUI } from "@/contexts/ui-context"
import { SettingsModal } from "@/components/layout/settings-modal"
import { HelpModal } from "@/components/layout/help-modal"

export const Header = memo(() => {
  const {
    openChatPanel,
    openSettings,
    openHelp,
    isSettingsOpen,
    isHelpOpen,
    closeSettings,
    closeHelp,
  } = useUI()

  return (
    <>
      <header className="sticky top-0 z-50 bg-background shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* 왼쪽: 로고 */}
            <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
              NIFS 통계 분석 플랫폼
            </Link>

            {/* 오른쪽: AI 챗봇, 도움말, 설정 아이콘 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label="AI 챗봇"
                onClick={openChatPanel}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label="도움말"
                onClick={openHelp}
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label="설정"
                onClick={openSettings}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 모달들 */}
      <SettingsModal open={isSettingsOpen} onOpenChange={closeSettings} />
      <HelpModal open={isHelpOpen} onOpenChange={closeHelp} />
    </>
  )
})

Header.displayName = "Header"
