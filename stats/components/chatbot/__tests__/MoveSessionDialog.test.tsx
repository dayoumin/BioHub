import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ChatProject, ChatSession } from '@/lib/types/chat'
import { MoveSessionDialog } from '../MoveSessionDialog'

function deferredPromise<T = void>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const session: ChatSession = {
  id: 'session-1',
  title: '테스트 세션',
  projectId: 'project-1',
  isFavorite: false,
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isArchived: false,
}

const projects: ChatProject[] = [
  {
    id: 'project-1',
    name: '주제 1',
    emoji: '📁',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isArchived: false,
  },
]

describe('MoveSessionDialog', () => {
  it('이동 성공 전에는 닫지 않고, 완료 후 닫아야 함', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const deferred = deferredPromise()
    const onMove = vi.fn(() => deferred.promise)

    render(
      <MoveSessionDialog
        open={true}
        onOpenChange={onOpenChange}
        session={session}
        projects={projects}
        onMove={onMove}
      />
    )

    await user.click(screen.getByRole('button', { name: '이동' }))

    expect(onMove).toHaveBeenCalledWith('session-1', 'project-1')
    expect(onOpenChange).not.toHaveBeenCalled()

    deferred.resolve()

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('이동 실패 시 다이얼로그를 닫지 않고 에러를 보여줘야 함', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onMove = vi.fn().mockRejectedValue(new Error('failed'))

    render(
      <MoveSessionDialog
        open={true}
        onOpenChange={onOpenChange}
        session={session}
        projects={projects}
        onMove={onMove}
      />
    )

    await user.click(screen.getByRole('button', { name: '이동' }))

    await waitFor(() => {
      expect(screen.getByText('이동에 실패했습니다. 다시 시도해 주세요.')).toBeInTheDocument()
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
