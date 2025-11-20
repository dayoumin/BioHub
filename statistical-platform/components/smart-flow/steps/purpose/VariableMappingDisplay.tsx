'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { VariableMapping } from '@/lib/statistics/variable-mapping'

interface VariableMappingDisplayProps {
  mapping: VariableMapping
  onClose: () => void
}

export function VariableMappingDisplay({ mapping, onClose }: VariableMappingDisplayProps) {
  const { setVariableMapping } = useSmartFlowStore()

  const handleEdit = () => {
    // 간단 편집 UX: 현재 매핑을 스토어에 확정 저장하고 4단계에서 활용
    setVariableMapping(mapping)
    onClose()
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">🎯 변수 자동 매핑</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleEdit}>변수 매핑 편집</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>숨기기</Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {mapping.dependentVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">종속변수</Badge>
            <span className="font-mono">
              {Array.isArray(mapping.dependentVar)
                ? mapping.dependentVar.join(', ')
                : mapping.dependentVar}
            </span>
          </div>
        )}

        {mapping.independentVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">독립변수</Badge>
            <span className="font-mono">
              {Array.isArray(mapping.independentVar)
                ? mapping.independentVar.join(', ')
                : mapping.independentVar}
            </span>
          </div>
        )}

        {mapping.groupVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">그룹변수</Badge>
            <span className="font-mono">{mapping.groupVar}</span>
          </div>
        )}

        {mapping.timeVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">시간변수</Badge>
            <span className="font-mono">{mapping.timeVar}</span>
          </div>
        )}

        {mapping.variables && mapping.variables.length > 0 && (
          <div className="flex items-start gap-2">
            <Badge variant="outline">변수목록</Badge>
            <span className="font-mono flex-1">
              {mapping.variables.join(', ')}
            </span>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground pt-2 border-t">
        💡 자동 매핑은 기본값입니다. “변수 매핑 편집”을 눌러 독립/종속/그룹 변수를 확정하세요.
      </div>
    </div>
  )
}