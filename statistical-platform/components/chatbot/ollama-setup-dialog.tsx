'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle2, Copy, Download, Terminal, Info } from 'lucide-react'

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

/**
 * 현재 도메인 감지 (Vercel 배포 시 CORS 설정에 사용)
 */
function getCurrentDomain(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000'
  return window.location.origin
}

export function OllamaSetupDialog({ open, onOpenChange, onRetry }: OllamaSetupDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('windows')
  const [copied, setCopied] = useState(false)
  const [ollamaInstalled, setOllamaInstalled] = useState(false)

  // Ollama 설치 여부 체크
  const checkOllamaInstalled = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2초 타임아웃
      })
      if (response.ok) {
        setOllamaInstalled(true)
        setCurrentStep(2) // 모델 다운로드 단계로 자동 이동
      }
    } catch {
      setOllamaInstalled(false)
    }
  }

  useEffect(() => {
    if (open) {
      setOs(detectOS())
      setCurrentStep(1)
      checkOllamaInstalled()
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
          <DialogTitle className="text-lg">AI 챗봇 설정 ({osConfig.name})</DialogTitle>
          <DialogDescription>
            RAG 기능 사용을 위한 로컬 Ollama 설정 가이드
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-3">
          {/* Step 1: Ollama 설치 */}
          <Card className={currentStep >= 1 ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">
                  1. Ollama 다운로드 및 설치 {ollamaInstalled && <span className="text-xs text-green-600">✓ 설치됨</span>}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {ollamaInstalled ? (
                <p className="text-sm text-green-600">✓ Ollama가 이미 설치되어 있습니다</p>
              ) : (
                <>
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
                  <p className="text-xs text-muted-foreground">설치 후 안내에 따라 설치를 완료하세요</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Step 2: CORS 설정 */}
          <Card className={currentStep >= 2 ? 'border-primary' : 'opacity-50'}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Terminal className="h-4 w-4 text-red-600" />
                </div>
                <CardTitle className="text-base">2. CORS 설정 (중요!)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="bg-red-50 border border-red-200 rounded-md p-2">
                <p className="text-xs text-red-800 font-medium">
                  ⚠️ Vercel 배포 환경에서는 CORS 설정이 필수입니다!
                </p>
              </div>

              <div className="flex items-center gap-2 bg-muted p-2 rounded-md mt-1">
                <code className="flex-1 text-xs font-mono whitespace-pre-wrap break-all">
                  {os === 'windows'
                    ? `$env:OLLAMA_ORIGINS="${getCurrentDomain()}"; ollama serve`
                    : `OLLAMA_ORIGINS="${getCurrentDomain()}" ollama serve`}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const cmd =
                      os === 'windows'
                        ? `$env:OLLAMA_ORIGINS="${getCurrentDomain()}"; ollama serve`
                        : `OLLAMA_ORIGINS="${getCurrentDomain()}" ollama serve`
                    copyCommand(cmd)
                    setCurrentStep(3)
                  }}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-green-600">✓ 복사되었습니다!</p>}

              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  영구 설정 방법 (권장)
                </summary>
                <div className="mt-2 space-y-2 pl-4">
                  {os === 'windows' ? (
                    <>
                      <p className="font-medium">Windows 시스템 환경변수 등록:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Win + X → 시스템 → 고급 시스템 설정</li>
                        <li>환경 변수 클릭</li>
                        <li>시스템 변수에서 "새로 만들기"</li>
                        <li>
                          변수 이름: <code className="bg-muted px-1">OLLAMA_ORIGINS</code>
                        </li>
                        <li>
                          변수 값: <code className="bg-muted px-1">{getCurrentDomain()}</code>
                        </li>
                        <li>Ollama 재시작</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">~/.bashrc 또는 ~/.zshrc에 추가:</p>
                      <code className="block bg-muted p-2 rounded mt-1">
                        export OLLAMA_ORIGINS="{getCurrentDomain()}"
                      </code>
                      <p className="text-muted-foreground">그 후 터미널 재시작</p>
                    </>
                  )}
                </div>
              </details>
            </CardContent>
          </Card>

          {/* Step 3: 모델 다운로드 */}
          <Card className={currentStep >= 3 ? 'border-primary' : 'opacity-50'}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Terminal className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">3. AI 모델 다운로드</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">① 새 터미널 창 열기 → ② 아래 명령어 실행</p>
              <p className="text-xs text-muted-foreground">(약 5-10분 소요, ~4GB)</p>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        다른 모델도 사용 가능합니다
                        <br />
                        (예: llama3, gemma, mistral 등)
                        <br />
                        <a
                          href="https://ollama.com/library"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-primary-foreground/80"
                        >
                          ollama.com/library
                        </a>
                        에서 확인하세요
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                  <code className="flex-1 text-xs font-mono">
                    ollama pull mxbai-embed-large && ollama pull qwen2.5:3b
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      copyCommand('ollama pull mxbai-embed-large && ollama pull qwen2.5:3b')
                      setCurrentStep(4)
                    }}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-600">✓ 복사되었습니다!</p>}
              </div>
            </CardContent>
          </Card>

          {/* Step 4: 연결 확인 */}
          <Card className={currentStep >= 4 ? 'border-primary' : 'opacity-50'}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">4. 연결 확인</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={handleRetry} className="w-full" disabled={currentStep < 4}>
                연결 재시도
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            나중에 하기
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>단계:</span>
            <span className="font-medium">{currentStep}/4</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
