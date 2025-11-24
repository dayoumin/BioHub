import { render, screen, fireEvent } from '@testing-library/react'
import { MobileWarning } from '../mobile-warning'

// Mock window.innerWidth and navigator.userAgent
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: userAgent,
  })
}

describe('MobileWarning', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
  })

  afterEach(() => {
    // Restore defaults
    mockInnerWidth(1024)
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  })

  describe('Mobile Detection', () => {
    it('should detect mobile by viewport width (<768px)', () => {
      mockInnerWidth(767)
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

      render(<MobileWarning />)

      expect(screen.getByText('모바일 접속 감지')).toBeInTheDocument()
    })

    it('should detect mobile by User Agent (mobile keyword)', () => {
      mockInnerWidth(1024)
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')

      render(<MobileWarning />)

      expect(screen.getByText('모바일 접속 감지')).toBeInTheDocument()
    })

    it('should detect mobile by User Agent (android keyword)', () => {
      mockInnerWidth(1024)
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; SM-G998B)')

      render(<MobileWarning />)

      expect(screen.getByText('모바일 접속 감지')).toBeInTheDocument()
    })

    it('should detect mobile by User Agent (tablet keyword)', () => {
      mockInnerWidth(1024)
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)')

      render(<MobileWarning />)

      expect(screen.getByText('모바일 접속 감지')).toBeInTheDocument()
    })

    it('should NOT show warning on desktop (width >= 768px, desktop UA)', () => {
      mockInnerWidth(1024)
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

      const { container } = render(<MobileWarning />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Session Storage Persistence', () => {
    it('should hide warning if sessionStorage has "hideMobileWarning"', () => {
      sessionStorage.setItem('hideMobileWarning', 'true')
      mockInnerWidth(767)

      const { container } = render(<MobileWarning />)

      expect(container.firstChild).toBeNull()
    })

    it('should save preference when "그래도 계속" is clicked', () => {
      mockInnerWidth(767)
      render(<MobileWarning />)

      const continueButton = screen.getByText('그래도 계속')
      fireEvent.click(continueButton)

      expect(sessionStorage.getItem('hideMobileWarning')).toBe('true')
    })

    it('should close modal after "그래도 계속" is clicked', () => {
      mockInnerWidth(767)
      const { container } = render(<MobileWarning />)

      const continueButton = screen.getByText('그래도 계속')
      fireEvent.click(continueButton)

      // Modal should be removed from DOM
      expect(container.firstChild).toBeNull()
    })
  })

  describe('UI Content', () => {
    beforeEach(() => {
      mockInnerWidth(767)
    })

    it('should display PC recommendation card', () => {
      render(<MobileWarning />)

      expect(screen.getByText('PC에서 접속하세요')).toBeInTheDocument()
      expect(screen.getByText(/변수 선택, 통계 분석, 결과 해석 등 복잡한 작업은/)).toBeInTheDocument()
    })

    it('should display mobile issues list', () => {
      render(<MobileWarning />)

      expect(screen.getByText('모바일에서 발생 가능한 문제')).toBeInTheDocument()
      expect(screen.getByText('변수 선택 UI 레이아웃 깨짐')).toBeInTheDocument()
      expect(screen.getByText('표 및 그래프 가독성 저하')).toBeInTheDocument()
      expect(screen.getByText('드래그 앤 드롭 기능 제한')).toBeInTheDocument()
      expect(screen.getByText('파일 업로드 호환성 문제')).toBeInTheDocument()
    })

    it('should display recommended resolution', () => {
      render(<MobileWarning />)

      expect(screen.getByText(/권장 해상도:/)).toBeInTheDocument()
      expect(screen.getByText(/1280px × 720px 이상/)).toBeInTheDocument()
    })

    it('should have two buttons', () => {
      render(<MobileWarning />)

      expect(screen.getByText('그래도 계속')).toBeInTheDocument()
      expect(screen.getByText('확인')).toBeInTheDocument()
    })

    it('should close modal when "확인" is clicked', () => {
      const { container } = render(<MobileWarning />)

      const confirmButton = screen.getByText('확인')
      fireEvent.click(confirmButton)

      // Modal should be removed (Dialog onOpenChange sets showWarning to false)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Icons', () => {
    it('should render AlertTriangle, Monitor, and Smartphone icons', () => {
      mockInnerWidth(767)
      render(<MobileWarning />)

      // lucide-react icons are SVG elements (Dialog renders in Portal, use document.body)
      const svgIcons = document.body.querySelectorAll('svg')
      expect(svgIcons.length).toBeGreaterThanOrEqual(3)
    })
  })
})
