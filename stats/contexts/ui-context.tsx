'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface UIContextType {
  // 설정 모달
  isSettingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void

  // 도움말 모달
  isHelpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const value: UIContextType = {
    isSettingsOpen,
    openSettings: () => setIsSettingsOpen(true),
    closeSettings: () => setIsSettingsOpen(false),

    isHelpOpen,
    openHelp: () => setIsHelpOpen(true),
    closeHelp: () => setIsHelpOpen(false),
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
