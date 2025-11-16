'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle2, Circle, Copy, ExternalLink, Download, Terminal, Info } from 'lucide-react'

interface OllamaSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry?: () => void
}

/**
 * OS 자동 감지
 */
function detectOS(): 'windows' | 'mac' | 'linux' {
  if (typeof window === 'undefined') return 'windows'

  const userAgent = window.navigator.userAgent.toLowerCase()
  if (userAgent.includes('win')) return 'windows'
  if (userAgent.includes('mac')) return 'mac'
  return 'linux'
}

/**
 * OS별 설정
 */
const OS_CONFIG = {
  windows: {
    name: 'Windows',
    downloadUrl: 'https://ollama.com/download/windows',
    downloadText: 'Ollama 다운로드 (Windows)',
    terminalName: '명령 프롬프트 (cmd) 또는 PowerShell',
    terminalHow: 'Windows 검색에서 "cmd" 입력',
  },
  mac: {
    name: 'macOS',
    downloadUrl: 'https://ollama.com/download/mac',
    downloadText: 'Ollama 다운로드 (Mac)',
    terminalName: '터미널 (Terminal)',
    terminalHow: 'Spotlight 검색 (⌘+Space)에서 "터미널" 입력',
  },
  linux: {
    name: 'Linux',
    downloadUrl: 'https://ollama.com/download/linux',
    downloadText: 'Ollama 다운로드 (Linux)',
    terminalName: '터미널',
    terminalHow: 'Ctrl+Alt+T 또는 애플리케이션 메뉴에서 찾기',
  },
}

const SETUP_STEPS = [
  {
    id: 1,
    title: 'Ollama 설치하기',
    icon: Download,
  },
  {
    id: 2,
    title: 'AI 모델 다운로드',
    icon: Terminal,
  },
  {
    id: 3,
    title: '연결 확인',
    icon: CheckCircle2,
  },
]

export function OllamaSetupDialog({ open, onOpenChange, onRetry }: OllamaSetupDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('windows')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setOs(detectOS())
      setCurrentStep(1)
    }
  }, [open])

  const osConfig = OS_CONFIG[os]

  const copyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">AI 챗봇 설정하기</DialogTitle>
          <DialogDescription>
            간단한 3단계로 AI 챗봇을 시작하세요 ({osConfig.name} 사용 중)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Step 1: Ollama 설치 */}
          <Card className={currentStep >= 1 ? 'border-primary' : ''}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">1. Ollama 다운로드 및 설치</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                아래 버튼을 클릭하여 Ollama를 다운로드하고 설치하세요
              </p>
              <Button
                onClick={() => {
                  window.open(osConfig.downloadUrl, '_blank')
                  setCurrentStep(2)
                }}
                className="w-full gap-2"
                variant="default"
              >
                <Download className="h-4 w-4" />
                {osConfig.downloadText}
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 다운로드 후 설치 파일을 실행하고 안내에 따라 설치를 완료하세요
              </p>
            </CardContent>
          </Card>

          {/* Step 2: 모델 다운로드 */}
          <Card className={currentStep >= 2 ? 'border-primary' : 'opacity-50'}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Terminal className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">2. AI 모델 다운로드</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">① {osConfig.terminalName} 열기</p>
                <p className="text-xs text-muted-foreground">{osConfig.terminalHow}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">② 아래 명령어 복사 및 실행</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        다른 모델도 사용 가능합니다<br />
                        (예: llama3, gemma, mistral 등)<br />
                        <a
                          href="https://ollama.com/library"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-primary-foreground/80"
                        >
                          ollama.com/library
                        </a>에서 확인하세요
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
                  <code className="flex-1 text-xs font-mono">
                    ollama pull qwen3-embedding:0.6b && ollama pull qwen3:4b
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      copyCommand('ollama pull qwen3-embedding:0.6b && ollama pull qwen3:4b')
                      setCurrentStep(3)
                    }}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-600">✓ 복사되었습니다!</p>}
              </div>

              <p className="text-xs text-muted-foreground">
                💡 모델 다운로드는 약 3-5분 소요됩니다 (총 3.3GB)
              </p>
            </CardContent>
          </Card>

          {/* Step 3: 연결 확인 */}
          <Card className={currentStep >= 3 ? 'border-primary' : 'opacity-50'}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">3. 연결 확인</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                설치가 완료되면 아래 버튼을 클릭하세요
              </p>
              <Button onClick={handleRetry} className="w-full" disabled={currentStep < 3}>
                연결 재시도
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            나중에 하기
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>단계:</span>
            <span className="font-medium">{currentStep}/3</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
