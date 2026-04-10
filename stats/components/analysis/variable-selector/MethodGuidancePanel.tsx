'use client'

import { Badge } from '@/components/ui/badge'
import type {
  StatisticalMethodRequirements,
  VariableRequirement,
} from '@/lib/statistics/variable-requirements'

function getRequirementTypeSummary(requirement: VariableRequirement) {
  const variableCount = requirement.multiple
    ? `${requirement.minCount ?? 1}${requirement.maxCount ? `-${requirement.maxCount}` : '+'} variables`
    : '1 variable'
  return `${variableCount} · ${requirement.types.join(', ')}`
}

function formatSettingDefault(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

interface MethodGuidancePanelProps {
  methodRequirements?: StatisticalMethodRequirements
}

export function MethodGuidancePanel({
  methodRequirements,
}: MethodGuidancePanelProps) {
  if (!methodRequirements) return null

  const previewColumns = methodRequirements.dataFormat?.columns?.slice(0, 4) ?? []
  const previewNotes = methodRequirements.notes?.slice(0, 3) ?? []
  const previewAssumptions = methodRequirements.assumptions.slice(0, 4)
  const settingEntries = Object.entries(methodRequirements.settings ?? {})
    .slice(0, 4)
    .map(([key, setting]) => ({
      key,
      label: setting.label,
      defaultValue: setting.default,
      description: setting.description,
    }))

  return (
    <div
      className="rounded-2xl border border-border/40 bg-background px-4 py-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]"
      data-testid="method-guidance-panel"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            Method Guide
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {methodRequirements.description}
          </p>
          {methodRequirements.dataFormat && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Data format: {methodRequirements.dataFormat.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[11px] font-medium">
            Min n {methodRequirements.minSampleSize}
          </Badge>
          {methodRequirements.dataFormat?.type && (
            <Badge variant="secondary" className="text-[11px] font-medium capitalize">
              {methodRequirements.dataFormat.type} format
            </Badge>
          )}
          <Badge variant="outline" className="text-[11px] font-medium">
            Roles {methodRequirements.variables.length}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.95fr)]">
        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Required roles
          </p>
          <div className="mt-2 space-y-2">
            {methodRequirements.variables.length > 0 ? methodRequirements.variables.map(requirement => (
              <div key={`${requirement.role}-${requirement.label}`} className="rounded-lg border border-border/30 bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{requirement.label}</span>
                  <Badge variant={requirement.required ? 'default' : 'outline'} className="text-[10px]">
                    {requirement.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {getRequirementTypeSummary(requirement)}
                </p>
              </div>
            )) : (
              <p className="mt-2 text-xs text-muted-foreground">This method can run without explicit variable role assignment.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Assumptions
          </p>
          {previewAssumptions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {previewAssumptions.map(assumption => (
                <Badge key={assumption} variant="outline" className="text-[10px]">
                  {assumption}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No major assumptions listed for this method.</p>
          )}
          {previewNotes.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
                {previewNotes.map(note => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Expected columns
          </p>
          {previewColumns.length > 0 ? (
            <div className="mt-2 space-y-2">
              {previewColumns.map(column => (
                <div key={column.name} className="rounded-lg border border-border/30 bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{column.name}</span>
                    {column.required && (
                      <Badge variant="outline" className="text-[10px]">Required</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{column.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No example schema is attached to this method yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/40 bg-surface-container-lowest p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Default settings
          </p>
          {settingEntries.length > 0 ? (
            <div className="mt-2 space-y-2">
              {settingEntries.map(setting => (
                <div key={setting.key} className="rounded-lg border border-border/30 bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{setting.label}</span>
                    {setting.defaultValue !== undefined && (
                      <Badge variant="outline" className="text-[10px]">
                        Default {formatSettingDefault(setting.defaultValue)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{setting.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No default execution settings are registered for this method.</p>
          )}
        </div>
      </div>
    </div>
  )
}
