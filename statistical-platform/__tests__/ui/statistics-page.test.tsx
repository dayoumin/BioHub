/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import StatisticsMainPage from '@/app/(dashboard)/statistics/page'

// Mock Next.js Link
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
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('StatisticsMainPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('초기 렌더링', () => {
    test('4개 탭이 모두 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      expect(screen.getByRole('tab', { name: /홈/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /통계분석/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /챗봇/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /설정/i })).toBeInTheDocument()
    })

    test('기본적으로 홈 탭이 활성화되어야 함', () => {
      render(<StatisticsMainPage />)

      const homeTab = screen.getByRole('tab', { name: /홈/i })
      expect(homeTab).toHaveAttribute('data-state', 'active')
    })

    test('스마트 분석 버튼이 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      expect(screen.getByText('스마트 분석')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /스마트 분석 시작/i })).toBeDisabled()
    })
  })

  describe('홈 탭 - 즐겨찾기 없음', () => {
    test('즐겨찾기가 없을 때 안내 메시지가 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      expect(screen.getByText('즐겨찾기한 통계가 없습니다')).toBeInTheDocument()
      expect(screen.getByText(/통계분석 탭에서 별표/i)).toBeInTheDocument()
    })

    test('"통계분석 보기" 버튼 클릭 시 통계분석 탭으로 이동', () => {
      render(<StatisticsMainPage />)

      const button = screen.getByRole('button', { name: /통계분석 보기/i })
      fireEvent.click(button)

      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      expect(statisticsTab).toHaveAttribute('data-state', 'active')
    })
  })

  describe('통계분석 탭', () => {
    test('통계분석 탭 클릭 시 활성화되어야 함', () => {
      render(<StatisticsMainPage />)

      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      fireEvent.click(statisticsTab)

      expect(statisticsTab).toHaveAttribute('data-state', 'active')
    })

    test('안내 메시지가 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      fireEvent.click(statisticsTab)

      expect(screen.getByText(/별표를 클릭하면 홈 화면/i)).toBeInTheDocument()
    })

    test('6개 카테고리가 모두 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      fireEvent.click(statisticsTab)

      // 카테고리 제목 확인
      expect(screen.getByText('기술통계')).toBeInTheDocument()
      expect(screen.getByText('가설검정')).toBeInTheDocument()
      expect(screen.getByText('분산분석')).toBeInTheDocument()
      expect(screen.getByText('회귀분석')).toBeInTheDocument()
      expect(screen.getByText('비모수검정')).toBeInTheDocument()
      expect(screen.getByText('고급분석')).toBeInTheDocument()
    })

    test('각 카테고리에 용도 설명이 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      fireEvent.click(statisticsTab)

      expect(screen.getByText('데이터 요약 및 기본 특성 파악')).toBeInTheDocument()
      expect(screen.getByText('평균 차이 검정 및 가설 검증')).toBeInTheDocument()
    })
  })

  describe('즐겨찾기 기능', () => {
    test('별표 버튼 클릭 시 즐겨찾기에 추가되어야 함', async () => {
      render(<StatisticsMainPage />)

      // 통계분석 탭으로 이동
      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      fireEvent.click(statisticsTab)

      // 별표 버튼 찾기 (첫 번째 통계)
      const starButtons = screen.getAllByLabelText('즐겨찾기 추가')
      expect(starButtons.length).toBeGreaterThan(0)

      // 첫 번째 별표 클릭
      fireEvent.click(starButtons[0])

      // localStorage에 저장되었는지 확인
      await waitFor(() => {
        const saved = localStorage.getItem('statisticsFavorites')
        expect(saved).toBeTruthy()
        const favorites = JSON.parse(saved!)
        expect(favorites.length).toBe(1)
      })

      // 홈 탭으로 이동
      const homeTab = screen.getByRole('tab', { name: /홈/i })
      fireEvent.click(homeTab)

      // "즐겨찾기한 통계가 없습니다" 메시지가 사라졌는지 확인
      expect(screen.queryByText('즐겨찾기한 통계가 없습니다')).not.toBeInTheDocument()

      // "1개" 배지가 표시되는지 확인
      expect(screen.getByText('1개')).toBeInTheDocument()
    })

    test('별표 버튼 재클릭 시 즐겨찾기에서 제거되어야 함', async () => {
      render(<StatisticsMainPage />)

      // 통계분석 탭으로 이동
      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      fireEvent.click(statisticsTab)

      // 별표 추가
      const starButtons = screen.getAllByLabelText('즐겨찾기 추가')
      fireEvent.click(starButtons[0])

      await waitFor(() => {
        expect(localStorage.getItem('statisticsFavorites')).toBeTruthy()
      })

      // 별표 제거
      const removeButton = screen.getByLabelText('즐겨찾기 해제')
      fireEvent.click(removeButton)

      // localStorage에서 제거되었는지 확인
      await waitFor(() => {
        const saved = localStorage.getItem('statisticsFavorites')
        const favorites = JSON.parse(saved!)
        expect(favorites.length).toBe(0)
      })
    })

    test('localStorage에 저장된 즐겨찾기가 페이지 로드 시 복원되어야 함', () => {
      // 미리 localStorage에 즐겨찾기 저장
      localStorage.setItem('statisticsFavorites', JSON.stringify(['descriptive-stats']))

      render(<StatisticsMainPage />)

      // "1개" 배지가 표시되는지 확인
      expect(screen.getByText('1개')).toBeInTheDocument()

      // "즐겨찾기한 통계가 없습니다" 메시지가 없어야 함
      expect(screen.queryByText('즐겨찾기한 통계가 없습니다')).not.toBeInTheDocument()
    })

    test('잘못된 localStorage 데이터는 에러 없이 처리되어야 함', () => {
      // 잘못된 JSON 데이터 저장
      localStorage.setItem('statisticsFavorites', 'invalid-json')

      // 콘솔 에러를 모킹하여 테스트 로그 깔끔하게 유지
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<StatisticsMainPage />)

      // 에러 없이 렌더링되어야 함
      expect(screen.getByText('즐겨찾기한 통계가 없습니다')).toBeInTheDocument()

      // 콘솔 에러가 호출되었는지 확인
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('챗봇 탭', () => {
    test('챗봇 탭 클릭 시 활성화되어야 함', () => {
      render(<StatisticsMainPage />)

      const chatbotTab = screen.getByRole('tab', { name: /챗봇/i })
      fireEvent.click(chatbotTab)

      expect(chatbotTab).toHaveAttribute('data-state', 'active')
    })

    test('"준비 중입니다" 메시지가 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      const chatbotTab = screen.getByRole('tab', { name: /챗봇/i })
      fireEvent.click(chatbotTab)

      expect(screen.getByText('준비 중입니다')).toBeInTheDocument()
      expect(screen.getByText(/AI 챗봇 기능은 곧 추가될 예정/i)).toBeInTheDocument()
    })

    test('4개 예정 기능이 표시되어야 함', () => {
      render(<StatisticsMainPage />)

      const chatbotTab = screen.getByRole('tab', { name: /챗봇/i })
      fireEvent.click(chatbotTab)

      expect(screen.getByText('통계 방법 추천')).toBeInTheDocument()
      expect(screen.getByText('데이터 분석 상담')).toBeInTheDocument()
      expect(screen.getByText('실험 설계 조언')).toBeInTheDocument()
      expect(screen.getByText('결과 해석 도움')).toBeInTheDocument()
    })
  })

  describe('설정 탭', () => {
    test('설정 탭 클릭 시 활성화되어야 함', () => {
      render(<StatisticsMainPage />)

      const settingsTab = screen.getByRole('tab', { name: /설정/i })
      fireEvent.click(settingsTab)

      expect(settingsTab).toHaveAttribute('data-state', 'active')
    })

    test('"모든 통계를 즐겨찾기에 추가" 버튼이 작동해야 함', async () => {
      render(<StatisticsMainPage />)

      const settingsTab = screen.getByRole('tab', { name: /설정/i })
      fireEvent.click(settingsTab)

      const addAllButton = screen.getByRole('button', { name: /모든 통계를 즐겨찾기에 추가/i })
      fireEvent.click(addAllButton)

      // localStorage에 모든 항목이 추가되었는지 확인
      await waitFor(() => {
        const saved = localStorage.getItem('statisticsFavorites')
        expect(saved).toBeTruthy()
        const favorites = JSON.parse(saved!)
        expect(favorites.length).toBeGreaterThan(0)
      })

      // 홈 탭으로 이동하여 확인
      const homeTab = screen.getByRole('tab', { name: /홈/i })
      fireEvent.click(homeTab)

      expect(screen.queryByText('즐겨찾기한 통계가 없습니다')).not.toBeInTheDocument()
    })

    test('"모든 즐겨찾기 해제" 버튼이 작동해야 함', async () => {
      // 먼저 즐겨찾기 추가
      localStorage.setItem('statisticsFavorites', JSON.stringify(['descriptive-stats', 'independent-t-test']))

      render(<StatisticsMainPage />)

      const settingsTab = screen.getByRole('tab', { name: /설정/i })
      fireEvent.click(settingsTab)

      const clearAllButton = screen.getByRole('button', { name: /모든 즐겨찾기 해제/i })
      fireEvent.click(clearAllButton)

      // localStorage가 비워졌는지 확인
      await waitFor(() => {
        const saved = localStorage.getItem('statisticsFavorites')
        expect(saved).toBeTruthy()
        const favorites = JSON.parse(saved!)
        expect(favorites.length).toBe(0)
      })

      // 홈 탭으로 이동하여 확인
      const homeTab = screen.getByRole('tab', { name: /홈/i })
      fireEvent.click(homeTab)

      expect(screen.getByText('즐겨찾기한 통계가 없습니다')).toBeInTheDocument()
    })
  })

  describe('반응형 디자인', () => {
    test('즐겨찾기 항목이 그리드로 표시되어야 함', () => {
      localStorage.setItem('statisticsFavorites', JSON.stringify(['descriptive-stats', 'independent-t-test']))

      const { container } = render(<StatisticsMainPage />)

      // grid 클래스가 있는 요소 확인
      const gridElement = container.querySelector('.grid')
      expect(gridElement).toBeInTheDocument()
      expect(gridElement).toHaveClass('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4')
    })
  })

  describe('접근성', () => {
    test('별표 버튼에 aria-label이 있어야 함', () => {
      render(<StatisticsMainPage />)

      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })
      fireEvent.click(statisticsTab)

      const starButtons = screen.getAllByLabelText(/즐겨찾기/i)
      expect(starButtons.length).toBeGreaterThan(0)
    })

    test('탭 네비게이션이 키보드로 가능해야 함', () => {
      render(<StatisticsMainPage />)

      const homeTab = screen.getByRole('tab', { name: /홈/i })
      const statisticsTab = screen.getByRole('tab', { name: /통계분석/i })

      // 키보드 네비게이션 (실제로는 Tab 키 사용)
      homeTab.focus()
      expect(homeTab).toHaveFocus()

      statisticsTab.focus()
      expect(statisticsTab).toHaveFocus()
    })
  })
})
