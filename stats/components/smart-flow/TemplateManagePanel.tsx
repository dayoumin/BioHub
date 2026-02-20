'use client'

import { memo, useState, useCallback, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  FileText,
  Clock,
  Trash2,
  Edit2,
  Search,
  SortAsc,
  SortDesc,
  MoreVertical,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useTerminology } from '@/hooks/use-terminology'
import { useTemplateStore } from '@/lib/stores/template-store'
import type { AnalysisTemplate, TemplateListOptions } from '@/types/smart-flow'

interface TemplateManagePanelProps {
  /** 패널 열림 상태 */
  open: boolean
  /** 패널 닫기 콜백 */
  onOpenChange: (open: boolean) => void
  /** 템플릿 선택 시 콜백 */
  onSelect?: (template: AnalysisTemplate) => void
}

/**
 * 템플릿 관리 패널 (Sheet)
 * 전체 템플릿 목록 조회, 검색, 수정, 삭제
 */
export const TemplateManagePanel = memo(function TemplateManagePanel({
  open,
  onOpenChange,
  onSelect
}: TemplateManagePanelProps) {
  const t = useTerminology()
  const {
    templates,
    isLoading,
    listOptions,
    loadTemplates,
    editTemplate,
    removeTemplate,
    clearTemplates,
    setListOptions,
    selectTemplate
  } = useTemplateStore()

  // 검색어
  const [searchQuery, setSearchQuery] = useState('')

  // 편집 모달 상태
  const [editingTemplate, setEditingTemplate] = useState<AnalysisTemplate | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 삭제 확인 다이얼로그
  const [deleteTarget, setDeleteTarget] = useState<AnalysisTemplate | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  // 패널 열릴 때 목록 로드
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  // 검색 필터링
  useEffect(() => {
    setListOptions({ searchQuery })
  }, [searchQuery, setListOptions])

  // 정렬 변경
  const handleSortChange = useCallback((sortBy: TemplateListOptions['sortBy']) => {
    setListOptions({ sortBy })
  }, [setListOptions])

  // 정렬 방향 토글
  const toggleSortOrder = useCallback(() => {
    setListOptions({
      sortOrder: listOptions.sortOrder === 'asc' ? 'desc' : 'asc'
    })
  }, [listOptions.sortOrder, setListOptions])

  // 템플릿 선택
  const handleSelect = useCallback((template: AnalysisTemplate) => {
    selectTemplate(template)
    onSelect?.(template)
    onOpenChange(false)
  }, [selectTemplate, onSelect, onOpenChange])

  // 편집 시작
  const startEdit = useCallback((template: AnalysisTemplate) => {
    setEditingTemplate(template)
    setEditName(template.name)
    setEditDescription(template.description)
  }, [])

  // 편집 저장
  const handleSaveEdit = useCallback(async () => {
    if (!editingTemplate || !editName.trim()) return

    setIsSaving(true)
    try {
      await editTemplate(editingTemplate.id, {
        name: editName.trim(),
        description: editDescription.trim()
      })
      setEditingTemplate(null)
    } finally {
      setIsSaving(false)
    }
  }, [editingTemplate, editName, editDescription, editTemplate])

  // 삭제 확인
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await removeTemplate(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, removeTemplate])

  // 전체 삭제
  const handleClearAll = useCallback(async () => {
    await clearTemplates()
    setClearConfirmOpen(false)
  }, [clearTemplates])

  // 상대 시간 포맷
  const formatRelativeTime = useCallback((timestamp: number | null): string => {
    if (!timestamp) return ''

    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t.template.timeAgo.justNow
    if (minutes < 60) return t.template.timeAgo.minutesAgo(minutes)
    if (hours < 24) return t.template.timeAgo.hoursAgo(hours)
    if (days < 7) return t.template.timeAgo.daysAgo(days)
    return new Date(timestamp).toLocaleDateString()
  }, [t])

  // 카테고리 라벨 변환
  const getCategoryLabel = useCallback((category: string): string => {
    return t.template.methodCategories[category] || category
  }, [t])

  // 정렬 옵션 라벨
  const getSortLabel = useCallback((sortBy: TemplateListOptions['sortBy']): string => {
    return t.template.sortOptions[sortBy] || sortBy
  }, [t])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t.template.manageTitle}
            </SheetTitle>
            <SheetDescription>
              {t.template.manageDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* 검색 및 정렬 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.template.placeholders.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={listOptions.sortBy}
                onValueChange={(value) => handleSortChange(value as TemplateListOptions['sortBy'])}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">{t.template.sortOptions.recent}</SelectItem>
                  <SelectItem value="usage">{t.template.sortOptions.usage}</SelectItem>
                  <SelectItem value="name">{t.template.sortOptions.name}</SelectItem>
                  <SelectItem value="created">{t.template.sortOptions.created}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                {listOptions.sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* 템플릿 목록 */}
            <ScrollArea className="h-[calc(100vh-280px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t.template.empty.title}</p>
                  <p className="text-sm mt-1">
                    {t.template.empty.description}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="group p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleSelect(template)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{template.name}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {getCategoryLabel(template.method.category)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{template.method.name}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(template.lastUsedAt || template.createdAt)}
                            </span>
                            {template.usageCount > 0 && (
                              <span>{t.template.usageCount(template.usageCount)}</span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              startEdit(template)
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              {t.template.buttons.edit}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(template)
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t.template.buttons.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* 전체 삭제 버튼 */}
            {templates.length > 0 && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClearConfirmOpen(true)}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t.template.buttons.deleteAll}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 편집 다이얼로그 */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.template.editTitle}</DialogTitle>
            <DialogDescription>
              {t.template.editDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t.template.labels.name}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t.template.labels.description}</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={200}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              {t.template.buttons.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editName.trim()}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t.template.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.template.dialogs.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.template.dialogs.deleteConfirm(deleteTarget?.name || '')}
              <br />{t.template.dialogs.irreversible}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.template.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.template.buttons.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 전체 삭제 확인 다이얼로그 */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t.template.dialogs.clearTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.template.dialogs.clearConfirm(templates.length)}
              <br />{t.template.dialogs.irreversible}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.template.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.template.buttons.deleteAllConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

export default TemplateManagePanel
