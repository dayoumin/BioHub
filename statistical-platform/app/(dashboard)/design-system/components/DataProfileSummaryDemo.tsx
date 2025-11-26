'use client'

/**
 * DataProfileSummary 데모 컴포넌트
 * - 상태별 표시 (success/warning/error)
 * - 가정 검정 결과 요약
 * - 에러/경고 메시지 확장
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataProfileSummary } from '@/components/common/analysis/DataProfileSummary'
import { FileCheck } from 'lucide-react'

type StatusType = 'success' | 'warning' | 'error'

export function DataProfileSummaryDemo() {
  const [selectedStatus, setSelectedStatus] = useState<StatusType>('success')

  // 상태별 데모 데이터
  const demoConfigs: Record<StatusType, {
    sampleSize: number
    numericVars: number
    categoricalVars: number
    missingValues: number
    totalCells: number
    recommendedType: 'parametric' | 'nonparametric' | null
    errors: string[]
    warnings: string[]
    assumptionSummary: {
      normality: boolean | null
      homogeneity: boolean | null
      isLoading: boolean
    }
  }> = {
    success: {
      sampleSize: 150,
      numericVars: 5,
      categoricalVars: 2,
      missingValues: 0,
      totalCells: 150 * 7,
      recommendedType: 'parametric',
      errors: [],
      warnings: [],
      assumptionSummary: {
        normality: true,
        homogeneity: true,
        isLoading: false
      }
    },
    warning: {
      sampleSize: 45,
      numericVars: 3,
      categoricalVars: 1,
      missingValues: 12,
      totalCells: 45 * 4,
      recommendedType: 'nonparametric',
      errors: [],
      warnings: [
        '표본 크기가 50 미만입니다. 비모수적 방법을 권장합니다.',
        '결측치가 6.7% 발견되었습니다.'
      ],
      assumptionSummary: {
        normality: false,
        homogeneity: true,
        isLoading: false
      }
    },
    error: {
      sampleSize: 8,
      numericVars: 1,
      categoricalVars: 0,
      missingValues: 25,
      totalCells: 8 * 1,
      recommendedType: null,
      errors: [
        '수치형 변수가 2개 미만입니다. 상관분석을 수행할 수 없습니다.',
        '표본 크기가 너무 작습니다 (최소 10개 필요).'
      ],
      warnings: [
        '결측치 비율이 높습니다 (31.3%).'
      ],
      assumptionSummary: {
        normality: null,
        homogeneity: null,
        isLoading: false
      }
    }
  }

  const currentConfig = demoConfigs[selectedStatus]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            DataProfileSummary
            <Badge variant="secondary">NEW</Badge>
          </CardTitle>
          <CardDescription>
            데이터 검토 결과를 상태별로 표시하는 요약 카드.
            Smart Flow Step 2와 개별 통계 페이지에서 사용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 상태 선택 버튼 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">상태 선택:</p>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('success')}
                className="gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Success
              </Button>
              <Button
                variant={selectedStatus === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('warning')}
                className="gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Warning
              </Button>
              <Button
                variant={selectedStatus === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('error')}
                className="gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Error
              </Button>
            </div>
          </div>

          {/* 라이브 프리뷰 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">미리보기:</p>
            <DataProfileSummary
              sampleSize={currentConfig.sampleSize}
              numericVars={currentConfig.numericVars}
              categoricalVars={currentConfig.categoricalVars}
              missingValues={currentConfig.missingValues}
              totalCells={currentConfig.totalCells}
              recommendedType={currentConfig.recommendedType}
              status={selectedStatus}
              errors={currentConfig.errors}
              warnings={currentConfig.warnings}
              assumptionSummary={currentConfig.assumptionSummary}
            />
          </div>

          {/* Props 설명 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Props:</p>
            <div className="bg-muted rounded-lg p-4 text-xs space-y-2">
              <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2">
                <span>Prop</span>
                <span>Type</span>
                <span>Description</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <code>status</code>
                <span className="text-muted-foreground">&apos;success&apos; | &apos;warning&apos; | &apos;error&apos;</span>
                <span className="text-muted-foreground">검토 상태</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <code>errors</code>
                <span className="text-muted-foreground">string[]</span>
                <span className="text-muted-foreground">오류 메시지 목록</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <code>warnings</code>
                <span className="text-muted-foreground">string[]</span>
                <span className="text-muted-foreground">경고 메시지 목록</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <code>assumptionSummary</code>
                <span className="text-muted-foreground">object</span>
                <span className="text-muted-foreground">가정 검정 결과 (정규성, 등분산)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <code>recommendedType</code>
                <span className="text-muted-foreground">&apos;parametric&apos; | &apos;nonparametric&apos;</span>
                <span className="text-muted-foreground">권장 분석 유형</span>
              </div>
            </div>
          </div>

          {/* 사용 예시 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">사용 예시:</p>
            <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto">
              <code>{`<DataProfileSummary
  sampleSize={150}
  numericVars={5}
  categoricalVars={2}
  missingValues={0}
  totalCells={1050}
  recommendedType="parametric"
  status="success"
  errors={[]}
  warnings={[]}
  assumptionSummary={{
    normality: true,
    homogeneity: true,
    isLoading: false
  }}
/>`}</code>
            </pre>
          </div>

          {/* 사용처 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">사용처:</p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><strong>Smart Flow Step 2</strong>: 데이터 탐색 상단에 검토 결과 표시</li>
              <li><strong>개별 통계 페이지</strong>: 데이터 적합도 확인</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
