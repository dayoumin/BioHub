import { render, screen } from '@testing-library/react'
import type { ResolvedEntity } from '@/lib/research/entity-resolver'
import { ReportComposer } from '../ReportComposer'

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}))

describe('ReportComposer', () => {
  it('shows quick export copy distinct from the writing flow', () => {
    const entities: ResolvedEntity[] = [
      {
        ref: {
          id: 'ref-1',
          projectId: 'proj-1',
          entityKind: 'protein-result',
          entityId: 'protein-1',
          label: 'Protein result',
          createdAt: '2026-04-24T00:00:00.000Z',
        },
        loaded: true,
        summary: {
          title: 'Protein properties',
          subtitle: '321 aa',
          date: 'today',
          timestamp: Date.now(),
        },
      },
    ]

    render(
      <ReportComposer
        open
        onOpenChange={vi.fn()}
        entities={entities}
        projectId="proj-1"
        projectName="Project One"
      />,
    )

    expect(screen.getByRole('heading', { name: '빠른 요약 내보내기' })).toBeInTheDocument()
    expect(screen.getByText('선택한 항목을 한 번에 요약해 복사하거나 HTML로 저장합니다. 문서 초안 생성, 섹션 편집, 저장은 자료 작성 문서 흐름에서 진행하세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Markdown 복사' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'HTML 다운로드' })).toBeInTheDocument()
  })
})
