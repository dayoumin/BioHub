'use client'

import { memo, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Save, Loader2, FileText } from 'lucide-react'
import { useTemplateStore } from '@/lib/stores/template-store'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { StatisticalMethod } from '@/types/smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

interface TemplateSaveModalProps {
  /** 모달 열림 상태 */
  open: boolean
  /** 모달 닫기 콜백 */
  onOpenChange: (open: boolean) => void
  /** 저장 완료 콜백 */
  onSaved?: () => void
}

/**
 * 템플릿 저장 모달
 * Step 4 결과 화면에서 사용
 */
export const TemplateSaveModal = memo(function TemplateSaveModal({
  open,
  onOpenChange,
  onSaved
}: TemplateSaveModalProps) {
  const { createTemplate } = useTemplateStore()
  const {
    selectedMethod,
    analysisPurpose,
    variableMapping,
    uploadedFileName,
    uploadedData
  } = useSmartFlowStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기본 이름 생성
  const getDefaultName = useCallback(() => {
    if (!selectedMethod) return ''
    const date = new Date().toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
    return `${selectedMethod.name} (${date})`
  }, [selectedMethod])

  // 모달 열릴 때 기본값 설정
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setName(getDefaultName())
      setDescription('')
      setError(null)
    }
    onOpenChange(isOpen)
  }, [onOpenChange, getDefaultName])

  // 저장 처리
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('템플릿 이름을 입력해주세요.')
      return
    }

    if (!selectedMethod || !variableMapping) {
      setError('분석 설정이 완료되지 않았습니다.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await createTemplate({
        name: name.trim(),
        description: description.trim(),
        purpose: analysisPurpose,
        method: selectedMethod as StatisticalMethod,
        variableMapping: variableMapping as VariableMapping,
        originalData: {
          fileName: uploadedFileName || undefined,
          rowCount: uploadedData?.length,
          columnCount: uploadedData?.[0] ? Object.keys(uploadedData[0]).length : undefined
        }
      })

      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }, [
    name,
    description,
    selectedMethod,
    variableMapping,
    analysisPurpose,
    uploadedFileName,
    uploadedData,
    createTemplate,
    onSaved,
    onOpenChange
  ])

  // 카테고리 한글 변환
  const getCategoryLabel = useCallback((category: string): string => {
    const labels: Record<string, string> = {
      'descriptive': '기술통계',
      't-test': 't-검정',
      'anova': '분산분석',
      'regression': '회귀분석',
      'correlation': '상관분석',
      'chi-square': '카이제곱',
      'nonparametric': '비모수',
      'advanced': '고급분석',
      'timeseries': '시계열',
      'pca': 'PCA',
      'clustering': '군집분석',
      'psychometrics': '심리측정',
      'design': '실험설계',
      'survival': '생존분석'
    }
    return labels[category] || category
  }, [])

  if (!selectedMethod) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            템플릿으로 저장
          </DialogTitle>
          <DialogDescription>
            현재 분석 설정을 템플릿으로 저장하면 나중에 새 데이터로 빠르게 동일 분석을 수행할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 분석 방법 정보 */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {getCategoryLabel(selectedMethod.category)}
              </Badge>
              <span className="font-medium text-sm">{selectedMethod.name}</span>
            </div>
            {variableMapping && (
              <div className="text-xs text-muted-foreground space-y-1">
                {variableMapping.dependentVar && (
                  <div>종속변수: {Array.isArray(variableMapping.dependentVar) ? variableMapping.dependentVar.join(', ') : variableMapping.dependentVar}</div>
                )}
                {variableMapping.independentVar && (
                  <div>독립변수: {Array.isArray(variableMapping.independentVar) ? variableMapping.independentVar.join(', ') : variableMapping.independentVar}</div>
                )}
                {variableMapping.groupVar && (
                  <div>그룹변수: {variableMapping.groupVar}</div>
                )}
                {variableMapping.between && (
                  <div>요인: {Array.isArray(variableMapping.between) ? variableMapping.between.join(', ') : variableMapping.between}</div>
                )}
              </div>
            )}
          </div>

          {/* 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="template-name">템플릿 이름 *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 실험 데이터 t-test"
              maxLength={50}
            />
          </div>

          {/* 설명 입력 */}
          <div className="space-y-2">
            <Label htmlFor="template-description">설명 (선택)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="나중에 참고할 메모를 입력하세요"
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/200
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                저장
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

export default TemplateSaveModal
