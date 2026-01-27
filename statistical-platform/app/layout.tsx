import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ConditionalHeader } from "@/components/layout/conditional-header"
import { Toaster } from "@/components/ui/sonner"
import { ClientProviders } from "@/components/providers/ClientProviders"
import { UIProvider } from "@/contexts/ui-context"
import { LayoutContent } from "@/components/layout/layout-content"
import { GlobalFeedbackPanel } from "@/components/feedback/GlobalFeedbackPanel"

// 외부망 환경에서 Google Fonts 접근 불가 시 시스템 폰트 사용
const systemFontClass = "font-sans"

export const metadata: Metadata = {
  title: {
    default: "통계 분석 플랫폼",
    template: "%s | 통계 분석 플랫폼"
  },
  description: "전문가급 통계 분석 도구 - SPSS와 R Studio의 강력함을 웹에서",
  keywords: ["통계", "분석", "SPSS", "R", "데이터", "과학", "연구"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "통계분석"
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={systemFontClass}>
        <ClientProviders>
          <UIProvider>
            <div className="flex h-screen overflow-hidden">
              {/* 메인 영역 */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <ConditionalHeader />
                <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                  {children}
                </main>
              </div>

              {/* 우측 챗봇 패널 (조건부 렌더링) */}
              <LayoutContent />
            </div>


            {/* 전역 피드백 패널 */}
            <GlobalFeedbackPanel />

            <Toaster
              position="top-center"
              richColors
              closeButton
              duration={4000}
              toastOptions={{
                className: 'font-medium',
              }}
            />
          </UIProvider>
        </ClientProviders>
      </body>
    </html>
  )
}