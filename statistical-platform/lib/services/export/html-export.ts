/**
 * HTML 내보내기 서비스
 * 
 * 분석 결과를 단일 HTML 파일로 변환합니다.
 * - 모던한 디자인 (CSS Variables, Flexbox/Grid)
 * - 반응형 레이아웃
 * - AI 해석 포함
 * - 인쇄 친화적 스타일
 */

import type { NormalizedExportData, ExportResult, ExportRow } from './export-types'
import { buildFileName, downloadBlob } from './export-data-builder'

const STYLE = `
:root {
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --border: #e2e8f0;
  --card: #ffffff;
  --card-foreground: #020817;
  --destructive: #ef4444;
  --radius: 0.5rem;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  color: var(--card-foreground);
  background-color: #f8fafc;
  margin: 0;
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card);
  padding: 2rem;
  border-radius: var(--radius);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

header {
  border-bottom: 2px solid var(--muted);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
}

h1 {
  font-size: 1.875rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #0f172a;
}

.meta {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

section {
  margin-bottom: 2.5rem;
  break-inside: avoid;
}

h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  border-left: 4px solid var(--primary);
  padding-left: 0.75rem;
  margin: 0 0 1rem 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

th {
  background-color: var(--muted);
  color: #475569;
  font-weight: 600;
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  color: #334155;
}

tr:last-child td {
  border-bottom: none;
}

.key-value-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--muted);
  padding: 1rem;
  border-radius: var(--radius);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--primary);
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-success { background: #dcfce7; color: #166534; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.badge-neutral { background: #f1f5f9; color: #475569; }

.interpretation {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: var(--radius);
  padding: 1.25rem;
  color: #0369a1;
}

.ai-insight {
  background: linear-gradient(to right, #fdf4ff, #fae8ff);
  border: 1px solid #f0abfc;
  border-radius: var(--radius);
  padding: 1.5rem;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: #86198f;
  font-weight: 600;
}

.ai-content {
  font-size: 0.925rem;
  color: #4a044e;
  white-space: pre-wrap;
}

.footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

@media print {
  body { background: white; padding: 0; }
  .container { box-shadow: none; padding: 0; max-width: 100%; }
  header { margin-bottom: 1rem; }
  section { page-break-inside: avoid; }
  .no-print { display: none; }
}
`

