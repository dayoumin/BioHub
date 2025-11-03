/**
 * DeleteConfirmDialog - 삭제 확인 모달
 *
 * 기능:
 * - 세션 또는 프로젝트 삭제 확인
 * - 타입에 따라 다른 메시지 표시
 * - 삭제 버튼 (빨간색, destructive)
 */

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: { type: 'session' | 'project'; id: string } | null
  onConfirm: () => void
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  target,
  onConfirm,
}) => {
  const title = target?.type === 'session' ? '대화 삭제' : '프로젝트 삭제'

  const description =
    target?.type === 'session'
      ? '이 대화를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      : '이 프로젝트를 삭제하시겠습니까? 하위 대화는 루트로 이동됩니다.'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
