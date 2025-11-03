import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { AnalysisResult, DataRow } from '@/types/smart-flow'

// 한글 폰트를 위한 설정 (나중에 폰트 파일 추가 필요)
interface ReportData {
  title: string
  date: Date
  analysisResult: AnalysisResult
  dataInfo?: {
    totalRows: number
    columnCount: number
    variables?: string[]
  }
  chartElement?: HTMLElement | null
}

export class PDFReportService {
  /**
   * PDF 보고서 생성
   */
  static async generateReport(data: ReportData): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const lineHeight = 7
    let yPosition = margin

    // 헤더 추가
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Statistical Analysis Report', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += lineHeight * 2

    // 보고서 제목
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'normal')
    pdf.text(data.title, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += lineHeight

    // 날짜
    pdf.setFontSize(10)
    pdf.text(`Date: ${data.date.toLocaleDateString('ko-KR')} ${data.date.toLocaleTimeString('ko-KR')}`,
      pageWidth / 2, yPosition, { align: 'center' })
    yPosition += lineHeight * 2

    // 구분선
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += lineHeight

    // 1. 데이터 정보 섹션
    if (data.dataInfo) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('1. Data Information', margin, yPosition)
      yPosition += lineHeight

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.text(`- Total Rows: ${data.dataInfo.totalRows}`, margin + 5, yPosition)
      yPosition += lineHeight * 0.8
      pdf.text(`- Variables: ${data.dataInfo.columnCount}`, margin + 5, yPosition)
      yPosition += lineHeight * 0.8

      if (data.dataInfo.variables && data.dataInfo.variables.length > 0) {
        pdf.text(`- Variable Names: ${data.dataInfo.variables.slice(0, 5).join(', ')}${data.dataInfo.variables.length > 5 ? '...' : ''}`,
          margin + 5, yPosition)
        yPosition += lineHeight * 0.8
      }
      yPosition += lineHeight
    }

    // 2. 분석 방법 섹션
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('2. Analysis Method', margin, yPosition)
    yPosition += lineHeight

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`- Method: ${data.analysisResult.method}`, margin + 5, yPosition)
    yPosition += lineHeight * 1.5

    // 3. 가정 검정 결과 (있는 경우)
    if (data.analysisResult.assumptions) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('3. Assumptions Test', margin, yPosition)
      yPosition += lineHeight

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)

      // 정규성 검정
      if (data.analysisResult.assumptions.normality) {
        pdf.text('Normality Test (Shapiro-Wilk):', margin + 5, yPosition)
        yPosition += lineHeight * 0.8

        const norm = data.analysisResult.assumptions.normality
        if (norm.group1) {
          pdf.text(`  - Group 1: W=${norm.group1.statistic.toFixed(4)}, p=${norm.group1.pValue.toFixed(4)} ${norm.group1.isNormal ? '(Normal)' : '(Not Normal)'}`,
            margin + 10, yPosition)
          yPosition += lineHeight * 0.8
        }
        if (norm.group2) {
          pdf.text(`  - Group 2: W=${norm.group2.statistic.toFixed(4)}, p=${norm.group2.pValue.toFixed(4)} ${norm.group2.isNormal ? '(Normal)' : '(Not Normal)'}`,
            margin + 10, yPosition)
          yPosition += lineHeight * 0.8
        }
      }

      // 등분산 검정
      if (data.analysisResult.assumptions.homogeneity) {
        yPosition += lineHeight * 0.5
        const homo = data.analysisResult.assumptions.homogeneity
        const testName = homo.levene ? 'Levene' : homo.bartlett ? 'Bartlett' : 'Unknown'
        const statistic = homo.levene?.statistic ?? homo.bartlett?.statistic ?? 0
        const pValue = homo.levene?.pValue ?? homo.bartlett?.pValue ?? 0
        const equalVariance = homo.levene?.equalVariance ?? homo.bartlett?.equalVariance ?? false
        pdf.text(`Homogeneity Test (${testName}):`, margin + 5, yPosition)
        yPosition += lineHeight * 0.8
        pdf.text(`  - F=${statistic.toFixed(4)}, p=${pValue.toFixed(4)} ${equalVariance ? '(Equal Variance)' : '(Unequal Variance)'}`,
          margin + 10, yPosition)
        yPosition += lineHeight * 0.8
      }

      yPosition += lineHeight
    }

    // 4. 주요 결과 섹션
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('4. Main Results', margin, yPosition)
    yPosition += lineHeight

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)

    // 통계량
    pdf.text(`- Test Statistic: ${data.analysisResult.statistic.toFixed(4)}`, margin + 5, yPosition)
    yPosition += lineHeight * 0.8

    // p-value
    const pValueText = data.analysisResult.pValue < 0.001 ? '< 0.001' : data.analysisResult.pValue.toFixed(4)
    pdf.text(`- p-value: ${pValueText}`, margin + 5, yPosition)
    yPosition += lineHeight * 0.8

    // 효과 크기
    if (data.analysisResult.effectSize !== undefined) {
      pdf.text(`- Effect Size: ${data.analysisResult.effectSize.toFixed(4)}`, margin + 5, yPosition)
      yPosition += lineHeight * 0.8
    }

    // 신뢰구간
    if (data.analysisResult.confidence) {
      pdf.text(`- 95% Confidence Interval: [${data.analysisResult.confidence.lower.toFixed(4)}, ${data.analysisResult.confidence.upper.toFixed(4)}]`,
        margin + 5, yPosition)
      yPosition += lineHeight * 0.8
    }

    yPosition += lineHeight

    // 5. 해석 섹션
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('5. Interpretation', margin, yPosition)
    yPosition += lineHeight

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)

    // 해석 텍스트를 줄바꿈 처리
    const interpretationLines = pdf.splitTextToSize(data.analysisResult.interpretation, pageWidth - margin * 2)
    interpretationLines.forEach((line: string) => {
      if (yPosition > pageHeight - margin * 2) {
        pdf.addPage()
        yPosition = margin
      }
      pdf.text(line, margin, yPosition)
      yPosition += lineHeight * 0.8
    })

    // 6. 차트 추가 (있는 경우)
    if (data.chartElement) {
      try {
        // 새 페이지 시작 여부 확인
        if (yPosition > pageHeight - 100) {
          pdf.addPage()
          yPosition = margin
        }

        yPosition += lineHeight
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('6. Visualization', margin, yPosition)
        yPosition += lineHeight

        // HTML 요소를 이미지로 변환
        const canvas = await html2canvas(data.chartElement, {
          scale: 2,
          backgroundColor: '#ffffff'
        })

        const imgData = canvas.toDataURL('image/png')
        const imgWidth = pageWidth - margin * 2
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // 이미지가 페이지를 넘어가면 새 페이지
        if (yPosition + imgHeight > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
        }

        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
        yPosition += imgHeight + lineHeight
      } catch (error) {
        console.error('차트 이미지 변환 실패:', error)
      }
    }

    // 7. 권장 사항
    yPosition += lineHeight
    if (yPosition > pageHeight - margin * 3) {
      pdf.addPage()
      yPosition = margin
    }

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('7. Recommendations', margin, yPosition)
    yPosition += lineHeight

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)

    const recommendations = this.getRecommendations(data.analysisResult)
    recommendations.forEach((rec, index) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage()
        yPosition = margin
      }
      pdf.text(`${index + 1}. ${rec}`, margin + 5, yPosition)
      yPosition += lineHeight * 0.8
    })

    // 푸터 추가
    const pageCount = pdf.internal.pages.length - 1
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      pdf.text('Generated by Statistical Analysis Platform', pageWidth / 2, pageHeight - 5, { align: 'center' })
    }

    // PDF 저장
    const fileName = `statistical_report_${new Date().getTime()}.pdf`
    pdf.save(fileName)
  }

  /**
   * 분석 결과에 따른 권장 사항 생성
   */
  private static getRecommendations(result: AnalysisResult): string[] {
    const recommendations: string[] = []

    // p-value 기반 권장사항
    if (result.pValue < 0.05) {
      recommendations.push('The result is statistically significant. Consider practical significance.')
      if (result.effectSize !== undefined) {
        if (Math.abs(result.effectSize) < 0.2) {
          recommendations.push('Effect size is small. Results may have limited practical impact.')
        } else if (Math.abs(result.effectSize) < 0.5) {
          recommendations.push('Effect size is moderate. Results show meaningful practical difference.')
        } else {
          recommendations.push('Effect size is large. Results show substantial practical difference.')
        }
      }
    } else {
      recommendations.push('The result is not statistically significant. Consider increasing sample size.')
      recommendations.push('Check for data quality issues or outliers.')
    }

    // 가정 검정 기반 권장사항
    if (result.assumptions?.normality) {
      const norm = result.assumptions.normality
      if ((norm.group1 && !norm.group1.isNormal) || (norm.group2 && !norm.group2.isNormal)) {
        recommendations.push('Data violates normality assumption. Consider non-parametric tests.')
      }
    }

    if (result.assumptions?.homogeneity && !(result.assumptions.homogeneity.levene?.equalVariance ?? result.assumptions.homogeneity.bartlett?.equalVariance ?? false)) {
      recommendations.push('Data shows unequal variances. Consider Welch test or transformation.')
    }

    // 다음 분석 권장
    if (result.method.includes('t-test') && result.pValue < 0.05) {
      recommendations.push('Consider effect size analysis for practical significance.')
      recommendations.push('Conduct power analysis for future studies.')
    }

    if (result.method.includes('ANOVA') && result.pValue < 0.05) {
      recommendations.push('Perform post-hoc tests to identify specific group differences.')
    }

    return recommendations
  }

  /**
   * 간단한 요약 보고서 생성
   */
  static generateSummaryText(result: AnalysisResult): string {
    const pValueText = result.pValue < 0.001 ? '< 0.001' : result.pValue.toFixed(4)

    let summary = `Statistical Analysis Summary\n`
    summary += `========================\n\n`
    summary += `Method: ${result.method}\n`
    summary += `Test Statistic: ${result.statistic.toFixed(4)}\n`
    summary += `p-value: ${pValueText}\n`

    if (result.effectSize !== undefined) {
      summary += `Effect Size: ${result.effectSize.toFixed(4)}\n`
    }

    if (result.confidence) {
      summary += `95% CI: [${result.confidence.lower.toFixed(4)}, ${result.confidence.upper.toFixed(4)}]\n`
    }

    summary += `\nInterpretation:\n${result.interpretation}\n`

    if (result.assumptions) {
      summary += `\nAssumptions:\n`
      if (result.assumptions.normality) {
        const norm = result.assumptions.normality
        if (norm.group1) {
          summary += `- Normality (Group 1): ${norm.group1.isNormal ? 'Met' : 'Violated'} (p=${norm.group1.pValue.toFixed(4)})\n`
        }
        if (norm.group2) {
          summary += `- Normality (Group 2): ${norm.group2.isNormal ? 'Met' : 'Violated'} (p=${norm.group2.pValue.toFixed(4)})\n`
        }
      }
      if (result.assumptions.homogeneity) {
        const equalVariance = result.assumptions.homogeneity.levene?.equalVariance ?? result.assumptions.homogeneity.bartlett?.equalVariance ?? false
        const pValue = result.assumptions.homogeneity.levene?.pValue ?? result.assumptions.homogeneity.bartlett?.pValue ?? 0
        summary += `- Equal Variance: ${equalVariance ? 'Met' : 'Violated'} (p=${pValue.toFixed(4)})\n`
      }
    }

    return summary
  }
}