/**
 * 시맨틱 색상 토큰 전환 검증 테스트
 *
 * Design Polish P0/P1/P2에서 하드코딩 Tailwind 색상을
 * 시맨틱 토큰(success/error/warning/info)으로 전환한 결과를 검증합니다.
 *
 * 검증 항목:
 * 1. StatusIndicator — 4개 시맨틱 상태 토큰 사용
 * 2. FitScoreIndicator — 4등급 시맨틱 매핑
 * 3. AssumptionResultChart — 통과/실패 시맨틱 색상
 * 4. STEP_STYLES — 테이블 셀 패딩 상수
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// ── Mocks ──

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
      confidenceLabel: '신뢰도',
    },
    dataExploration: {
      assumptions: { passed: '통과', failed: '실패' },
    },
  }),
}))

// ── StatusIndicator 테스트 ──

import { StatusIndicator } from '@/components/smart-flow/common/StatusIndicator'

describe('StatusIndicator — 시맨틱 토큰', () => {
  const semanticStatuses = ['success', 'warning', 'error', 'info'] as const

  it.each(semanticStatuses)('%s 상태에서 시맨틱 토큰 클래스 사용 (dark: prefix 불필요)', (status) => {
    const { container } = render(
      <StatusIndicator status={status} title={`${status} 상태`} />
    )
    const wrapper = container.firstChild as HTMLElement

    // 시맨틱 배경 토큰 사용 확인
    expect(wrapper.className).toContain(`bg-${status}-bg`)
    // 시맨틱 보더 토큰 사용 확인
    expect(wrapper.className).toContain(`border-${status}-border`)
    // 하드코딩 Tailwind 색상 미사용 확인
    expect(wrapper.className).not.toMatch(/bg-(green|blue|yellow|red|amber)-/)
    expect(wrapper.className).not.toContain('dark:')
  })

  it('pending 상태는 neutral(gray) 색상 유지 — 시맨틱 상태가 아님', () => {
    const { container } = render(
      <StatusIndicator status="pending" title="처리 중" />
    )
    const wrapper = container.firstChild as HTMLElement

    // pending은 gray 계열 유지
    expect(wrapper.className).toContain('bg-gray-50')
  })

  it('시맨틱 상태에서 아이콘에 시맨틱 색상 사용', () => {
    const { container } = render(
      <StatusIndicator status="success" title="완료" />
    )
    const icon = container.querySelector('svg')
    expect(icon?.className.baseVal || icon?.getAttribute('class') || '').toContain('text-success')
  })
})

// ── FitScoreIndicator 시맨틱 매핑 ──

import { getFitLevel } from '@/components/smart-flow/visualization/FitScoreIndicator'

describe('FitScoreIndicator — 시맨틱 등급 매핑', () => {
  const levelMap = [
    { score: 90, level: 'excellent', token: 'success' },
    { score: 75, level: 'good', token: 'info' },
    { score: 55, level: 'caution', token: 'warning' },
    { score: 30, level: 'poor', token: 'error' },
  ] as const

  it.each(levelMap)(
    '$level ($score점) → text-$token / bg-$token-bg',
    ({ score, level, token }) => {
      const config = getFitLevel(score)
      expect(config.level).toBe(level)
      expect(config.colorClass).toBe(`text-${token}`)
      expect(config.bgClass).toBe(`bg-${token}-bg`)
      expect(config.barClass).toBe(`bg-${token}`)

      // dark: prefix 없음 — CSS 변수가 다크모드 자동 처리
      expect(config.colorClass).not.toContain('dark:')
      expect(config.bgClass).not.toContain('dark:')
    }
  )

  it('unknown (0점)은 neutral 토큰 유지', () => {
    const config = getFitLevel(0)
    expect(config.level).toBe('unknown')
    expect(config.colorClass).toBe('text-muted-foreground')
    expect(config.bgClass).toBe('bg-muted')
  })
})

// ── AssumptionResultChart 시맨틱 색상 ──

import { AssumptionResultChart } from '@/components/smart-flow/visualization/AssumptionResultChart'

describe('AssumptionResultChart — 통과/실패 시맨틱 색상', () => {
  const mockAssumptions = [
    { name: '정규성 검정', passed: true, pValue: 0.35 },
    { name: '등분산 검정', passed: false, pValue: 0.02 },
    { name: '독립성 검정', passed: true, pValue: 0.78 },
  ]

  it('통과 항목은 success 배경, 실패 항목은 error 배경', () => {
    const { container } = render(
      <AssumptionResultChart assumptions={mockAssumptions} />
    )

    const items = container.querySelectorAll('[class*="rounded-lg"]')
    const classNames = Array.from(items).map(el => el.className)

    // success-bg와 error-bg 토큰이 존재
    expect(classNames.some(cn => cn.includes('bg-success-bg'))).toBe(true)
    expect(classNames.some(cn => cn.includes('bg-error-bg'))).toBe(true)

    // 하드코딩 green/red 미사용
    expect(classNames.every(cn => !cn.match(/bg-(green|red)-/))).toBe(true)
  })

  it('진행 바에 success 토큰 사용', () => {
    const { container } = render(
      <AssumptionResultChart assumptions={mockAssumptions} />
    )

    const progressBar = container.querySelector('.bg-success')
    expect(progressBar).toBeInTheDocument()
  })

  it('통과율 텍스트 표시 (2/3)', () => {
    render(<AssumptionResultChart assumptions={mockAssumptions} />)
    expect(screen.getByText(/2\/3/)).toBeInTheDocument()
  })

  it('통과/실패 텍스트에 시맨틱 색상 사용', () => {
    const { container } = render(
      <AssumptionResultChart assumptions={mockAssumptions} />
    )

    // text-success, text-error 토큰 사용
    const successTexts = container.querySelectorAll('.text-success')
    const errorTexts = container.querySelectorAll('.text-error')
    expect(successTexts.length).toBeGreaterThan(0)
    expect(errorTexts.length).toBeGreaterThan(0)

    // 하드코딩 green/red 미사용
    const allElements = container.querySelectorAll('*')
    const hasHardcodedColors = Array.from(allElements).some(el =>
      el.className.match?.(/text-(green|red)-\d/)
    )
    expect(hasHardcodedColors).toBe(false)
  })
})

// ── STEP_STYLES 상수 검증 ──

import { STEP_STYLES } from '@/components/smart-flow/common/style-constants'

describe('STEP_STYLES — 스타일 상수', () => {
  it('테이블 셀 패딩이 px-3 py-2.5로 통일', () => {
    expect(STEP_STYLES.tableHeaderCell).toBe('px-3 py-2.5')
    expect(STEP_STYLES.tableBodyCell).toBe('px-3 py-2.5')
  })

  it('레이아웃 상수가 정의됨', () => {
    expect(STEP_STYLES.mainContentPaddingX).toBe('px-6')
    expect(STEP_STYLES.mainContentPaddingY).toBe('py-8')
    expect(STEP_STYLES.sectionGap).toBe('space-y-6')
  })

  it('모든 값이 readonly', () => {
    // as const로 선언되어 있으므로 타입 레벨에서 readonly
    // 런타임에서는 Object.isFrozen으로 확인 불가 (as const는 타입 전용)
    // 대신 값이 존재하고 string인지 확인
    const allValues = Object.values(STEP_STYLES)
    expect(allValues.every(v => typeof v === 'string')).toBe(true)
    expect(allValues.length).toBe(10)
  })
})
