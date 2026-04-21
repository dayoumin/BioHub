'use client'

import React from 'react'
import { Languages } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LangToggle } from '@/components/common/LangToggle'
import { useAppPreferences } from '@/hooks/use-app-preferences'

interface LanguageSwitcherProps {
  className?: string
}

const LANGUAGE_LABELS: Record<'ko' | 'en', string> = {
  ko: '한국어',
  en: 'English',
}

const UI_TEXT = {
  ko: {
    label: 'UI 언어',
    defaultBadge: '기본값',
    currentPrefix: '현재',
    help: '버튼, 안내 문구, 결과 설명 등 UI 텍스트 언어를 변경합니다.',
  },
  en: {
    label: 'UI Language',
    defaultBadge: 'Default',
    currentPrefix: 'Current',
    help: 'Changes the language used for buttons, guidance, and other UI text.',
  },
} as const

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage } = useAppPreferences()
  const text = UI_TEXT[currentLanguage]
  const languageLabel = currentLanguage === 'ko' || currentLanguage === 'en'
    ? LANGUAGE_LABELS[currentLanguage]
    : currentLanguage

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Languages className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium">{text.label}</label>
        {currentLanguage === 'ko' && (
          <Badge variant="secondary" className="text-xs">{text.defaultBadge}</Badge>
        )}
      </div>
      <LangToggle value={currentLanguage} onChange={setLanguage} />
      <p className="text-xs text-muted-foreground">
        {text.currentPrefix}: <strong>{languageLabel}</strong>
        <br />
        {text.help}
      </p>
    </div>
  )
}
