import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Toaster } from "@/components/ui/sonner"
import { ClientProviders } from "@/components/providers/ClientProviders"
import { FloatingChatbot } from "@/components/chatbot/floating-chatbot"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "통계 분석 플랫폼",
    template: "%s | 통계 분석 플랫폼"
  },
  description: "전문가급 통계 분석 도구 - SPSS와 R Studio의 강력함을 웹에서",
  keywords: ["통계", "분석", "SPSS", "R", "데이터", "과학", "연구"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientProviders>
          <div className="min-h-screen bg-background">
            <Header />
            <main>
              {children}
            </main>
            <FloatingChatbot />
            <Toaster
              position="top-center"
              richColors
              closeButton
              duration={4000}
              toastOptions={{
                className: 'font-medium',
              }}
            />
          </div>
        </ClientProviders>
      </body>
    </html>
  )
}