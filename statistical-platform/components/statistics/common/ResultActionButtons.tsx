import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import {
  Download,
  FileText,
  Image,
  Share2,
  Copy,
  Mail,
  FileSpreadsheet,
  FileJson,
  Printer,
  Save,
  BookOpen,
  Code,
  BarChart,
  ChevronDown,
  Clipboard,
  Link2,
  MessageSquare,
  FileImage,
  FilePlus
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExportOptions {
  format: 'word' | 'html'
  includeRawData?: boolean
  includeCharts?: boolean
  includeInterpretation?: boolean
  includeMethodology?: boolean
  includeReferences?: boolean
  language?: 'ko' | 'en'
}

export interface ShareOptions {
  method: 'link' | 'email' | 'clipboard'
  message?: string
  recipients?: string[]
  expiresIn?: number // hours
}

interface ResultActionButtonsProps {
  onExportReport?: (options: ExportOptions) => void
  onExportData?: (format: 'csv' | 'excel' | 'json' | 'spss') => void
  onExportChart?: (format: 'png' | 'svg' | 'pdf') => void
  onShare?: (options: ShareOptions) => void
  onSaveSession?: () => void
  onPrint?: () => void
  onCopyToClipboard?: () => void
  onGenerateCitation?: (style: 'apa' | 'mla' | 'chicago' | 'vancouver') => void
  onAddToNotebook?: (note?: string) => void
  resultId?: string
  className?: string
  compact?: boolean
  showLabels?: boolean
}

/**
 * 통계 분석 결과에 대한 액션 버튼 그룹
 * 내보내기, 공유, 저장 등 다양한 기능 제공
 */
export function ResultActionButtons({
  onExportReport,
  onExportData,
  onExportChart,
  onShare,
  onSaveSession,
  onPrint,
  onCopyToClipboard,
  onGenerateCitation,
  onAddToNotebook,
  resultId,
  className,
  compact = false,
  showLabels = true
}: ResultActionButtonsProps) {
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)
  const [notebookDialogOpen, setNotebookDialogOpen] = React.useState(false)

  const [exportOptions, setExportOptions] = React.useState<ExportOptions>({
    format: 'word',
    includeRawData: false,
    includeCharts: true,
    includeInterpretation: true,
    includeMethodology: false,
    includeReferences: false,
    language: 'ko'
  })

  const [shareOptions, setShareOptions] = React.useState<ShareOptions>({
    method: 'link',
    expiresIn: 24
  })

  const [notebookNote, setNotebookNote] = React.useState('')

  // 보고서 내보내기 처리
  const handleExportReport = () => {
    onExportReport?.(exportOptions)
    setExportDialogOpen(false)
    toast({
      title: '보고서 생성 중',
      description: `${exportOptions.format.toUpperCase()} 형식으로 보고서를 생성하고 있습니다...`,
    })
  }

  // 공유 처리
  const handleShare = () => {
    onShare?.(shareOptions)
    setShareDialogOpen(false)
    toast({
      title: '공유 완료',
      description: shareOptions.method === 'link' ? '공유 링크가 생성되었습니다.' : '공유되었습니다.',
    })
  }

  // 노트북에 추가
  const handleAddToNotebook = () => {
    onAddToNotebook?.(notebookNote)
    setNotebookDialogOpen(false)
    setNotebookNote('')
    toast({
      title: '노트북에 추가됨',
      description: '분석 결과가 노트북에 저장되었습니다.',
    })
  }

  // 클립보드 복사
  const handleCopyToClipboard = () => {
    onCopyToClipboard?.()
    toast({
      title: '복사 완료',
      description: '분석 결과가 클립보드에 복사되었습니다.',
    })
  }

  const buttonSize = compact ? 'sm' : 'default'
  const iconSize = compact ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {/* 보고서 내보내기 */}
        {onExportReport && (
          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => setExportDialogOpen(true)}
            className="group"
          >
            <FileText className={cn(iconSize, 'group-hover:scale-110 transition-transform')} />
            {showLabels && <span className="ml-2">보고서</span>}
          </Button>
        )}

        {/* 데이터 내보내기 드롭다운 */}
        {onExportData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={buttonSize} className="group">
                <Download className={cn(iconSize, 'group-hover:scale-110 transition-transform')} />
                {showLabels && <span className="ml-2">내보내기</span>}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>데이터 내보내기</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExportData('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV 파일
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportData('excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel 파일
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportData('json')}>
                <FileJson className="w-4 h-4 mr-2" />
                JSON 파일
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportData('spss')}>
                <FileText className="w-4 h-4 mr-2" />
                SPSS 파일
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 차트 내보내기 드롭다운 */}
        {onExportChart && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={buttonSize} className="group">
                <Image className={cn(iconSize, 'group-hover:scale-110 transition-transform')} />
                {showLabels && <span className="ml-2">차트</span>}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>차트 내보내기</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExportChart('png')}>
                <FileImage className="w-4 h-4 mr-2" />
                PNG 이미지
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportChart('svg')}>
                <FileImage className="w-4 h-4 mr-2" />
                SVG 벡터
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportChart('pdf')}>
                <FileText className="w-4 h-4 mr-2" />
                PDF 파일
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 공유 버튼 */}
        {onShare && (
          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => setShareDialogOpen(true)}
            className="group"
          >
            <Share2 className={cn(iconSize, 'group-hover:scale-110 transition-transform')} />
            {showLabels && <span className="ml-2">공유</span>}
          </Button>
        )}

        {/* 더보기 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size={buttonSize}>
              <ChevronDown className={iconSize} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {onCopyToClipboard && (
              <DropdownMenuItem onClick={handleCopyToClipboard}>
                <Copy className="w-4 h-4 mr-2" />
                클립보드에 복사
              </DropdownMenuItem>
            )}

            {onPrint && (
              <DropdownMenuItem onClick={onPrint}>
                <Printer className="w-4 h-4 mr-2" />
                인쇄
              </DropdownMenuItem>
            )}

            {onSaveSession && (
              <DropdownMenuItem onClick={onSaveSession}>
                <Save className="w-4 h-4 mr-2" />
                세션 저장
              </DropdownMenuItem>
            )}

            {onAddToNotebook && (
              <DropdownMenuItem onClick={() => setNotebookDialogOpen(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                노트북에 추가
              </DropdownMenuItem>
            )}

            {onGenerateCitation && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Code className="w-4 h-4 mr-2" />
                  인용 생성
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onGenerateCitation('apa')}>
                    APA 스타일
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onGenerateCitation('mla')}>
                    MLA 스타일
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onGenerateCitation('chicago')}>
                    Chicago 스타일
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onGenerateCitation('vancouver')}>
                    Vancouver 스타일
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 보고서 내보내기 다이얼로그 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>분석 결과 내보내기</DialogTitle>
            <DialogDescription>
              분석 결과를 파일로 저장합니다. 형식을 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 형식 선택 */}
            <div className="space-y-2">
              <Label>출력 형식</Label>
              <RadioGroup
                value={exportOptions.format}
                onValueChange={(value) =>
                  setExportOptions({ ...exportOptions, format: value as ExportOptions['format'] })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="word" id="word" />
                  <Label htmlFor="word">Word 문서 (.docx)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="html" id="html" />
                  <Label htmlFor="html">HTML 웹페이지 (.html)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* 포함 옵션 */}
            <div className="space-y-2">
              <Label>포함할 내용</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="charts"
                    checked={exportOptions.includeCharts}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeCharts: !!checked })
                    }
                  />
                  <Label htmlFor="charts">차트 및 그래프</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="interpretation"
                    checked={exportOptions.includeInterpretation}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeInterpretation: !!checked })
                    }
                  />
                  <Label htmlFor="interpretation">결과 해석</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rawData"
                    checked={exportOptions.includeRawData}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeRawData: !!checked })
                    }
                  />
                  <Label htmlFor="rawData">원본 데이터</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="methodology"
                    checked={exportOptions.includeMethodology}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeMethodology: !!checked })
                    }
                  />
                  <Label htmlFor="methodology">분석 방법론</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="references"
                    checked={exportOptions.includeReferences}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeReferences: !!checked })
                    }
                  />
                  <Label htmlFor="references">참고문헌</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleExportReport} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              내보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공유 다이얼로그 */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>분석 결과 공유</DialogTitle>
            <DialogDescription>
              분석 결과를 다른 사람과 공유합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>공유 방법</Label>
              <RadioGroup
                value={shareOptions.method}
                onValueChange={(value) =>
                  setShareOptions({ ...shareOptions, method: value as ShareOptions['method'] })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link">공유 링크 생성</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">이메일로 전송</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clipboard" id="clipboard" />
                  <Label htmlFor="clipboard">클립보드에 복사</Label>
                </div>
              </RadioGroup>
            </div>

            {shareOptions.method === 'link' && (
              <div className="space-y-2">
                <Label>링크 유효 기간</Label>
                <RadioGroup
                  value={shareOptions.expiresIn?.toString()}
                  onValueChange={(value) =>
                    setShareOptions({ ...shareOptions, expiresIn: parseInt(value) })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="24" id="24h" />
                    <Label htmlFor="24h">24시간</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="168" id="7d" />
                    <Label htmlFor="7d">7일</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="720" id="30d" />
                    <Label htmlFor="30d">30일</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {shareOptions.method === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="recipients">받는 사람 (쉼표로 구분)</Label>
                <Textarea
                  id="recipients"
                  placeholder="email1@example.com, email2@example.com"
                  onChange={(e) =>
                    setShareOptions({
                      ...shareOptions,
                      recipients: e.target.value.split(',').map(s => s.trim())
                    })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">메시지 (선택사항)</Label>
              <Textarea
                id="message"
                placeholder="분석 결과를 공유합니다."
                value={shareOptions.message || ''}
                onChange={(e) =>
                  setShareOptions({ ...shareOptions, message: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              공유
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 노트북 추가 다이얼로그 */}
      <Dialog open={notebookDialogOpen} onOpenChange={setNotebookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>노트북에 추가</DialogTitle>
            <DialogDescription>
              분석 결과를 노트북에 저장하고 메모를 추가할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">메모 (선택사항)</Label>
              <Textarea
                id="note"
                placeholder="이 분석에 대한 메모를 입력하세요..."
                value={notebookNote}
                onChange={(e) => setNotebookNote(e.target.value)}
                className="h-32"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotebookDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddToNotebook}>
              <BookOpen className="w-4 h-4 mr-2" />
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
