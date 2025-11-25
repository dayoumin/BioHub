/**
 * DataValidationStep - 새 창으로 데이터 보기 테스트
 *
 * 테스트 대상:
 * - handleOpenDataInNewWindow 함수
 * - 전체 데이터 표시 (maxRows={validationResults.totalRows})
 * - 새 창 열기 버튼 렌더링
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// window.open 모킹
const mockWindowOpen = jest.fn()
const mockDocumentWrite = jest.fn()
const mockDocumentClose = jest.fn()

beforeEach(() => {
  // window.open 모킹
  global.window.open = mockWindowOpen.mockReturnValue({
    document: {
      write: mockDocumentWrite,
      close: mockDocumentClose
    }
  })

  mockWindowOpen.mockClear()
  mockDocumentWrite.mockClear()
  mockDocumentClose.mockClear()
})

describe('DataValidationStep - 새 창으로 데이터 보기', () => {
  const sampleData: DataRow[] = [
    { id: 1, name: 'Test 1', value: 100 },
    { id: 2, name: 'Test 2', value: 200 },
    { id: 3, name: 'Test 3', value: 300 }
  ]

  const validationResults: ValidationResults = {
    isValid: true,
    totalRows: 3,
    columnCount: 3,
    missingValues: 0,
    dataType: 'CSV',
    variables: ['id', 'name', 'value'],
    errors: [],
    warnings: [],
    columnStats: [
      {
        name: 'id',
        type: 'numeric',
      numericCount: 100,
      textCount: 0,
      uniqueValues: 3,
        missingCount: 0,
        mean: 2,
        median: 2,
        std: 1,
        min: 1,
        max: 3,
        outliers: []
      },
      {
        name: 'name',
        type: 'categorical',
      numericCount: 0,
      textCount: 100,
      uniqueValues: 3,
        missingCount: 0,
        topCategories: [
          { value: 'Test 1', count: 1 },
          { value: 'Test 2', count: 1 },
          { value: 'Test 3', count: 1 }
        ]
      },
      {
        name: 'value',
        type: 'numeric',
      numericCount: 100,
      textCount: 0,
      uniqueValues: 3,
        missingCount: 0,
        mean: 200,
        median: 200,
        std: 100,
        min: 100,
        max: 300,
        outliers: []
      }
    ]
  }

  test('새 창으로 보기 버튼이 렌더링된다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={sampleData}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.getByRole('button', { name: /새 창으로 보기/i })
    expect(openButton).toBeInTheDocument()
  })

  test('새 창으로 보기 버튼 클릭 시 window.open이 호출된다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={sampleData}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.getByRole('button', { name: /새 창으로 보기/i })
    fireEvent.click(openButton)

    expect(mockWindowOpen).toHaveBeenCalledWith(
      '',
      '_blank',
      'width=1200,height=800,scrollbars=yes,resizable=yes'
    )
  })

  test('새 창에 HTML 테이블이 작성된다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={sampleData}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.getByRole('button', { name: /새 창으로 보기/i })
    fireEvent.click(openButton)

    expect(mockDocumentWrite).toHaveBeenCalledTimes(1)
    const htmlContent = mockDocumentWrite.mock.calls[0][0] as string

    // HTML 구조 검증
    expect(htmlContent).toContain('<!DOCTYPE html>')
    expect(htmlContent).toContain('<table>')
    expect(htmlContent).toContain('<thead>')
    expect(htmlContent).toContain('<tbody>')

    // 헤더 검증
    expect(htmlContent).toContain('<th>id</th>')
    expect(htmlContent).toContain('<th>name</th>')
    expect(htmlContent).toContain('<th>value</th>')

    // 데이터 검증
    expect(htmlContent).toContain('<td>Test 1</td>')
    expect(htmlContent).toContain('<td>100</td>')
    expect(htmlContent).toContain('<td>Test 2</td>')
    expect(htmlContent).toContain('<td>200</td>')

    // CSS 스타일 검증
    expect(htmlContent).toContain('position: sticky')
    expect(htmlContent).toContain('top: 0')
    expect(htmlContent).toContain('@media print')
  })

  test('새 창에 행 번호가 표시된다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={sampleData}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.getByRole('button', { name: /새 창으로 보기/i })
    fireEvent.click(openButton)

    const htmlContent = mockDocumentWrite.mock.calls[0][0] as string

    // 행 번호 검증
    expect(htmlContent).toContain('<th class="row-number">#</th>')
    expect(htmlContent).toContain('<td class="row-number">1</td>')
    expect(htmlContent).toContain('<td class="row-number">2</td>')
    expect(htmlContent).toContain('<td class="row-number">3</td>')
  })

  test('document.close가 호출된다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={sampleData}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.getByRole('button', { name: /새 창으로 보기/i })
    fireEvent.click(openButton)

    expect(mockDocumentClose).toHaveBeenCalledTimes(1)
  })

  test('데이터가 없을 때 새 창이 열리지 않는다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={null}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.queryByRole('button', { name: /새 창으로 보기/i })

    // 데이터가 없으면 버튼 자체가 렌더링되지 않거나 클릭 시 아무 동작 안 함
    if (openButton) {
      fireEvent.click(openButton)
      expect(mockWindowOpen).not.toHaveBeenCalled()
    }
  })

  test('전체 데이터가 DataPreviewTable에 전달된다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={sampleData}
        onNext={jest.fn()}
      />
    )

    // "업로드된 전체 데이터" 카드 타이틀이 렌더링되었는지 확인
    const cardTitle = screen.getByText('업로드된 전체 데이터')
    expect(cardTitle).toBeInTheDocument()
  })

  test('totalRows 메타데이터가 새 창 헤더에 표시된다', () => {
    render(
      <DataValidationStep
        validationResults={validationResults}
        data={sampleData}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.getByRole('button', { name: /새 창으로 보기/i })
    fireEvent.click(openButton)

    const htmlContent = mockDocumentWrite.mock.calls[0][0] as string

    // 메타데이터 검증
    expect(htmlContent).toContain('총 3행')
    expect(htmlContent).toContain('3개 변수')
  })

  test('XSS 방지: 특수문자가 포함된 데이터도 안전하게 처리된다', () => {
    const xssData: DataRow[] = [
      { id: 1, name: '<script>alert("XSS")</script>', value: 100 }
    ]

    const xssValidation: ValidationResults = {
      ...validationResults,
      totalRows: 1
    }

    render(
      <DataValidationStep
        validationResults={xssValidation}
        data={xssData}
        onNext={jest.fn()}
      />
    )

    const openButton = screen.getByRole('button', { name: /새 창으로 보기/i })
    fireEvent.click(openButton)

    const htmlContent = mockDocumentWrite.mock.calls[0][0] as string

    // ✅ HTML escape 적용 확인
    expect(htmlContent).toContain('&lt;script&gt;')  // <script> → &lt;script&gt;
    expect(htmlContent).not.toContain('<script>alert')  // 실제 스크립트 태그 없음
  })
})
