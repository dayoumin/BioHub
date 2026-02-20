import { useState, useEffect } from 'react'

/**
 * 반응형 디자인을 위한 커스텀 훅
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    // Debounce resize event
    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleResize, 150)
    }

    window.addEventListener('resize', debouncedResize)
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(timeoutId)
    }
  }, [])

  const isMobile = windowSize.width < 640
  const isTablet = windowSize.width >= 640 && windowSize.width < 1024
  const isDesktop = windowSize.width >= 1024

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    // 차트 크기 계산
    chartHeight: isMobile ? 250 : isTablet ? 350 : 400,
    chartWidth: isMobile ? windowSize.width - 40 : isTablet ? windowSize.width - 80 : undefined
  }
}

/**
 * 차트 레이아웃 설정 가져오기
 */
export function getResponsiveChartLayout(isMobile: boolean, isTablet: boolean) {
  if (isMobile) {
    return {
      height: 250,
      margin: { l: 30, r: 20, t: 30, b: 40 },
      showlegend: false,
      font: { size: 10 }
    }
  }

  if (isTablet) {
    return {
      height: 350,
      margin: { l: 40, r: 30, t: 40, b: 50 },
      showlegend: true,
      font: { size: 11 }
    }
  }

  // Desktop
  return {
    height: 400,
    margin: { l: 50, r: 30, t: 40, b: 60 },
    showlegend: true,
    font: { size: 12 }
  }
}