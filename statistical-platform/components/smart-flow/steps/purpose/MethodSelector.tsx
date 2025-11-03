'use client'

import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatisticalMethod } from '@/types/smart-flow'

interface MethodSelectorProps {
  methods: StatisticalMethod[]
  selectedMethod: StatisticalMethod | null
  dataProfile: any
  onMethodSelect: (method: StatisticalMethod) => void
  checkMethodRequirements: (method: StatisticalMethod, profile: any) => any
}

export function MethodSelector({
  methods,
  selectedMethod,
  dataProfile,
  onMethodSelect,
  checkMethodRequirements
}: MethodSelectorProps) {
  return (
    <div className="grid gap-2">
      {methods.map((method) => {
        const requirements = dataProfile
          ? checkMethodRequirements(method, dataProfile)
          : { canUse: true, warnings: [] }

        return (
          <button
            key={method.id}
            onClick={() => onMethodSelect(method)}
            className={`text-left p-3 border rounded-lg hover:bg-accent transition-all ${
              selectedMethod?.id === method.id
                ? 'border-primary bg-primary/5'
                : 'border-border'
            } ${!requirements.canUse ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{method.name}</span>
                  {method.subcategory && (
                    <Badge variant="secondary" className="text-xs">
                      {method.subcategory}
                    </Badge>
                  )}
                  {!requirements.canUse && (
                    <Badge variant="destructive" className="text-xs">
                      요구사항 미충족
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {method.description}
                </p>
                {requirements.warnings.length > 0 && (
                  <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                    {requirements.warnings.map((warning: string, idx: number) => (
                      <div key={idx}>⚠️ {warning}</div>
                    ))}
                  </div>
                )}
              </div>
              {selectedMethod?.id === method.id && (
                <Check className="w-5 h-5 text-primary ml-2 flex-shrink-0" />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}