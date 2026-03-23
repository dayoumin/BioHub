'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ENTITY_TAB_REGISTRY,
  loadTabSettings,
  saveTabSettings,
} from '@/lib/research/entity-tab-registry'
import type { TabVisibilityMap } from '@/lib/research/entity-tab-registry'
import type { ProjectEntityKind } from '@/lib/types/research'

interface TabSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TabSettingsDialog({ open, onOpenChange }: TabSettingsDialogProps): React.ReactElement {
  const [settings, setSettings] = useState<TabVisibilityMap>({})

  useEffect(() => {
    if (open) {
      setSettings(loadTabSettings())
    }
  }, [open])

  const handleToggle = useCallback((id: ProjectEntityKind) => {
    setSettings(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }, [])

  const handleSave = useCallback(() => {
    saveTabSettings(settings)
    onOpenChange(false)
  }, [settings, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>탭 설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {ENTITY_TAB_REGISTRY.map(tab => (
            <label
              key={tab.id}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Checkbox
                checked={settings[tab.id] ?? false}
                onCheckedChange={() => handleToggle(tab.id)}
              />
              <span className="text-base">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
