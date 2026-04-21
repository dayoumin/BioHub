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
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import type { AppTerminologyDomain } from '@/lib/preferences'

/**
 * 도메인 표시명 매핑
 */
const DOMAIN_DISPLAY_NAMES: Record<'ko' | 'en', Record<string, { label: string; badge?: string }>> = {
  ko: {
    aquaculture: { label: '수산과학', badge: '현재' },
    generic: { label: '범용 통계' },
  },
  en: {
    aquaculture: { label: 'Aquaculture', badge: 'Current' },
    generic: { label: 'General Statistics' },
  },
}

const UI_TEXT = {
  ko: {
    label: '용어 도메인',
    defaultBadge: '기본값',
    compactTitle: '용어 도메인 전환',
    currentPrefix: '현재',
    help: '전문 용어와 예시 문맥만 바꾸며, UI 언어는 별도로 유지됩니다.',
  },
  en: {
    label: 'Terminology Domain',
    defaultBadge: 'Default',
    compactTitle: 'Switch terminology domain',
    currentPrefix: 'Current',
    help: 'Changes domain-specific terminology and examples while keeping the UI language separate.',
  },
} as const

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
  const { currentDomain, currentLanguage, setDomain, dictionary } = useTerminologyContext()
  const availableDomains = getAvailableDomains()
  const domainLabels = DOMAIN_DISPLAY_NAMES[currentLanguage]
  const text = UI_TEXT[currentLanguage]

  const handleChange = (value: string) => {
    setDomain(value as AppTerminologyDomain)
  }

  if (compact) {
    return (
      <Select value={currentDomain} onValueChange={handleChange}>
        <SelectTrigger className={`w-[50px] ${className || ''}`} title={text.compactTitle}>
          <Globe className="h-4 w-4" />
        </SelectTrigger>
        <SelectContent>
          {availableDomains.map((domain) => (
            <SelectItem key={domain} value={domain}>
              {domainLabels[domain]?.label || domain}
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
        <label className="text-sm font-medium">{text.label}</label>
        {currentDomain === 'aquaculture' && (
          <Badge variant="secondary" className="text-xs">{text.defaultBadge}</Badge>
        )}
      </div>
      <Select value={currentDomain} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableDomains.map((domain) => {
            const info = domainLabels[domain]
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
        {text.currentPrefix}: <strong>{dictionary.displayName}</strong>
        <br />
        {text.help}
      </p>
    </div>
  )
}

/**
 * localStorage에서 저장된 도메인 불러오기
 */
export function getSavedDomain(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.ui.terminologyDomain)
}
