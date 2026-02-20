/**
 * FitScoreIndicator 컴포넌트 테스트
 *
 * 테스트 범위:
 * 1. 점수별 등급 분류 (excellent, good, caution, poor, unknown)
 * 2. 컴팩트 모드 렌더링
 * 3. 일반 모드 렌더링 (프로그레스 바 + 설명)
 * 4. 경계값 테스트
 * 5. 접근성 테스트
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { FitScoreIndicator, FitScoreBadge, getFitLevel } from '@/components/smart-flow/visualization/FitScoreIndicator'

// Mock useTerminology (FitScoreIndicator/FitScoreBadge uses useTerminology())
vi.mock('@/hooks/use-terminology', () => ({
    useTerminology: () => ({
        fitScore: {
            levels: {
                excellent: { label: '매우 적합', shortLabel: '최적', description: '데이터에 매우 적합합니다' },
                good: { label: '적합', shortLabel: '적합', description: '데이터와 잘 맞습니다' },
                caution: { label: '주의 필요', shortLabel: '주의', description: '일부 조건이 충족되지 않습니다' },
                poor: { label: '부적합', shortLabel: '부적합', description: '다른 방법을 고려하세요' },
                unknown: { label: '평가 불가', shortLabel: '평가 불가', description: '데이터 정보가 부족합니다' },
            },
        },
    }),
    useTerminologyContext: () => ({ dictionary: { domain: 'generic' }, setDomain: vi.fn(), currentDomain: 'generic' }),
}))

describe('FitScoreIndicator', () => {
  describe('점수별 등급 분류', () => {
    it('85점 이상은 "매우 적합"으로 표시', () => {
      render(<FitScoreIndicator score={85} />)
      expect(screen.getByText('매우 적합')).toBeInTheDocument()
      expect(screen.getByText('데이터에 매우 적합합니다')).toBeInTheDocument()
    })

    it('90점은 "매우 적합"으로 표시', () => {
      render(<FitScoreIndicator score={90} />)
      expect(screen.getByText('매우 적합')).toBeInTheDocument()
    })

    it('100점은 "매우 적합"으로 표시', () => {
      render(<FitScoreIndicator score={100} />)
      expect(screen.getByText('매우 적합')).toBeInTheDocument()
    })

    it('70-84점은 "적합"으로 표시', () => {
      render(<FitScoreIndicator score={75} />)
      expect(screen.getByText('적합')).toBeInTheDocument()
      expect(screen.getByText('데이터와 잘 맞습니다')).toBeInTheDocument()
    })

    it('50-69점은 "주의 필요"로 표시', () => {
      render(<FitScoreIndicator score={60} />)
      expect(screen.getByText('주의 필요')).toBeInTheDocument()
      expect(screen.getByText('일부 조건이 충족되지 않습니다')).toBeInTheDocument()
    })

    it('1-49점은 "부적합"으로 표시', () => {
      render(<FitScoreIndicator score={30} />)
      expect(screen.getByText('부적합')).toBeInTheDocument()
      expect(screen.getByText('다른 방법을 고려하세요')).toBeInTheDocument()
    })

    it('0점은 "평가 불가"로 표시', () => {
      render(<FitScoreIndicator score={0} />)
      expect(screen.getByText('평가 불가')).toBeInTheDocument()
      expect(screen.getByText('데이터 정보가 부족합니다')).toBeInTheDocument()
    })
  })

  describe('경계값 테스트', () => {
    it('84점은 "적합"으로 표시 (85 미만)', () => {
      render(<FitScoreIndicator score={84} />)
      expect(screen.getByText('적합')).toBeInTheDocument()
    })

    it('69점은 "주의 필요"로 표시 (70 미만)', () => {
      render(<FitScoreIndicator score={69} />)
      expect(screen.getByText('주의 필요')).toBeInTheDocument()
    })

    it('49점은 "부적합"으로 표시 (50 미만)', () => {
      render(<FitScoreIndicator score={49} />)
      expect(screen.getByText('부적합')).toBeInTheDocument()
    })

    it('1점은 "부적합"으로 표시 (0 초과)', () => {
      render(<FitScoreIndicator score={1} />)
      expect(screen.getByText('부적합')).toBeInTheDocument()
    })

    it('음수 점수는 0으로 클램프되어 "평가 불가"', () => {
      render(<FitScoreIndicator score={-10} />)
      expect(screen.getByText('평가 불가')).toBeInTheDocument()
    })

    it('100 초과 점수는 100으로 클램프됨', () => {
      render(<FitScoreIndicator score={150} />)
      expect(screen.getByText('매우 적합')).toBeInTheDocument()
    })
  })

  describe('컴팩트 모드', () => {
    it('compact 모드에서는 shortLabel 표시', () => {
      render(<FitScoreIndicator score={90} compact />)
      expect(screen.getByText('최적')).toBeInTheDocument()
      // 설명은 표시되지 않음
      expect(screen.queryByText('데이터에 매우 적합합니다')).not.toBeInTheDocument()
    })

    it('compact 모드에서 각 등급 shortLabel 확인', () => {
      const { rerender } = render(<FitScoreIndicator score={90} compact />)
      expect(screen.getByText('최적')).toBeInTheDocument()

      rerender(<FitScoreIndicator score={75} compact />)
      expect(screen.getByText('적합')).toBeInTheDocument()

      rerender(<FitScoreIndicator score={55} compact />)
      expect(screen.getByText('주의')).toBeInTheDocument()

      rerender(<FitScoreIndicator score={30} compact />)
      expect(screen.getByText('부적합')).toBeInTheDocument()

      rerender(<FitScoreIndicator score={0} compact />)
      expect(screen.getByText('평가 불가')).toBeInTheDocument()
    })
  })

  describe('일반 모드 렌더링', () => {
    it('프로그레스 바가 렌더링됨', () => {
      const { container } = render(<FitScoreIndicator score={75} />)
      // 프로그레스 바 컨테이너 확인
      const progressBar = container.querySelector('.bg-muted.rounded-full')
      expect(progressBar).toBeInTheDocument()
    })

    it('프로그레스 바 너비가 점수에 따라 설정됨', () => {
      const { container } = render(<FitScoreIndicator score={75} />)
      const progressFill = container.querySelector('[style*="width: 75%"]')
      expect(progressFill).toBeInTheDocument()
    })
  })

  describe('className prop', () => {
    it('커스텀 className이 적용됨', () => {
      const { container } = render(<FitScoreIndicator score={80} className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})

describe('FitScoreBadge', () => {
  it('배지 형태로 렌더링됨', () => {
    render(<FitScoreBadge score={90} />)
    expect(screen.getByText('최적')).toBeInTheDocument()
  })

  it('각 등급별 shortLabel 표시', () => {
    const { rerender } = render(<FitScoreBadge score={90} />)
    expect(screen.getByText('최적')).toBeInTheDocument()

    rerender(<FitScoreBadge score={75} />)
    expect(screen.getByText('적합')).toBeInTheDocument()

    rerender(<FitScoreBadge score={55} />)
    expect(screen.getByText('주의')).toBeInTheDocument()
  })

  it('커스텀 className이 적용됨', () => {
    const { container } = render(<FitScoreBadge score={80} className="custom-badge" />)
    expect(container.firstChild).toHaveClass('custom-badge')
  })
})

describe('getFitLevel 유틸리티 함수', () => {
  it('점수에 따라 올바른 FitConfig 반환', () => {
    expect(getFitLevel(90).level).toBe('excellent')
    expect(getFitLevel(75).level).toBe('good')
    expect(getFitLevel(55).level).toBe('caution')
    expect(getFitLevel(30).level).toBe('poor')
    expect(getFitLevel(0).level).toBe('unknown')
  })

  it('FitConfig에 모든 필수 속성 포함', () => {
    const config = getFitLevel(80)
    expect(config).toHaveProperty('level')
    expect(config).toHaveProperty('label')
    expect(config).toHaveProperty('shortLabel')
    expect(config).toHaveProperty('description')
    expect(config).toHaveProperty('colorClass')
    expect(config).toHaveProperty('bgClass')
    expect(config).toHaveProperty('barClass')
    expect(config).toHaveProperty('icon')
  })
})

describe('다크 모드 지원', () => {
  it('다크 모드 클래스가 포함됨', () => {
    const config = getFitLevel(90)
    expect(config.colorClass).toContain('dark:')
    expect(config.bgClass).toContain('dark:')
  })
})
