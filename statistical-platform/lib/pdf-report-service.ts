/**
 * PDF 보고서 생성 서비스
 * 통계 분석 결과를 PDF 문서로 내보내기
 */

import { format } from 'date-fns'

// Dynamic imports for code splitting (jsPDF ~500KB, html2canvas ~200KB)
async function getJsPDF(): Promise<typeof import('jspdf')> {
  return import('jspdf')
}
async function getHtml2Canvas(): Promise<typeof import('html2canvas')> {
  return import('html2canvas')
}

export interface ReportData {
  title: string
  dataset: string
  analysis: {
    testName: string
    result: any
    charts?: string[] // Base64 encoded images
  }
  metadata: {
    createdAt: Date
    analyst?: string
    description?: string
  }
}

/**
 * HTML 요소를 캔버스 이미지로 변환
 */
export async function elementToImage(element: HTMLElement): Promise<string> {
  const { default: html2canvas } = await getHtml2Canvas()
  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
    backgroundColor: '#ffffff'
  })
  return canvas.toDataURL('image/png')
}

/**
 * 통계 분석 결과를 PDF로 생성
 */
export async function generateStatisticalReport(data: ReportData): Promise<InstanceType<typeof import('jspdf').default>> {
  const { default: jsPDF } = await getJsPDF()
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let yPosition = margin

  // 헤더 추가
  pdf.setFontSize(24)
  pdf.setTextColor(40, 40, 40)
  pdf.text(data.title, margin, yPosition)
  yPosition += 15

  // 메타데이터
  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated: ${format(data.metadata.createdAt, 'yyyy-MM-dd HH:mm')}`, margin, yPosition)
  yPosition += 5
  if (data.metadata.analyst) {
    pdf.text(`Analyst: ${data.metadata.analyst}`, margin, yPosition)
    yPosition += 5
  }
  pdf.text(`Dataset: ${data.dataset}`, margin, yPosition)
  yPosition += 10

  // 구분선
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // 분석 방법
  pdf.setFontSize(16)
  pdf.setTextColor(40, 40, 40)
  pdf.text('Statistical Analysis', margin, yPosition)
  yPosition += 10

  pdf.setFontSize(12)
  pdf.setTextColor(60, 60, 60)
  pdf.text(`Method: ${data.analysis.testName}`, margin, yPosition)
  yPosition += 10

  // 결과 섹션
  pdf.setFontSize(14)
  pdf.setTextColor(40, 40, 40)
  pdf.text('Results', margin, yPosition)
  yPosition += 8

  // 결과 데이터 포맷팅
  pdf.setFontSize(10)
  pdf.setTextColor(80, 80, 80)
  
  const result = data.analysis.result
  if (result) {
    // 통계량
    if (result.statistic !== undefined) {
      pdf.text(`Test Statistic: ${formatNumber(result.statistic)}`, margin + 5, yPosition)
      yPosition += 6
    }
    
    // p-value
    if (result.pValue !== undefined) {
      const pValueText = result.pValue < 0.001 ? '< 0.001' : formatNumber(result.pValue, 4)
      pdf.text(`p-value: ${pValueText}`, margin + 5, yPosition)
      yPosition += 6
    }
    
    // 효과 크기
    if (result.effectSize !== undefined) {
      pdf.text(`Effect Size: ${formatNumber(result.effectSize)}`, margin + 5, yPosition)
      yPosition += 6
    }
    
    // 신뢰구간
    if (result.confidenceInterval) {
      const [lower, upper] = result.confidenceInterval
      pdf.text(`95% CI: [${formatNumber(lower)}, ${formatNumber(upper)}]`, margin + 5, yPosition)
      yPosition += 6
    }
    
    // 자유도
    if (result.degreesOfFreedom !== undefined) {
      const df = typeof result.degreesOfFreedom === 'object' 
        ? `Between: ${result.degreesOfFreedom.between}, Within: ${result.degreesOfFreedom.within}`
        : result.degreesOfFreedom
      pdf.text(`Degrees of Freedom: ${df}`, margin + 5, yPosition)
      yPosition += 6
    }
    
    // R-squared (회귀분석)
    if (result.rSquared !== undefined) {
      pdf.text(`R²: ${formatNumber(result.rSquared)}`, margin + 5, yPosition)
      yPosition += 6
    }
    
    if (result.adjRSquared !== undefined) {
      pdf.text(`Adjusted R²: ${formatNumber(result.adjRSquared)}`, margin + 5, yPosition)
      yPosition += 6
    }
    
    yPosition += 5
    
    // 해석
    if (result.interpretation) {
      pdf.setFontSize(12)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Interpretation', margin, yPosition)
      yPosition += 7
      
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      const lines = pdf.splitTextToSize(result.interpretation, contentWidth - 10)
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin - 10) {
          pdf.addPage()
          yPosition = margin
        }
        pdf.text(line, margin + 5, yPosition)
        yPosition += 5
      })
    }
    
    // 그룹 통계 (ANOVA)
    if (result.groups && Array.isArray(result.groups)) {
      yPosition += 5
      pdf.setFontSize(12)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Group Statistics', margin, yPosition)
      yPosition += 7
      
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      result.groups.forEach((group: any) => {
        if (yPosition > pageHeight - margin - 10) {
          pdf.addPage()
          yPosition = margin
        }
        pdf.text(`${group.name}: n=${group.n}, Mean=${formatNumber(group.mean)}, SD=${formatNumber(group.std)}`, 
          margin + 5, yPosition)
        yPosition += 5
      })
    }
    
    // 사후검정 결과
    if (result.postHoc) {
      yPosition += 5
      pdf.setFontSize(12)
      pdf.setTextColor(40, 40, 40)
      pdf.text(`Post-hoc Test: ${result.postHoc.testName}`, margin, yPosition)
      yPosition += 7
      
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      
      if (result.postHoc.comparisons && Array.isArray(result.postHoc.comparisons)) {
        result.postHoc.comparisons.forEach((comp: any) => {
          if (yPosition > pageHeight - margin - 10) {
            pdf.addPage()
            yPosition = margin
          }
          const sig = comp.significant ? '✓' : '✗'
          pdf.text(`${comp.group1} vs ${comp.group2}: p=${formatNumber(comp.pValue, 4)} ${sig}`, 
            margin + 5, yPosition)
          yPosition += 5
        })
      }
    }
    
    // 회귀계수 (회귀분석)
    if (result.coefficients && Array.isArray(result.coefficients)) {
      yPosition += 5
      pdf.setFontSize(12)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Regression Coefficients', margin, yPosition)
      yPosition += 7
      
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      result.coefficients.forEach((coef: any) => {
        if (yPosition > pageHeight - margin - 10) {
          pdf.addPage()
          yPosition = margin
        }
        const sig = coef.pValue < 0.05 ? '*' : ''
        pdf.text(`${coef.name}: ${formatNumber(coef.coefficient)} (SE=${formatNumber(coef.stdError)}) ${sig}`, 
          margin + 5, yPosition)
        yPosition += 5
      })
    }
  }
  
  // 차트 추가
  if (data.analysis.charts && data.analysis.charts.length > 0) {
    for (const chartBase64 of data.analysis.charts) {
      // 새 페이지에 차트 추가
      pdf.addPage()
      yPosition = margin
      
      pdf.setFontSize(14)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Visualization', margin, yPosition)
      yPosition += 10
      
      // 이미지 추가 (비율 유지)
      const imgWidth = contentWidth
      const imgHeight = imgWidth * 0.6 // 대략적인 비율
      
      pdf.addImage(chartBase64, 'PNG', margin, yPosition, imgWidth, imgHeight)
    }
  }
  
  // 푸터 추가
  const totalPages = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    pdf.text('Generated by Statistical Platform', margin, pageHeight - 10)
  }
  
  return pdf
}

/**
 * PDF 다운로드
 */
export function downloadPDF(pdf: InstanceType<typeof import('jspdf').default>, filename: string = 'statistical-report.pdf') {
  pdf.save(filename)
}

/**
 * 숫자 포맷팅
 */
function formatNumber(value: number, decimals: number = 3): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A'
  }
  return value.toFixed(decimals)
}

/**
 * 간단한 보고서 생성 (차트 없이)
 */
export async function generateQuickReport(
  testName: string,
  result: any,
  datasetName: string = 'Dataset'
): Promise<void> {
  const reportData: ReportData = {
    title: 'Statistical Analysis Report',
    dataset: datasetName,
    analysis: {
      testName,
      result
    },
    metadata: {
      createdAt: new Date()
    }
  }
  
  const pdf = await generateStatisticalReport(reportData)
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
  downloadPDF(pdf, `report-${testName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`)
}