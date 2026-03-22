import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BioHub Genetics — DNA 바코딩 종 판별',
  description: 'DNA 서열 기반 종 판별 + AI 의사결정 지원',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  )
}
