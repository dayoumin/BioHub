/**
 * SidebarSearch - 실시간 검색 입력 필드
 *
 * 기능:
 * - 검색 아이콘 표시
 * - 입력값 변경 시 부모 컴포넌트에 전달
 * - Clear 버튼 (X 아이콘, 값이 있을 때만 표시)
 */

import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SidebarSearchProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

export const SidebarSearch: React.FC<SidebarSearchProps> = ({
  value,
  onChange,
  onClear,
}) => {
  return (
    <div className="relative">
      {/* 검색 아이콘 */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      {/* 검색 입력 */}
      <Input
        type="text"
        placeholder="대화 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
      />

      {/* Clear 버튼 */}
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={onClear}
          title="검색어 지우기"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
