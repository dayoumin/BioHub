"use client"

import { Button } from "@/components/ui/button"
import { Home, BarChart2, Bot, HelpCircle, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { memo } from "react"

// 네비게이션 아이템을 상수로 이동하여 리렌더링 시 재생성 방지
const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "홈" },
  { href: "/statistics", icon: BarChart2, label: "통계분석" },
  { href: "/chatbot", icon: Bot, label: "챗봇" },
  { href: "/help", icon: HelpCircle, label: "도움말" },
] as const

// 개별 네비게이션 아이템 컴포넌트를 memo로 최적화
const NavItem = memo(({ href, icon: Icon, label, isActive }: { href: string; icon: React.ElementType; label: string; isActive: boolean }) => (
  <Link
    href={href}
    className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-md transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-muted text-muted-foreground'
    )}
  >
    <Icon className="h-4 w-4" />
    <span className="font-medium">{label}</span>
  </Link>
))

NavItem.displayName = "NavItem"

export const Header = memo(() => {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽: 로고 + 메인 네비게이션 */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold">
              통계 플랫폼
            </Link>
            <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href}
                />
              ))}
            </nav>
          </div>

          {/* 오른쪽: 설정 아이콘 */}
          <Link href="/settings">
            <Button
              variant={pathname === '/settings' ? 'default' : 'ghost'}
              size="icon"
              className="h-10 w-10"
              aria-label="설정"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
})

Header.displayName = "Header"
