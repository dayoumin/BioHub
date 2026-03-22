import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectDialog } from '../ProjectDialog'

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

describe('ProjectDialog', () => {
  it('생성 성공 전에는 닫지 않고, 완료 후 닫아야 함', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const deferred = deferredPromise()
    const onCreate = vi.fn(() => deferred.promise)

    render(
      <ProjectDialog
        open={true}
        onOpenChange={onOpenChange}
        onCreate={onCreate}
      />
    )

    await user.type(screen.getByLabelText('이름'), '새 주제')
    await user.click(screen.getByRole('button', { name: '만들기' }))

    expect(onCreate).toHaveBeenCalledWith('새 주제')
    expect(onOpenChange).not.toHaveBeenCalled()

    deferred.resolve()

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('생성 실패 시 다이얼로그를 닫지 않고 에러를 보여줘야 함', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onCreate = vi.fn().mockRejectedValue(new Error('failed'))

    render(
      <ProjectDialog
        open={true}
        onOpenChange={onOpenChange}
        onCreate={onCreate}
      />
    )

    await user.type(screen.getByLabelText('이름'), '실패 주제')
    await user.click(screen.getByRole('button', { name: '만들기' }))

    await waitFor(() => {
      expect(screen.getByText('저장에 실패했습니다. 다시 시도해 주세요.')).toBeInTheDocument()
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
