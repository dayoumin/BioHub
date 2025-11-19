'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Copy, Download, Terminal, FileText } from 'lucide-react'
import { getDoclingEndpoint } from '@/lib/utils/environment-detector'

interface DoclingSetupDialogProps {
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
    pythonCheck: 'python --version',
    pipInstall: 'pip install docling',
    serverStart: 'uvicorn scripts.docling-server:app --port 8000',
  },
  mac: {
    name: 'macOS',
    pythonCheck: 'python3 --version',
    pipInstall: 'pip3 install docling',
    serverStart: 'uvicorn scripts.docling-server:app --port 8000',
  },
  linux: {
    name: 'Linux',
    pythonCheck: 'python3 --version',
    pipInstall: 'pip3 install docling',
    serverStart: 'uvicorn scripts.docling-server:app --port 8000',
  },
}

export function DoclingSetupDialog({ open, onOpenChange, onRetry }: DoclingSetupDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('windows')
  const [copiedStep, setCopiedStep] = useState<number | null>(null)
  const [doclingInstalled, setDoclingInstalled] = useState(false)

  // Docling 엔드포인트
  const doclingEndpoint = getDoclingEndpoint()

  // Docling 서버 상태 체크
  const checkDoclingServer = useCallback(async () => {
    try {
      const response = await fetch(`${doclingEndpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2초 타임아웃
      })
      if (response.ok) {
        setDoclingInstalled(true)
        setCurrentStep(4) // Step 4로 자동 이동 (서버 실행 중)
      } else {
        setDoclingInstalled(false)
        setCurrentStep(1) // Step 1 유지
      }
    } catch {
      setDoclingInstalled(false)
      setCurrentStep(1) // Step 1 유지
    }
  }, [doclingEndpoint])

  useEffect(() => {
    if (open) {
      // Dialog 열 때마다 상태 초기화 (이전 상태 제거)
      setOs(detectOS())
      setDoclingInstalled(false)
      setCurrentStep(1)
      checkDoclingServer()
    }
  }, [open, checkDoclingServer])

  const osConfig = OS_CONFIG[os]

  const copyCommand = async (command: string, step: number) => {
    await navigator.clipboard.writeText(command)
    setCopiedStep(step)
    setTimeout(() => setCopiedStep(null), 2000)
  }

  const handleRetry = async () => {
    // 먼저 서버 상태 체크
    await checkDoclingServer()

    // onRetry 콜백 호출 (부모 컴포넌트에서 처리)
    if (onRetry) {
      onRetry()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">PDF 파싱 설정 ({osConfig.name})</DialogTitle>
          <DialogDescription>
            고품질 PDF 파싱을 위한 Docling 설치 가이드
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-3">
          {/* Step 1: Python 확인 */}
          <Card className={currentStep >= 1 ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Terminal className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">
                  1. Python 설치 확인
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Python 3.8 이상이 필요합니다
              </p>
              <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                <code className="flex-1 text-xs font-mono">{osConfig.pythonCheck}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Python 확인 명령어 복사"
                  onClick={() => {
                    copyCommand(osConfig.pythonCheck, 1)
                    setCurrentStep(2)
                  }}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copiedStep === 1 && <p className="text-xs text-success">✓ 복사되었습니다!</p>}
              <p className="text-xs text-muted-foreground">
                Python이 없으면{' '}
                <a
                  href="https://www.python.org/downloads/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary hover:text-primary/80"
                >
                  python.org
                </a>
                에서 다운로드
              </p>
            </CardContent>
          </Card>

          {/* Step 2: Docling 설치 */}
          <Card className={currentStep >= 2 ? 'border-primary' : 'opacity-50'}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">
                  2. Docling 설치 {doclingInstalled && <span className="text-xs text-success">✓ 설치됨</span>}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {doclingInstalled ? (
                <p className="text-sm text-success">✓ Docling이 이미 설치되어 있습니다</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                    <code className="flex-1 text-xs font-mono">{osConfig.pipInstall}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Docling 설치 명령어 복사"
                      onClick={() => {
                        copyCommand(osConfig.pipInstall, 2)
                        setCurrentStep(3)
                      }}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {copiedStep === 2 && <p className="text-xs text-success">✓ 복사되었습니다!</p>}
                  <p className="text-xs text-muted-foreground">
                    설치에 약 2-5분 소요됩니다 (IBM Research 라이브러리)
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Step 3: 서버 실행 */}
          <Card className={currentStep >= 3 ? 'border-primary' : 'opacity-50'}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">3. Docling 서버 실행</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                프로젝트 루트에서 실행하세요
              </p>
              <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                <code className="flex-1 text-xs font-mono break-all">{osConfig.serverStart}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="서버 실행 명령어 복사"
                  onClick={() => {
                    copyCommand(osConfig.serverStart, 3)
                    setCurrentStep(4)
                  }}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copiedStep === 3 && <p className="text-xs text-success">✓ 복사되었습니다!</p>}
              <p className="text-xs text-muted-foreground">
                서버가 {doclingEndpoint}에서 실행됩니다
              </p>
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
            <CardContent className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                연결 재시도
              </Button>
              {currentStep < 4 && (
                <p className="text-xs text-muted-foreground text-center">
                  위 단계를 완료한 후 재시도하세요
                </p>
              )}
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
