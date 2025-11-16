import React from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 메인 콘텐츠 - TwoPanelLayout이 px-8 처리하므로 여기서는 패딩 제거 */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
