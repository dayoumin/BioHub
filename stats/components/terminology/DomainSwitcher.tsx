'use client'

/**
 * DomainSwitcher - Terminology Domain Selector
 *
 * 사용자가 도메인을 쉽게 전환할 수 있는 UI 컴포넌트
 * - 설정 페이지나 헤더에 추가 가능
 */

import React from 'react'
import { useTerminologyContext } from '@/hooks/use-terminology'
import { getAvailableDomains } from '@/lib/terminology'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Globe } from 'lucide-react'

/**
 * 도메인 표시명 매핑
 */
const DOMAIN_DISPLAY_NAMES: Record<string, { label: string; badge?: string }> = {
  aquaculture: { label: '수산과학', badge: '현재' },
  generic: { label: '범용 통계' },
  medical: { label: '의학 연구' },
  agriculture: { label: '농업 과학' }
}

interface DomainSwitcherProps {
  /** 컴팩트 모드 (아이콘만 표시) */
  compact?: boolean
  /** 클래스명 */
  className?: string
}

/**
 * DomainSwitcher Component
 *
 * @example
 * ```tsx
 * // 헤더에 추가
 * <DomainSwitcher compact />
 *
 * // 설정 페이지에 추가
 * <DomainSwitcher />
 * ```
 */
export function DomainSwitcher({ compact = false, className }: DomainSwitcherProps) {
  const { currentDomain, setDomain, dictionary } = useTerminologyContext()
  const availableDomains = getAvailableDomains()

  const handleChange = (value: string) => {
    setDomain(value)
    // 선택적: localStorage에 저장하여 다음 방문 시에도 유지
    if (typeof window !== 'undefined') {
      localStorage.setItem('terminology-domain', value)
    }
  }

  if (compact) {
    return (
      <Select value={currentDomain} onValueChange={handleChange}>
        <SelectTrigger className={`w-[50px] ${className || ''}`} title="도메인 전환">
          <Globe className="h-4 w-4" />
        </SelectTrigger>
        <SelectContent>
          {availableDomains.map((domain) => (
            <SelectItem key={domain} value={domain}>
              {DOMAIN_DISPLAY_NAMES[domain]?.label || domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium">용어 도메인</label>
        {currentDomain === 'aquaculture' && (
          <Badge variant="secondary" className="text-xs">기본값</Badge>
        )}
      </div>
      <Select value={currentDomain} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableDomains.map((domain) => {
            const info = DOMAIN_DISPLAY_NAMES[domain]
            return (
              <SelectItem key={domain} value={domain}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{info?.label || domain}</span>
                  {info?.badge && domain === currentDomain && (
                    <Badge variant="outline" className="text-xs ml-2">
                      {info.badge}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        현재: <strong>{dictionary.displayName}</strong>
        <br />
        모든 UI 텍스트가 선택한 도메인에 맞게 자동으로 변경됩니다.
      </p>
    </div>
  )
}

/**
 * localStorage에서 저장된 도메인 불러오기
 */
export function getSavedDomain(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('terminology-domain')
}
