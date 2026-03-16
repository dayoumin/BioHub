'use client'

/**
 * /analysis 라우트는 홈(/)으로 리다이렉트됨.
 * 레이아웃은 최소한으로 유지.
 */
export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
