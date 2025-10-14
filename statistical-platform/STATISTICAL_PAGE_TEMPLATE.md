# 통계 페이지 개발 템플릿 가이드

## ⚠️ 필수 준수 사항

**모든 신규 통계 페이지는 반드시 이 템플릿을 따라야 합니다.**
`SimpleStatisticsPageLayout` 사용 금지! 오직 `StatisticsPageLayout`만 사용하세요.

## 📋 필수 템플릿 구조

### 1. Import 구조 (반드시 이 순서로)
```typescript
'use client'

import React, { useState, useCallback, useEffect } from 'react'
// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// ... 기타 UI 컴포넌트들

// lucide-react icons
import {
  Activity, BarChart3, CheckCircle, AlertTriangle,
  Info, Calculator, TrendingUp, FileSpreadsheet, Download
} from 'lucide-react'

// 🔴 필수: 기존 시스템 컴포넌트 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { ProfessionalVariableSelector } from '@/components/variable-selection/ProfessionalVariableSelector'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import type { VariableAssignment } from '@/components/variable-selection/VariableSelector'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
```

### 2. 인터페이스 정의
```typescript
// 데이터 인터페이스 (표준)
interface UploadedData {
  data: Record<string, any>[]
  fileName: string
  columns: string[]
}

interface DataRow {
  [key: string]: string | number | null | undefined
}

// 분석 결과 인터페이스 (각 통계 방법별로 정의)
interface [MethodName]Result {
  // 기본 필드들
  sampleSize: number
  // ... 각 방법별 특화 필드들
}
```

### 3. 컴포넌트 구조 (필수)
```typescript
export default function [MethodName]Page() {
  // 🔴 필수 State 패턴
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedData, setUploadedData] = useState<DataRow[] | null>(null)
  const [selectedVariables, setSelectedVariables] = useState<VariableAssignment | null>(null)
  const [analysisResult, setAnalysisResult] = useState<[MethodName]Result | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisOptions, setAnalysisOptions] = useState({
    // 각 방법별 옵션들
  })

  // 🔴 필수 Pyodide 패턴
  const [pyodide, setPyodide] = useState<typeof pyodideStats | null>(null)

  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideStats.initialize()
        setPyodide(pyodideStats)
      } catch (err) {
        console.error('Pyodide 초기화 실패:', err)
        setError('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [])

  // 🔴 필수 Steps 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: '[방법명] 분석 방법 이해',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    // ... 4단계 구조 필수
  ]

  // 🔴 필수 Event Handlers
  const handleDataUpload = useCallback((data: any[]) => {
    const processedData = data.map((row, index) => ({ ...row, _id: index }))
    setUploadedData(processedData)
    setCurrentStep(2)
    setError(null)
  }, [])

  const handleVariableSelection = useCallback((variables: VariableAssignment) => {
    setSelectedVariables(variables)
    // 분석 자동 실행 로직
  }, [])

  // 🔴 필수 Layout
  return (
    <StatisticsPageLayout
      title="[방법명]"
      subtitle="[영문 부제목]"
      description="[간단한 설명]"
      icon={<[적절한아이콘] className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      methodInfo={{
        formula: "[수학 공식]",
        assumptions: ["가정1", "가정2", "가정3"],
        sampleSize: "최소 표본 크기 권장사항",
        usage: "사용 목적 및 적용 분야"
      }}
    >
      {/* 4단계 구조 */}
      {/* Step 1: 방법론 소개 */}
      {/* Step 2: 데이터 업로드 */}
      {/* Step 3: 변수 선택 */}
      {/* Step 4: 결과 해석 */}
    </StatisticsPageLayout>
  )
}
```

## 🚫 절대 금지 사항

1. ❌ `SimpleStatisticsPageLayout` 사용
2. ❌ `import { SimpleStatisticsPageLayout as StatisticsPageLayout }`
3. ❌ Mock 데이터 하드코딩 (실제 DataUploadStep 사용)
4. ❌ 임의의 컴포넌트 구조 변경
5. ❌ 기존 `ProfessionalVariableSelector` 대신 새 컴포넌트 생성

## ✅ 필수 체크리스트

- [ ] StatisticsPageLayout 사용
- [ ] DataUploadStep 통합
- [ ] ProfessionalVariableSelector 사용
- [ ] Pyodide 통계 엔진 연동
- [ ] 4단계 구조 (방법론 → 업로드 → 변수선택 → 결과)
- [ ] 로딩 상태 + 에러 처리
- [ ] 결과 탭 구조 (최소 3개)

## 🎯 개발 속도 향상을 위한 복사 기준

**reliability 페이지를 기준으로 복사 후 수정하세요:**
1. `app/(dashboard)/statistics/reliability/page.tsx` 복사
2. 분석 방법명, 아이콘, 설명만 변경
3. 결과 인터페이스 및 Pyodide 호출 부분만 수정
4. 나머지는 동일하게 유지

이렇게 하면 **일관성 보장 + 빠른 개발**이 가능합니다!