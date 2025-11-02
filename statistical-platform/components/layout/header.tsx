"use client"

import { Button } from "@/components/ui/button"
import { HelpCircle, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { memo } from "react"

// 헤더 우측 아이콘 버튼 컴포넌트 (도움말, 설정)
const IconButton = memo(({ href, icon: Icon, label, isActive }: { href: string; icon: React.ElementType; label: string; isActive: boolean }) => (
  <Link href={href}>
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="icon"
      className="h-10 w-10"
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
    </Button>
  </Link>
))

IconButton.displayName = "IconButton"

export const Header = memo(() => {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽: 로고 */}
          <Link href="/" className="text-xl font-bold">
            NIFS 통계 분석 플랫폼
          </Link>

          {/* 오른쪽: 도움말, 설정 아이콘 */}
          <div className="flex items-center gap-2">
            <IconButton
              href="/help"
              icon={HelpCircle}
              label="도움말"
              isActive={pathname === '/help'}
            />
            <IconButton
              href="/settings"
              icon={Settings}
              label="설정"
              isActive={pathname === '/settings'}
            />
          </div>
        </div>
      </div>
    </header>
  )
})

Header.displayName = "Header"
