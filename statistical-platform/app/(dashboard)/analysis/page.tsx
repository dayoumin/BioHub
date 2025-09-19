'use client'

import { lazy, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Lazy load the heavy AnalysisInterface component
const AnalysisInterface = lazy(() => import('@/components/analysis/analysis-interface').then(m => ({ default: m.AnalysisInterface })))

export default function AnalysisPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">통계 분석 도구</h1>
        <p className="text-muted-foreground text-lg">
          29개의 전문 통계 분석 도구를 선택하세요
        </p>
        <div className="mt-4">
          <Button asChild size="lg">
            <Link href="/smart-analysis">스마트 분석 시작</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <AnalysisInterface />
      </Suspense>
    </div>
  )
}