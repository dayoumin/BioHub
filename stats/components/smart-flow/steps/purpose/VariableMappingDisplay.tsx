'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useTerminology } from '@/hooks/use-terminology'
import { VariableMapping } from '@/lib/statistics/variable-mapping'

interface VariableMappingDisplayProps {
  mapping: VariableMapping
  onClose: () => void
}

export function VariableMappingDisplay({ mapping, onClose }: VariableMappingDisplayProps) {
  const { setVariableMapping } = useSmartFlowStore()
  const t = useTerminology()
  const text = t.variableMapping

  const handleEdit = () => {
    // 간단 편집 UX: 현재 매핑을 스토어에 확정 저장하고 4단계에서 활용
    setVariableMapping(mapping)
    onClose()
  }

  return (
    <div className="bg-info-bg rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{text.title}</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleEdit}>{text.editButton}</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>{text.hideButton}</Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {mapping.dependentVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{text.roles.dependent}</Badge>
            <span className="font-mono">
              {Array.isArray(mapping.dependentVar)
                ? mapping.dependentVar.join(', ')
                : mapping.dependentVar}
            </span>
          </div>
        )}

        {mapping.independentVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{text.roles.independent}</Badge>
            <span className="font-mono">
              {Array.isArray(mapping.independentVar)
                ? mapping.independentVar.join(', ')
                : mapping.independentVar}
            </span>
          </div>
        )}

        {mapping.groupVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{text.roles.group}</Badge>
            <span className="font-mono">{mapping.groupVar}</span>
          </div>
        )}

        {mapping.timeVar && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{text.roles.time}</Badge>
            <span className="font-mono">{mapping.timeVar}</span>
          </div>
        )}

        {mapping.variables && mapping.variables.length > 0 && (
          <div className="flex items-start gap-2">
            <Badge variant="outline">{text.roles.variableList}</Badge>
            <span className="font-mono flex-1">
              {mapping.variables.join(', ')}
            </span>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground pt-2 border-t">
        {text.autoMappingHint}
      </div>
    </div>
  )
}