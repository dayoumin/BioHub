'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Info } from 'lucide-react'
import { PyodideProvider } from '@/components/providers/PyodideProvider'

export default function StatisticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PyodideProvider>
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
        <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>이 페이지는 레거시 모드입니다.</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
          >
            Smart Flow로 분석하기
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      {children}
    </PyodideProvider>
  )
}
