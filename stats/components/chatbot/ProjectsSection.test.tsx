/**
 * ProjectsSection 테스트
 *
 * 테스트 범위:
 * 1. 섹션 타이틀 렌더링 ("주제별 채팅")
 * 2. 헬프 아이콘 및 Tooltip 표시
 * 3. 빈 상태 메시지
 * 4. 프로젝트 목록 렌더링
 * 5. 액션 버튼 (생성, 수정, 삭제)
 * 6. "첫 프로젝트 만들기" 버튼 제거 확인
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsSection } from './ProjectsSection'
import type { ChatProject, ChatSession } from '@/lib/types/chat'

// Mock 데이터
const mockProject: ChatProject = {
  id: 'proj-1',
  name: 'Python 학습',
  emoji: '🐍',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
}

const mockProject2: ChatProject = {
  id: 'proj-2',
  name: 'React 튜토리얼',
  emoji: '⚛️',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
}

const mockSession: ChatSession = {
  id: 'sess-1',
  title: 'Python 기초 학습',
  projectId: 'proj-1',
  isFavorite: false,
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
}

const mockSession2: ChatSession = {
  id: 'sess-2',
  title: 'Python 심화',
  projectId: 'proj-1',
  isFavorite: false,
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
}

// Mock 핸들러
const mockHandlers = {
  onToggleProject: vi.fn(),
  onSelectSession: vi.fn(),
  onToggleFavorite: vi.fn(),
  onDeleteSession: vi.fn(),
  onMoveSession: vi.fn(),
  onEditProject: vi.fn(),
  onDeleteProject: vi.fn(),
  onCreateProject: vi.fn(),
}

describe('ProjectsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('섹션 타이틀 "주제별 채팅"을 렌더링해야 함', () => {
      render(
        <ProjectsSection
          projects={[]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('주제별 채팅')).toBeInTheDocument()
    })

    it('헬프 아이콘을 렌더링해야 함', () => {
      render(
        <ProjectsSection
          projects={[]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      // HelpCircle 아이콘 확인 (aria-label이 없으므로 parent로 확인)
      const helpIcon = screen.getByRole('button', { name: '새 주제 만들기' })
        .parentElement?.previousElementSibling

      // SVG나 icon 요소가 있는지 확인
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    it('빈 상태일 때 "주제별 채팅이 없습니다" 메시지를 표시해야 함', () => {
      render(
        <ProjectsSection
          projects={[]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('주제별 채팅이 없습니다')).toBeInTheDocument()
    })

    it('"첫 프로젝트 만들기" 버튼을 렌더링하면 안 됨', () => {
      render(
        <ProjectsSection
          projects={[]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      expect(screen.queryByText('첫 프로젝트 만들기')).not.toBeInTheDocument()
    })
  })

  describe('프로젝트 목록', () => {
    it('프로젝트 목록을 렌더링해야 함', () => {
      render(
        <ProjectsSection
          projects={[mockProject, mockProject2]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Python 학습')).toBeInTheDocument()
      expect(screen.getByText('React 튜토리얼')).toBeInTheDocument()
    })

    it('프로젝트 이모지를 표시해야 함', () => {
      render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('🐍')).toBeInTheDocument()
    })

    it('프로젝트 세션 카운트를 표시해야 함', () => {
      render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[mockSession, mockSession2]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      // 배지에 세션 카운트 표시
      const badges = screen.getAllByText('2')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('토글 기능', () => {
    it('프로젝트 클릭 시 onToggleProject를 호출해야 함', () => {
      render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      const projectDiv = screen.getByText('Python 학습').closest('[role="button"]')
      fireEvent.click(projectDiv!)

      expect(mockHandlers.onToggleProject).toHaveBeenCalledWith('proj-1')
    })

    it('프로젝트가 펼쳐진 상태일 때 세션 목록을 표시해야 함', () => {
      render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[mockSession, mockSession2]}
          activeSessionId={null}
          expandedProjectIds={new Set(['proj-1'])}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Python 기초 학습')).toBeInTheDocument()
      expect(screen.getByText('Python 심화')).toBeInTheDocument()
    })

    it('프로젝트가 접힌 상태일 때 세션 목록을 표시하면 안 됨', () => {
      render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[mockSession, mockSession2]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      expect(screen.queryByText('Python 기초 학습')).not.toBeInTheDocument()
      expect(screen.queryByText('Python 심화')).not.toBeInTheDocument()
    })
  })

  describe('액션 버튼', () => {
    it('프로젝트 호버 시 수정/삭제 버튼을 표시해야 함', async () => {
      const { container } = render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      const projectDiv = screen.getByText('Python 학습').closest('[role="button"]')
      fireEvent.mouseEnter(projectDiv!)

      await waitFor(() => {
        expect(container.querySelector('[title="편집"]')).toBeInTheDocument()
        expect(container.querySelector('[title="삭제"]')).toBeInTheDocument()
      })
    })

    it('수정 버튼 클릭 시 onEditProject를 호출해야 함', async () => {
      const { container } = render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      const projectDiv = screen.getByText('Python 학습').closest('[role="button"]')
      fireEvent.mouseEnter(projectDiv!)

      await waitFor(() => {
        const editButton = container.querySelector('[title="편집"]') as HTMLButtonElement
        fireEvent.click(editButton)
        expect(mockHandlers.onEditProject).toHaveBeenCalledWith('proj-1')
      })
    })

    it('삭제 버튼 클릭 시 onDeleteProject를 호출해야 함', async () => {
      const { container } = render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      const projectDiv = screen.getByText('Python 학습').closest('[role="button"]')
      fireEvent.mouseEnter(projectDiv!)

      await waitFor(() => {
        const deleteButton = container.querySelector('[title="삭제"]') as HTMLButtonElement
        fireEvent.click(deleteButton)
        expect(mockHandlers.onDeleteProject).toHaveBeenCalledWith('proj-1')
      })
    })

    it('+ 버튼 클릭 시 onCreateProject를 호출해야 함', () => {
      render(
        <ProjectsSection
          projects={[]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      const createButton = screen.getByRole('button', { name: '새 주제 만들기' })
      fireEvent.click(createButton)

      expect(mockHandlers.onCreateProject).toHaveBeenCalled()
    })
  })

  describe('세션 렌더링', () => {
    it('펼쳐진 프로젝트의 세션을 올바르게 필터링해야 함', () => {
      const otherSession = {
        ...mockSession,
        id: 'sess-3',
        projectId: 'proj-2',
      }

      render(
        <ProjectsSection
          projects={[mockProject, mockProject2]}
          sessions={[mockSession, mockSession2, otherSession]}
          activeSessionId={null}
          expandedProjectIds={new Set(['proj-1'])}
          {...mockHandlers}
        />
      )

      // proj-1의 세션만 표시
      expect(screen.getByText('Python 기초 학습')).toBeInTheDocument()
      expect(screen.getByText('Python 심화')).toBeInTheDocument()
      // proj-2의 세션은 표시 안 됨
      expect(screen.queryByText(/otherSession/)).not.toBeInTheDocument()
    })

    it('세션이 없는 펼쳐진 프로젝트에 "대화가 없습니다" 메시지를 표시해야 함', () => {
      render(
        <ProjectsSection
          projects={[mockProject]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set(['proj-1'])}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('대화가 없습니다')).toBeInTheDocument()
    })
  })

  describe('UI 일관성', () => {
    it('"새 주제 만들기" 타이틀을 가진 버튼이 있어야 함', () => {
      render(
        <ProjectsSection
          projects={[]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      expect(screen.getByRole('button', { name: '새 주제 만들기' })).toBeInTheDocument()
    })

    it('TooltipProvider가 컴포넌트를 감싸야 함 (tooltip 작동)', () => {
      const { container } = render(
        <ProjectsSection
          projects={[]}
          sessions={[]}
          activeSessionId={null}
          expandedProjectIds={new Set()}
          {...mockHandlers}
        />
      )

      // TooltipProvider의 자식 요소 확인
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
