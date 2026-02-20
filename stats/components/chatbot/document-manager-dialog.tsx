'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DocumentManager } from '@/components/rag/document-manager'

interface DocumentManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentManagerDialog({ open, onOpenChange }: DocumentManagerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>문서 관리</DialogTitle>
          <DialogDescription>
            RAG 시스템에서 사용할 문서를 업로드하고 관리합니다
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <DocumentManager />
        </div>
      </DialogContent>
    </Dialog>
  )
}
