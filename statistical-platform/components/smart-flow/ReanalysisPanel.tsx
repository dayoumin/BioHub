'use client'

import { CheckCircle, XCircle, AlertTriangle, Play, Settings2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { StatisticalMethod } from '@/types/smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { CompatibilityResult, CompatibilityIssue } from '@/lib/utils/variable-compatibility'
import { formatCompatibilityIssue } from '@/lib/utils/variable-compatibility'

interface ReanalysisPanelProps {
  /** 선택된 통계 방법 */
  method: StatisticalMethod | null
  /** 저장된 변수 매핑 */
  variableMapping: VariableMapping | null
  /** 호환성 검사 결과 */
  compatibility: CompatibilityResult | null
  /** 분석 실행 핸들러 */
  onRunAnalysis: () => void
  /** 변수 다시 선택 핸들러 (Step 3으로 이동) */
  onEditVariables: () => void
  /** 분석 중 여부 */
  isAnalyzing?: boolean
}

/**
 * 변수 역할 한글 레이블
 */
const ROLE_LABELS: Record<string, string> = {
  dependentVar: '종속변수',
  independentVar: '독립변수',
  groupVar: '그룹변수',
  timeVar: '시간변수',
  variables: '분석변수',
  covariate: '공변량',
  within: '개체내 요인',
  between: '개체간 요인',
  blocking: '블록변수',
  event: '이벤트변수',
  censoring: '중도절단변수',
  weight: '가중치변수'
}

/**
 * 변수 매핑 요약 표시
 */
function VariableMappingSummary({ mapping }: { mapping: VariableMapping | null }) {
  if (!mapping) return null

  const entries = Object.entries(mapping).filter(
    ([key, value]) => value !== undefined && value !== null && key !== 'key'
  )

  if (entries.length === 0) return null

  return (
    <div className="space-y-2">
      {entries.map(([role, value]) => {
        const label = ROLE_LABELS[role] || role
        const displayValue = Array.isArray(value) ? value.join(', ') : value
        return (
          <div key={role} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-24">{label}:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {displayValue}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

/**
 * 호환성 이슈 목록 표시
 */
function CompatibilityIssueList({ issues }: { issues: CompatibilityIssue[] }) {
  if (issues.length === 0) return null

  return (
    <ul className="space-y-2 text-sm">
      {issues.map((issue, index) => (
        <li key={index} className="flex items-start gap-2">
          {issue.severity === 'error' ? (
            <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
          )}
          <span className={issue.severity === 'error' ? 'text-destructive' : 'text-yellow-700'}>
            {formatCompatibilityIssue(issue)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * 재분석 패널 컴포넌트
 *
 * 재분석 모드에서 데이터 업로드 후 표시됩니다.
 * - 호환되면: "분석 실행" 버튼 (원클릭 분석)
 * - 호환 안되면: 경고 + "변수 다시 선택" 버튼
 */
export function ReanalysisPanel({
  method,
  variableMapping,
  compatibility,
  onRunAnalysis,
  onEditVariables,
  isAnalyzing = false
}: ReanalysisPanelProps) {
  const isCompatible = compatibility?.isCompatible ?? false
  const issues = compatibility?.issues ?? []
  const summary = compatibility?.summary

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">재분석 모드</CardTitle>
        </div>
        <CardDescription>
          이전 분석 설정을 새 데이터에 적용합니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 분석 방법 정보 */}
        {method && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {method.category}
              </Badge>
              <span className="font-medium">{method.name}</span>
            </div>
            {method.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {method.description}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* 변수 매핑 요약 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            저장된 변수 설정
          </h4>
          <VariableMappingSummary mapping={variableMapping} />
        </div>

        <Separator />

        {/* 호환성 상태 */}
        {isCompatible ? (
          // 호환됨 - 바로 분석 가능
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200">
                모든 변수가 일치합니다
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {summary && (
                  <span>
                    {summary.matched}개 변수 확인 완료.{' '}
                    {summary.typeMismatch > 0 && (
                      <span className="text-yellow-600">
                        (타입 주의: {summary.typeMismatch}개)
                      </span>
                    )}
                  </span>
                )}
                {' '}바로 분석할 수 있습니다.
              </AlertDescription>
            </Alert>

            {/* 타입 경고가 있는 경우 표시 */}
            {issues.length > 0 && (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">타입 주의사항:</p>
                <CompatibilityIssueList issues={issues} />
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  분석 중...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  분석 실행
                </>
              )}
            </Button>
          </div>
        ) : (
          // 호환 안됨 - 수정 필요
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>변수가 일치하지 않습니다</AlertTitle>
              <AlertDescription>
                {summary && (
                  <span>
                    필요한 {summary.totalRequired}개 변수 중 {summary.missing}개가 없습니다.
                  </span>
                )}
                {' '}변수를 다시 선택해주세요.
              </AlertDescription>
            </Alert>

            {/* 이슈 목록 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <CompatibilityIssueList issues={issues} />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onEditVariables}
              >
                <Settings2 className="w-4 h-4 mr-2" />
                변수 다시 선택
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={onRunAnalysis}
                disabled={true}
                title="변수 매핑을 먼저 수정해주세요"
              >
                <Play className="w-4 h-4 mr-2" />
                분석 실행
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
