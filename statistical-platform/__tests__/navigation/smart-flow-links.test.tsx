/**
 * 스마트 분석 링크 통합 테스트
 *
 * 목적: /smart-analysis 삭제 후 모든 링크가 /smart-flow로 올바르게 연결되는지 검증
 *
 * 테스트 범위:
 * 1. 홈페이지 (app/page.tsx) - 분석 시작하기 버튼
 * 2. 대시보드 (app/(dashboard)/dashboard/page.tsx) - 스마트 분석 카드
 * 3. /smart-analysis 경로 존재 여부 (삭제 확인)
 */

import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'
import DashboardPage from '@/app/(dashboard)/dashboard/page'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Smart Flow Links Integration', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('HomePage (/)', () => {
    it('should have a link to /smart-flow (not /smart-analysis)', () => {
      render(<HomePage />)

      // 버튼 텍스트가 "분석 시작하기"로 변경됨
      const link = screen.getByRole('link', { name: /분석 시작하기/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/smart-flow')
      expect(link).not.toHaveAttribute('href', '/smart-analysis')
    })

    it('should display "분석 시작하기" button', () => {
      render(<HomePage />)

      const button = screen.getByText('분석 시작하기')
      expect(button).toBeInTheDocument()
    })

    it('should not have any references to /smart-analysis', () => {
      const { container } = render(<HomePage />)
      const allLinks = container.querySelectorAll('a[href*="smart-analysis"]')

      expect(allLinks.length).toBe(0)
    })
  })

  describe('DashboardPage (/dashboard)', () => {
    it('should have a link to /smart-flow (not /smart-analysis)', () => {
      render(<DashboardPage />)

      const smartAnalysisCard = screen.getByText('스마트 분석')
      expect(smartAnalysisCard).toBeInTheDocument()

      const link = smartAnalysisCard.closest('a')
      expect(link).toHaveAttribute('href', '/smart-flow')
      expect(link).not.toHaveAttribute('href', '/smart-analysis')
    })

    it('should display "스마트 분석" card title', () => {
      render(<DashboardPage />)

      const title = screen.getByText('스마트 분석')
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('text-xl', 'font-semibold', 'text-primary')
    })

    it('should not have any references to /smart-analysis', () => {
      const { container } = render(<DashboardPage />)
      const allLinks = container.querySelectorAll('a[href*="smart-analysis"]')

      expect(allLinks.length).toBe(0)
    })
  })

  describe('URL Consistency', () => {
    it('all smart flow links should point to the same route', () => {
      const { container: homeContainer } = render(<HomePage />)
      const { container: dashboardContainer } = render(<DashboardPage />)

      const homeLink = homeContainer.querySelector('a[href*="smart"]')
      const dashboardLink = dashboardContainer.querySelector('a[href*="smart"]')

      expect(homeLink?.getAttribute('href')).toBe('/smart-flow')
      expect(dashboardLink?.getAttribute('href')).toBe('/smart-flow')
    })
  })

  describe('Deleted Route Verification', () => {
    it('should not import smart-analysis page (file deleted)', () => {
      // 파일이 삭제되었으므로 import 시도 시 에러 발생 확인
      expect(() => {
        require('@/app/(dashboard)/smart-analysis/page')
      }).toThrow()
    })
  })
})