function escapeHtml(input: string | number | null | undefined): string {
  const text = String(input ?? '')
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderTable(
  headers: string[],
  rows: (string | number)[][],
  highlightCol?: number,
  highlightFn?: (val: string) => boolean,
  allowHtmlCols: number[] = []
) {
    return `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map((cell, idx) => {
        const val = String(cell)
        const isHighlight = highlightCol === idx && highlightFn?.(val)
        const style = isHighlight ? 'font-weight:bold; color:var(--destructive);' : ''
        const content = allowHtmlCols.includes(idx) ? val : escapeHtml(val)
        return `<td style="${style}">${content}</td>`
    }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function renderKeyValue(items: ExportRow[]) {
    return `
    <div class="key-value-grid">
      ${items.map(item => `
        <div class="stat-card">
          <div class="stat-label">${escapeHtml(item.label)}</div>
          <div class="stat-value">${escapeHtml(item.value)}</div>
        </div>
      `).join('')}
    </div>
  `
}

export async function exportHtml(data: NormalizedExportData): Promise<ExportResult> {
    try {
        const sections: string[] = []

        // 1. 기본 결과
        sections.push(`
      <section>
        <h2>분석 결과</h2>
        ${renderKeyValue(data.mainResults)}
      </section>
    `)

        // 2. APA
        if (data.apaString) {
            sections.push(`
        <section>
          <h2>APA 보고</h2>
          <div style="font-style: italic; background: var(--muted); padding: 1rem; border-radius: 0.5rem;">
            ${escapeHtml(data.apaString)}
          </div>
        </section>
      `)
        }

        // 3. 해석
        if (data.interpretation) {
            sections.push(`
        <section>
          <h2>해석</h2>
          <div class="interpretation">
            ${escapeHtml(data.interpretation)}
          </div>
        </section>
      `)
        }

        // 4. 추가 지표
        if (data.additionalMetrics.length > 0) {
            sections.push(`
        <section>
          <h2>추가 지표</h2>
          ${renderKeyValue(data.additionalMetrics)}
        </section>
      `)
        }

        // 5. 집단 통계
        if (data.groupStats) {
            sections.push(`
        <section>
          <h2>집단별 기술통계</h2>
          ${renderTable(
                ['그룹', '표본수 (N)', '평균 (Mean)', '표준편차 (SD)'],
                data.groupStats.map(g => [g.name, g.n, g.mean, g.std])
            )}
        </section>
      `)
        }

        // 6. 사후 검정
        if (data.postHocResults) {
            sections.push(`
        <section>
          <h2>사후 검정</h2>
          ${renderTable(
                ['비교', '평균 차이', 'p-value', '유의성'],
                data.postHocResults.map(ph => [
                    ph.comparison,
                    ph.meanDiff,
                    ph.pValue,
                    ph.significant ? '유의함 *' : '-'
                ]),
                3,
                val => val.includes('유의함')
            )}
        </section>
      `)
        }

        // 7. 가정 검정
        if (data.assumptions.length > 0) {
            sections.push(`
        <section>
          <h2>가정 검정</h2>
          ${renderTable(
                ['검정 항목', '통계량', 'p-value', '결과'],
                data.assumptions.map(a => [
                    a.name,
                    a.statistic,
                    a.pValue,
                    `<span class="badge ${a.passed ? 'badge-success' : 'badge-danger'}">
                ${a.passed ? '충족' : '미충족'}
               </span>`
                ]),
                undefined,
                undefined,
                [3]
            )}
        </section>
      `)
        }

        // 8. 방법론
        if (data.methodology) {
            sections.push(`
        <section>
          <h2>분석 방법론</h2>
          <div class="interpretation">
            ${escapeHtml(data.methodology)}
          </div>
        </section>
      `)
        }

        // 9. 참고문헌
        if (data.references && data.references.length > 0) {
            sections.push(`
        <section>
          <h2>참고문헌</h2>
          <ul style="margin: 0; padding-left: 1.2rem;">
            ${data.references.map(ref => `<li style="margin-bottom: 0.5rem;">${escapeHtml(ref)}</li>`).join('')}
          </ul>
        </section>
      `)
        }

        // 10. 원본 데이터 (미리보기)
        if (data.rawData && data.rawData.columns.length > 0 && data.rawData.rows.length > 0) {
            sections.push(`
        <section>
          <h2>원본 데이터 (미리보기)</h2>
          ${renderTable(data.rawData.columns, data.rawData.rows)}
        </section>
      `)
        }

        // 11. AI 해석 (중요)
        if (data.aiInterpretation) {
            sections.push(`
        <section>
          <h2>AI 심층 분석</h2>
          <div class="ai-insight">
            <div class="ai-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              AI Insight
            </div>
            <div style="font-weight: 600; margin-bottom: 0.5rem;">요약</div>
            <div class="ai-content" style="margin-bottom: 1rem;">${escapeHtml(data.aiInterpretation.summary)}</div>
            ${data.aiInterpretation.detail ? `
              <div style="font-weight: 600; margin-bottom: 0.5rem; border-top: 1px dashed #f5d0fe; padding-top: 1rem;">상세 분석</div>
              <div class="ai-content">${escapeHtml(data.aiInterpretation.detail)}</div>
            ` : ''}
          </div>
        </section>
      `)
        }

        const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>${STYLE}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(data.title)}</h1>
      <div class="meta">
        ${escapeHtml(data.date)} | ${escapeHtml(data.dataInfo?.fileName || '데이터 분석 결과')}
      </div>
    </header>
    
    <main>
      ${sections.join('')}
    </main>

    <div class="footer">
      Generated by Statistical Platform • ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
    `

        const fileName = buildFileName(data.method, 'html')
        const blob = new Blob([html], { type: 'text/html' })
        downloadBlob(blob, fileName)

        return { success: true, fileName }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'HTML export failed' }
    }
}
