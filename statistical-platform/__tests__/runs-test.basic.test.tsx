import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RunsTestPage from '../app/(dashboard)/statistics/runs-test/page'

// Mock the required modules
jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: ({ children, title }: any) => (
      <div data-testid="statistics-layout">
        <h1>{title}</h1>
        {children}
      </div>
    ),
    StepCard: ({ children, title }: any) => (
      <div data-testid="step-card">
        <h2>{title}</h2>
        {children}
      </div>
    )
  }
})

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return {
    DataUploadStep: ({ onNext }: any) => (
      <div data-testid="data-upload">
        <button
          onClick={() => onNext({
            data: [{ value: 'A' }, { value: 'B' }, { value: 'A' }],
            fileName: 'test.csv',
            columns: ['value']
          })}
        >
          Upload Test Data
        </button>
      </div>
    )
  }
})

jest.mock('@/components/variable-selection/VariableSelector', () => {
  return {
    VariableSelector: ({ onSelectionChange }: any) => (
      <div data-testid="variable-selector">
        <button
          onClick={() => onSelectionChange({ variables: ['value'] })}
        >
          Select Variables
        </button>
      </div>
    )
  }
})

jest.mock('@/lib/statistics/variable-requirements', () => ({
  getVariableRequirements: () => ({
    variables: [{
      role: 'dependent',
      label: '검정 변수',
      types: ['binary', 'continuous'],
      required: true,
      multiple: false,
      description: '무작위성을 검정할 변수'
    }]
  })
}))

jest.mock('@/lib/services/variable-type-detector', () => ({
  detectVariableType: () => 'binary'
}))

// Lucide React 아이콘 목킹
jest.mock('lucide-react', () => ({
  Shuffle: () => <span>Shuffle</span>,
  Upload: () => <span>Upload</span>,
  Users: () => <span>Users</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  FileText: () => <span>FileText</span>,
  Download: () => <span>Download</span>,
  Info: () => <span>Info</span>,
  BarChart3: () => <span>BarChart3</span>
}))

describe('RunsTestPage', () => {
  it('페이지가 올바르게 렌더링된다', () => {
    render(<RunsTestPage />)

    // 페이지 제목 확인
    expect(screen.getByText('런 검정')).toBeInTheDocument()

    // 초기 단계 확인
    expect(screen.getByText('런 검정 (Runs Test)')).toBeInTheDocument()
    expect(screen.getByText('런 검정이란?')).toBeInTheDocument()
  })

  it('런 검정 개념이 올바르게 설명된다', () => {
    render(<RunsTestPage />)

    // 핵심 개념 확인
    expect(screen.getByText('런(run)')).toBeInTheDocument()
    expect(screen.getByText('런(Run)이란?')).toBeInTheDocument()

    // 사용 사례 확인
    expect(screen.getByText('시계열 데이터의 패턴 검정')).toBeInTheDocument()
    expect(screen.getByText('품질 관리 데이터 분석')).toBeInTheDocument()
    expect(screen.getByText('게임 결과의 공정성 검정')).toBeInTheDocument()
  })

  it('가정 및 조건이 올바르게 표시된다', () => {
    render(<RunsTestPage />)

    // 가정 제목 확인
    expect(screen.getByText('가정 및 조건')).toBeInTheDocument()
  })

  it('데이터 업로드 단계로 진행할 수 있다', () => {
    render(<RunsTestPage />)

    // 데이터 업로드하기 버튼 클릭
    const uploadButton = screen.getByText('데이터 업로드하기')
    fireEvent.click(uploadButton)

    // 데이터 업로드 단계로 이동 확인
    expect(screen.getByTestId('data-upload')).toBeInTheDocument()
  })

  it('전체 분석 워크플로우가 작동한다', async () => {
    render(<RunsTestPage />)

    // 1단계: 데이터 업로드하기 버튼 클릭
    fireEvent.click(screen.getByText('데이터 업로드하기'))

    // 2단계: 데이터 업로드
    fireEvent.click(screen.getByText('Upload Test Data'))

    // 변수 선택 단계 확인
    expect(screen.getByTestId('variable-selector')).toBeInTheDocument()

    // 3단계: 변수 선택 및 분석 실행
    fireEvent.click(screen.getByText('Select Variables'))

    // 분석 결과 대기 및 확인
    await waitFor(() => {
      expect(screen.getByText('런 검정 결과')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('분석 결과가 올바르게 표시된다', async () => {
    render(<RunsTestPage />)

    // 분석 워크플로우 실행
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Test Data'))
    fireEvent.click(screen.getByText('Select Variables'))

    // 분석 결과 확인
    await waitFor(() => {
      // 검정 결과 확인
      expect(screen.getByText(/Z =.*p =/)).toBeInTheDocument()

      // 런 통계량 확인
      expect(screen.getByText('관측된 런')).toBeInTheDocument()
      expect(screen.getByText('기댓값')).toBeInTheDocument()

      // 검정 통계량 확인
      expect(screen.getByText('Z-통계량')).toBeInTheDocument()
      expect(screen.getByText('p-value')).toBeInTheDocument()

      // 런 시퀀스 분석 확인
      expect(screen.getByText('런 시퀀스 분석')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('결과 해석 가이드가 제공된다', async () => {
    render(<RunsTestPage />)

    // 분석 워크플로우 실행
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Test Data'))
    fireEvent.click(screen.getByText('Select Variables'))

    await waitFor(() => {
      // 핵심 해석 가이드만 확인
      expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText('런 검정 해석')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('액션 버튼들이 표시된다', async () => {
    render(<RunsTestPage />)

    // 분석 워크플로우 실행
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Test Data'))
    fireEvent.click(screen.getByText('Select Variables'))

    await waitFor(() => {
      // 액션 버튼 확인
      expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('결과 다운로드')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})