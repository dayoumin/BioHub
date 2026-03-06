import type { Metadata, Viewport } from "next"
import { JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { ClientProviders } from "@/components/providers/ClientProviders"
import { UIProvider } from "@/contexts/ui-context"
import { LayoutContent } from "@/components/layout/layout-content"
import { GlobalFeedbackPanel } from "@/components/feedback/GlobalFeedbackPanel"
import { TerminologyProvider } from "@/lib/terminology"

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const appTitle = process.env.NEXT_PUBLIC_APP_TITLE ?? "BioHub"

export const metadata: Metadata = {
  title: {
    default: appTitle,
    template: `%s | ${appTitle}`
  },
  description: "AI 기반 전문 통계 분석 플랫폼 - 연구자를 위한 데이터 분석 도구",
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
      <body className={`${jetbrainsMono.variable} font-sans min-w-[375px]`}>
        <ClientProviders>
          <TerminologyProvider initialDomain="aquaculture">
            <UIProvider>
              <div className="flex h-screen overflow-hidden">
                {/* 전체 플랫폼 공유 사이드바 */}
                <AppSidebar />

                {/* 메인 영역 */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="relative flex-1 overflow-hidden">
                    <main className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide">
                      {children}
                    </main>
                    {/* 스크롤 가능한 콘텐츠 힌트 — 스크롤바 숨김 보완 */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/50 to-transparent" />
                  </div>
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
          </TerminologyProvider>
        </ClientProviders>
      </body>
    </html>
  )
}