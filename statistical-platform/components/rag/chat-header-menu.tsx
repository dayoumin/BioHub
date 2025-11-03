/**
 * ChatHeaderMenu - 채팅 헤더 드롭다운 메뉴 (4개 항목)
 *
 * 기능:
 * - 즐겨찾기 토글
 * - 이름 변경
 * - 프로젝트 이동
 * - 삭제
 *
 * 사용처:
 * - /chatbot 페이지 헤더
 * - RAGAssistant 사이드바 채팅 목록
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical, Pin, MapPin, Edit2, FolderInput, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatHeaderMenuProps {
  /** 세션이 즐겨찾기되어 있는지 여부 */
  isFavorite: boolean
  /** 즐겨찾기 토글 핸들러 */
  onToggleFavorite: () => void
  /** 이름 변경 핸들러 */
  onRename: () => void
  /** 프로젝트 이동 핸들러 */
  onMove: () => void
  /** 삭제 핸들러 */
  onDelete: () => void
  /** 추가 클래스명 */
  className?: string
}

export function ChatHeaderMenu({
  isFavorite,
  onToggleFavorite,
  onRename,
  onMove,
  onDelete,
  className = '',
}: ChatHeaderMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 flex-shrink-0', className)}
          title="옵션"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {/* 즐겨찾기 토글 */}
        <DropdownMenuItem onClick={onToggleFavorite}>
          {isFavorite ? (
            <>
              <Pin className="h-4 w-4 mr-2" />
              <span>즐겨찾기 해제</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              <span>즐겨찾기 추가</span>
            </>
          )}
        </DropdownMenuItem>

        {/* 이름 변경 */}
        <DropdownMenuItem onClick={onRename}>
          <Edit2 className="h-4 w-4 mr-2" />
          <span>이름 변경</span>
        </DropdownMenuItem>

        {/* 프로젝트 이동 */}
        <DropdownMenuItem onClick={onMove}>
          <FolderInput className="h-4 w-4 mr-2" />
          <span>프로젝트 이동</span>
        </DropdownMenuItem>

        {/* 삭제 */}
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          <span>삭제</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
