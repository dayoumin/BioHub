/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomePage from '@/app/page'

// localStorage mock
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

describe('HomePage - 즐겨찾기 및 카테고리 선택 기능', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('1. localStorage 영구 저장 테스트', () => {
    it('즐겨찾기 추가 시 localStorage에 저장되어야 함', async () => {
      render(<HomePage />)

      // 카테고리 선택
      const categoryButton = screen.getByText('기초 분석')
      fireEvent.click(categoryButton)

      // 즐겨찾기 버튼 찾기 (첫 번째 분석 방법)
      const favoriteButtons = screen.getAllByLabelText(/즐겨찾기/)
      fireEvent.click(favoriteButtons[0])

      // localStorage에 저장되었는지 확인
      await waitFor(() => {
        const saved = localStorageMock.getItem('statPlatform_favorites')
        expect(saved).toBeTruthy()
        expect(JSON.parse(saved || '[]').length).toBeGreaterThan(0)
      })
    })

    it('PC 재시작 시나리오: localStorage에서 즐겨찾기 복원', () => {
      // 1단계: 기존 즐겨찾기 설정 (PC 껐다 켜기 전)
      localStorageMock.setItem('statPlatform_favorites', JSON.stringify(['descriptive', 't-test']))

      // 2단계: 페이지 재렌더링 (PC 재시작 후)
      render(<HomePage />)

      // 3단계: 즐겨찾기가 복원되었는지 확인
      const myToolsSection = screen.getByText('내 통계 도구')
      expect(myToolsSection).toBeInTheDocument()

      // "즐겨찾기한 통계가 없습니다" 메시지가 없어야 함
      expect(screen.queryByText('즐겨찾기한 통계가 없습니다')).not.toBeInTheDocument()
    })

    it('즐겨찾기 해제 시 localStorage에서 제거되어야 함', async () => {
      // 초기 즐겨찾기 설정
      localStorageMock.setItem('statPlatform_favorites', JSON.stringify(['descriptive']))
      render(<HomePage />)

      // 즐겨찾기 해제 버튼 클릭
      const unfavoriteButton = screen.getByLabelText('즐겨찾기 해제')
      fireEvent.click(unfavoriteButton)

      // localStorage에서 제거되었는지 확인
      await waitFor(() => {
        const saved = localStorageMock.getItem('statPlatform_favorites')
        expect(JSON.parse(saved || '[]').length).toBe(0)
      })
    })
  })

  describe('2. 카테고리 선택 시 상단 표시 테스트', () => {
    it('카테고리 선택 시 "내 통계 도구" 위에 표시되어야 함', () => {
      render(<HomePage />)

      // 카테고리 선택
      const categoryButtons = screen.getAllByText('기초 분석')
      fireEvent.click(categoryButtons[0]) // 첫 번째 버튼 클릭

      // 선택된 카테고리 섹션이 표시되어야 함 (UI 개선: "분석 방법" 텍스트 제거됨)
      // 버튼과 제목 두 곳에 나타나므로 getAllByText 사용
      const categoryTitles = screen.getAllByText('기초 분석')
      expect(categoryTitles.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('닫기')).toBeInTheDocument()

      // 내 통계 도구 섹션도 존재해야 함
      expect(screen.getByText('내 통계 도구')).toBeInTheDocument()
    })

    it('닫기 버튼 클릭 시 카테고리 섹션이 숨겨져야 함', () => {
      render(<HomePage />)

      // 카테고리 선택
      const categoryButton = screen.getByText('기초 분석')
      fireEvent.click(categoryButton)

      // 카테고리 섹션이 표시됨을 확인
      const categoryTitle = screen.getAllByText('기초 분석')
      expect(categoryTitle.length).toBeGreaterThan(0)

      // 닫기 버튼 클릭
      const closeButton = screen.getByText('닫기')
      fireEvent.click(closeButton)

      // 닫기 버튼이 사라져야 함 (카테고리 섹션이 숨겨짐)
      expect(screen.queryByText('닫기')).not.toBeInTheDocument()
    })
  })

  describe('3. 즐겨찾기 UI 동작 테스트', () => {
    it('즐겨찾기가 없을 때 안내 메시지 표시', () => {
      render(<HomePage />)

      expect(screen.getByText('즐겨찾기한 통계가 없습니다')).toBeInTheDocument()
      // UI 개선: "별표" → "핀 아이콘"으로 변경됨
      expect(screen.getByText(/카테고리에서 분석 방법을 선택하고 핀 아이콘을 클릭하세요/)).toBeInTheDocument()
    })

    it('즐겨찾기가 있을 때 목록 표시', () => {
      // 초기 즐겨찾기 설정
      localStorageMock.setItem('statPlatform_favorites', JSON.stringify(['descriptive']))
      render(<HomePage />)

      // 안내 메시지가 없어야 함
      expect(screen.queryByText('즐겨찾기한 통계가 없습니다')).not.toBeInTheDocument()

      // 즐겨찾기 해제 버튼이 보여야 함
      expect(screen.getByLabelText('즐겨찾기 해제')).toBeInTheDocument()
    })
  })

  describe('4. localStorage 에러 처리 테스트', () => {
    it('잘못된 JSON 형식 시 에러 처리', () => {
      // 잘못된 JSON 저장
      localStorageMock.setItem('statPlatform_favorites', 'invalid-json')

      // 콘솔 에러를 모킹
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<HomePage />)

      // 에러가 발생했지만 페이지는 정상 렌더링되어야 함
      expect(screen.getByText('통계 분석 카테고리')).toBeInTheDocument()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load favorites:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })
})
