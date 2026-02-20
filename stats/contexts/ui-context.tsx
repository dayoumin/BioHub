'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UIContextType {
  // 챗봇 패널
  isChatPanelOpen: boolean
  openChatPanel: () => void
  closeChatPanel: () => void
  toggleChatPanel: () => void

  // 챗봇 패널 너비/접힘 상태
  chatPanelWidth: number
  setChatPanelWidth: (width: number) => void
  isChatPanelCollapsed: boolean
  toggleChatPanelCollapse: () => void

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
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [chatPanelWidth, setChatPanelWidth] = useState(384) // Default w-96 (384px)
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false)

  // localStorage에서 패널 설정 로드
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedWidth = localStorage.getItem('chatPanelWidth')
    const savedCollapsed = localStorage.getItem('chatPanelCollapsed')

    if (savedWidth) {
      const width = Number(savedWidth)
      if (width >= 320 && width <= 800) {
        setChatPanelWidth(width)
      }
    }

    if (savedCollapsed) {
      setIsChatPanelCollapsed(savedCollapsed === 'true')
    }
  }, [])

  // 패널 설정 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.setItem('chatPanelWidth', String(chatPanelWidth))
    localStorage.setItem('chatPanelCollapsed', String(isChatPanelCollapsed))
  }, [chatPanelWidth, isChatPanelCollapsed])

  const value: UIContextType = {
    // 챗봇 패널
    isChatPanelOpen,
    openChatPanel: () => setIsChatPanelOpen(true),
    closeChatPanel: () => setIsChatPanelOpen(false),
    toggleChatPanel: () => setIsChatPanelOpen(prev => !prev),

    // 챗봇 패널 너비/접힘 상태
    chatPanelWidth,
    setChatPanelWidth,
    isChatPanelCollapsed,
    toggleChatPanelCollapse: () => setIsChatPanelCollapsed(prev => !prev),

    // 설정 모달
    isSettingsOpen,
    openSettings: () => setIsSettingsOpen(true),
    closeSettings: () => setIsSettingsOpen(false),

    // 도움말 모달
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
