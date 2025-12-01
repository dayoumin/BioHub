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

  describe('0. 홈페이지 레이아웃 및 UI 테스트', () => {
    it('스마트 데이터 분석 제목이 표시되어야 함', () => {
      render(<HomePage />)

      const heading = screen.getByText('스마트 데이터 분석')
      expect(heading).toBeInTheDocument()
    })

    it('분석 시작하기 버튼이 표시되어야 함', () => {
      render(<HomePage />)

      const startButton = screen.getByText('분석 시작하기')
      expect(startButton).toBeInTheDocument()
    })

    it('내 통계 도구 섹션이 표시되어야 함', () => {
      render(<HomePage />)

      const myToolsHeading = screen.getByText('내 통계 도구')
      expect(myToolsHeading).toBeInTheDocument()
    })

    it('하단 안내 메시지가 표시되어야 함', () => {
      render(<HomePage />)

      const footerText = screen.getByText(/모든 통계 분석은 검증된 Python 과학 라이브러리/)
      expect(footerText).toBeInTheDocument()
    })

    it('분석 시작하기 버튼이 /smart-flow로 링크되어야 함', () => {
      render(<HomePage />)

      const startButton = screen.getByText('분석 시작하기')
      const link = startButton.closest('a')
      expect(link).toHaveAttribute('href', '/smart-flow')
    })

    it('추가 버튼이 표시되어야 함', () => {
      render(<HomePage />)

      const addButton = screen.getByText('추가')
      expect(addButton).toBeInTheDocument()
    })
  })

  describe('1. localStorage 영구 저장 테스트', () => {
    it('즐겨찾기 추가 시 localStorage에 저장되어야 함', async () => {
      render(<HomePage />)

      // 추가 버튼 클릭하여 모달 열기
      const addButton = screen.getByText('추가')
      fireEvent.click(addButton)

      // 모달에서 카테고리 선택
      const categoryButton = screen.getByText('평균 비교')
      fireEvent.click(categoryButton)

      // 분석 방법 클릭하여 즐겨찾기 추가
      await waitFor(() => {
        const methodItems = screen.getAllByText('T-검정')
        if (methodItems.length > 0) {
          fireEvent.click(methodItems[0])
        }
      })

      // localStorage에 저장되었는지 확인
      await waitFor(() => {
        const saved = localStorageMock.getItem('statPlatform_favorites')
        expect(saved).toBeTruthy()
        expect(JSON.parse(saved || '[]').length).toBeGreaterThan(0)
      })
    })

    it('PC 재시작 시나리오: localStorage에서 즐겨찾기 복원', () => {
      // 1단계: 기존 즐겨찾기 설정 (PC 껐다 켜기 전)
      localStorageMock.setItem('statPlatform_favorites', JSON.stringify(['t-test', 'anova']))

      // 2단계: 페이지 재렌더링 (PC 재시작 후)
      render(<HomePage />)

      // 3단계: 즐겨찾기가 복원되었는지 확인
      const myToolsSection = screen.getByText('내 통계 도구')
      expect(myToolsSection).toBeInTheDocument()

      // 즐겨찾기가 있으면 안내 메시지가 없어야 함
      expect(screen.queryByText(/자주 쓰는 도구를 추가하세요/)).not.toBeInTheDocument()
    })

    it('즐겨찾기 해제 시 localStorage에서 제거되어야 함', async () => {
      // 초기 즐겨찾기 설정
      localStorageMock.setItem('statPlatform_favorites', JSON.stringify(['t-test']))
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

  describe('2. 모달에서 카테고리 선택 테스트', () => {
    it('추가 버튼 클릭 시 모달이 열려야 함', async () => {
      render(<HomePage />)

      // 추가 버튼 클릭
      const addButton = screen.getByText('추가')
      fireEvent.click(addButton)

      // 모달 제목 확인
      await waitFor(() => {
        expect(screen.getByText('통계 도구 추가')).toBeInTheDocument()
      })
    })

    it('모달에서 카테고리 선택 시 분석 방법이 표시되어야 함', async () => {
      render(<HomePage />)

      // 모달 열기
      const addButton = screen.getByText('추가')
      fireEvent.click(addButton)

      // 모달이 열릴 때까지 대기
      await waitFor(() => {
        expect(screen.getByText('통계 도구 추가')).toBeInTheDocument()
      })

      // 카테고리 선택
      const categoryButton = screen.getByRole('button', { name: /평균 비교/ })
      fireEvent.click(categoryButton)

      // 분석 방법이 표시되어야 함
      await waitFor(() => {
        expect(screen.getByText('T-검정')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('카테고리 재클릭 시 접혀야 함', async () => {
      render(<HomePage />)

      // 모달 열기
      const addButton = screen.getByText('추가')
      fireEvent.click(addButton)

      // 모달이 열릴 때까지 대기
      await waitFor(() => {
        expect(screen.getByText('통계 도구 추가')).toBeInTheDocument()
      })

      // 카테고리 선택
      const categoryButton = screen.getByRole('button', { name: /평균 비교/ })
      fireEvent.click(categoryButton)

      // 분석 방법이 표시됨 확인
      await waitFor(() => {
        expect(screen.getByText('T-검정')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 같은 카테고리 다시 클릭 (선택 해제)
      fireEvent.click(categoryButton)

      // 안내 메시지가 표시되어야 함 (분석 방법 숨겨짐)
      await waitFor(() => {
        expect(screen.getByText('카테고리를 선택하여 통계 도구를 추가하세요')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('3. 즐겨찾기 UI 동작 테스트', () => {
    it('즐겨찾기가 없을 때 안내 메시지 표시', () => {
      render(<HomePage />)

      expect(screen.getByText(/자주 쓰는 도구를 추가하세요/)).toBeInTheDocument()
    })

    it('즐겨찾기가 있을 때 목록 표시', () => {
      // 초기 즐겨찾기 설정
      localStorageMock.setItem('statPlatform_favorites', JSON.stringify(['t-test']))
      render(<HomePage />)

      // 안내 메시지가 없어야 함
      expect(screen.queryByText(/자주 쓰는 도구를 추가하세요/)).not.toBeInTheDocument()

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
      expect(screen.getByText('내 통계 도구')).toBeInTheDocument()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load favorites:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })
})
