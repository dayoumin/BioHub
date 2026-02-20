"use client"

import { Button } from "@/components/ui/button"
import { HelpCircle, Settings, MessageCircle, BarChart3 } from "lucide-react"
import Link from "next/link"
// memo 제거 - UI Context 상태 변경 감지 문제 해결
import { usePathname } from "next/navigation"
import { useUI } from "@/contexts/ui-context"
import { SettingsModal } from "@/components/layout/settings-modal"
import { HelpModal } from "@/components/layout/help-modal"

export function Header() {
  const pathname = usePathname()
  const isChatbotPage = pathname === '/chatbot' || pathname?.startsWith('/chatbot/')

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

            {/* 오른쪽: 통계/챗봇 토글, 도움말, 설정 아이콘 */}
            <div className="flex items-center gap-2">
              {isChatbotPage ? (
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="통계 분석"
                    title="통계 분석으로 이동"
                  >
                    <BarChart3 className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="AI 챗봇"
                  onClick={openChatPanel}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              )}
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
}
