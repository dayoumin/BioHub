'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, Copy, ExternalLink } from 'lucide-react'

interface OllamaSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry?: () => void
}

const SETUP_STEPS = [
  {
    id: 1,
    title: 'Ollama 설치',
    description: '운영체제에 맞는 Ollama를 다운로드하고 설치하세요',
    links: {
      windows: 'https://ollama.com/download/windows',
      mac: 'https://ollama.com/download/mac',
      linux: 'https://ollama.com/download/linux',
    },
  },
  {
    id: 2,
    title: '임베딩 모델 다운로드',
    description: '터미널/명령 프롬프트에서 다음 명령어를 실행하세요',
    command: 'ollama pull qwen3-embedding:0.6b',
  },
  {
    id: 3,
    title: '생성 모델 다운로드',
    description: '터미널/명령 프롬프트에서 다음 명령어를 실행하세요',
    command: 'ollama pull qwen3:4b',
  },
  {
    id: 4,
    title: '설치 완료',
    description: '아래 "연결 재시도" 버튼을 클릭하여 Ollama 연결을 확인하세요',
  },
]

export function OllamaSetupDialog({ open, onOpenChange, onRetry }: OllamaSetupDialogProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [copiedCommand, setCopiedCommand] = useState<number | null>(null)

  const toggleStep = (stepId: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    )
  }

  const copyCommand = async (command: string, stepId: number) => {
    await navigator.clipboard.writeText(command)
    setCopiedCommand(stepId)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>RAG 챗봇을 사용하려면 Ollama 설치가 필요합니다</DialogTitle>
          <DialogDescription>
            아래 단계를 따라 Ollama와 AI 모델을 설치하세요. 설치 후 연결 재시도 버튼을 클릭하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {SETUP_STEPS.map((step) => (
            <Card key={step.id} className={completedSteps.includes(step.id) ? 'border-green-500' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="mt-1 flex-shrink-0 hover:opacity-70 transition-opacity"
                  >
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {step.id}. {step.title}
                    </CardTitle>
                    <CardDescription className="mt-1">{step.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              {step.links && (
                <CardContent className="pt-0 pl-11">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(step.links!.windows, '_blank')}
                      className="gap-2"
                    >
                      Windows
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(step.links!.mac, '_blank')}
                      className="gap-2"
                    >
                      Mac
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(step.links!.linux, '_blank')}
                      className="gap-2"
                    >
                      Linux
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              )}

              {step.command && (
                <CardContent className="pt-0 pl-11">
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-md font-mono text-sm">
                    <code className="flex-1">{step.command}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCommand(step.command!, step.id)}
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {copiedCommand === step.id && (
                    <p className="text-xs text-green-600 mt-1 ml-1">명령어가 복사되었습니다!</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            나중에 하기
          </Button>
          <Button onClick={handleRetry} disabled={completedSteps.length < 4}>
            연결 재시도
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">💡 참고사항</p>
          <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
            <li>Ollama는 로컬에서 실행되며 인터넷 연결이 필요하지 않습니다</li>
            <li>모델 다운로드는 최초 1회만 필요합니다 (각 모델 약 2-3GB)</li>
            <li>설치 후 Ollama 서비스가 자동으로 실행됩니다</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
