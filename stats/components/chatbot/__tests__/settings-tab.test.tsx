/**
 * SettingsTab 컴포넌트 테스트
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { SettingsTab } from '../settings-tab'

// EnvironmentIndicator 모킹
vi.mock('@/components/rag/environment-indicator', () => ({
  EnvironmentIndicator: () => <div data-testid="environment-indicator">Environment Indicator Mock</div>,
}))

describe('SettingsTab', () => {
  it('설정 제목과 설명이 렌더링됨', () => {
    render(<SettingsTab />)

    expect(screen.getByText('설정')).toBeInTheDocument()
    expect(screen.getByText('RAG 챗봇 및 환경 설정을 관리합니다.')).toBeInTheDocument()
  })

  it('환경 정보 섹션이 렌더링됨', () => {
    render(<SettingsTab />)

    expect(screen.getByText('환경 정보')).toBeInTheDocument()
    expect(
      screen.getByText('현재 배포 환경 및 서버 가용성을 확인합니다.')
    ).toBeInTheDocument()
  })

  it('EnvironmentIndicator 컴포넌트가 렌더링됨', () => {
    render(<SettingsTab />)

    expect(screen.getByTestId('environment-indicator')).toBeInTheDocument()
  })

  it('Card 컴포넌트로 섹션이 감싸져 있음', () => {
    const { container } = render(<SettingsTab />)

    // shadcn Card 컴포넌트는 특정 클래스를 가짐
    const cards = container.querySelectorAll('[class*="card"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('max-w-4xl 컨테이너로 레이아웃됨', () => {
    const { container } = render(<SettingsTab />)

    const containerDiv = container.querySelector('.max-w-4xl')
    expect(containerDiv).toBeInTheDocument()
  })
})
