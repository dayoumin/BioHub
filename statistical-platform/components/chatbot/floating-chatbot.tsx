/**
 * 플로팅 챗봇 컴포넌트
 *
 * Intercom 스타일의 플로팅 버튼 + 팝업 챗봇
 * - 우하단 고정 버튼
 * - 400×600px 팝업 (PC)
 * - 768px 미만: 전체 화면 모달
 * - 설정에서 on/off 가능
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, X, Minus } from 'lucide-react'
import { RAGAssistant } from '@/components/rag/rag-assistant'
import { ChatStorage } from '@/lib/services/chat-storage'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  {
    icon: '📊',
    title: 't-test 사용법',
    prompt: 't-test는 언제 사용하나요?',
  },
  {
    icon: '📈',
    title: 'ANOVA vs Regression',
    prompt: 'ANOVA와 회귀분석의 차이점은?',
  },
  {
    icon: '🔍',
    title: '정규성 검정',
    prompt: '정규성 검정은 왜 필요한가요?',
  },
]

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)

  // 설정 로드
  useEffect(() => {
    const settings = ChatStorage.loadSettings()
    setIsEnabled(settings.floatingButtonEnabled)
  }, [])

  // 설정 변경 감지
  useEffect(() => {
    const handleSettingsChange = () => {
      const settings = ChatStorage.loadSettings()
      setIsEnabled(settings.floatingButtonEnabled)
    }

    window.addEventListener('chatbot-settings-changed', handleSettingsChange)
    return () => window.removeEventListener('chatbot-settings-changed', handleSettingsChange)
  }, [])

  // Esc 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
    setIsMinimized(false)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
  }, [])

  const handleHidePermanently = useCallback(() => {
    const settings = ChatStorage.loadSettings()
    settings.floatingButtonEnabled = false
    ChatStorage.saveSettings(settings)
    setIsEnabled(false)
    setIsOpen(false)
  }, [])

  const handleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  // 설정에서 비활성화된 경우 렌더링하지 않음
  if (!isEnabled) {
    return null
  }

  return (
    <>
      {/* 팝업 창 */}
      {isOpen && (
        <Card
          className={cn(
            'fixed z-50 shadow-2xl border-2',
            'bottom-24 right-6 w-[768px] h-[800px]',
            'max-md:inset-0 max-md:w-full max-md:h-full max-md:rounded-none max-md:bottom-0 max-md:right-0',
            'flex flex-col',
            'resize overflow-auto min-w-[400px] min-h-[400px] max-w-[90vw] max-h-[90vh]',
            isMinimized && 'h-auto resize-none'
          )}
          style={{
            resize: isMinimized ? 'none' : 'both'
          }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">AI 도우미</h3>
              <Badge variant="secondary" className="text-xs">
                Beta
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleMinimize}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 본문 */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              <RAGAssistant className="h-full" />
            </div>
          )}

          {/* 푸터 */}
          {!isMinimized && (
            <div className="p-3 border-t bg-muted/30 space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                더 많은 기능을 원하시면{' '}
                <a
                  href="/chatbot"
                  className="text-primary hover:underline font-medium"
                  onClick={handleClose}
                >
                  전용 페이지
                </a>
                를 이용하세요
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={handleHidePermanently}
              >
                플로팅 버튼 숨기기 (설정에서 다시 켤 수 있습니다)
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* 플로팅 버튼 */}
      {!isOpen && (
        <Button
          onClick={handleToggle}
          className={cn(
            'fixed z-40 h-14 w-14 rounded-full shadow-lg',
            'bottom-6 right-6',
            'max-md:bottom-4 max-md:right-4',
            'hover:scale-110 transition-transform'
          )}
          size="icon"
          aria-label="AI 도우미 열기"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* 새 메시지 알림 배지 (선택 사항) */}
      {!isOpen && (
        <div
          className={cn(
            'fixed z-50 h-5 w-5 rounded-full bg-destructive',
            'bottom-[72px] right-[72px]',
            'max-md:bottom-[56px] max-md:right-[56px]',
            'hidden' // 실제 구현 시 조건부로 표시
          )}
        >
          <span className="text-xs text-destructive-foreground font-bold flex items-center justify-center h-full">
            1
          </span>
        </div>
      )}
    </>
  )
}
