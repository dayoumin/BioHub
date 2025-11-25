// Fix design-system new window to match design system colors (monochrome)
// Add more sample data (30 rows) to demonstrate scrolling
// Better Before/After comparison without strikethrough

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/app/(dashboard)/design-system/page.tsx';
let content = readFileSync(filePath, 'utf8');

// Find the sample data section and replace with 30 rows + matching colors
const oldSampleSection = `                          const sampleData = [
                            { group: 'A', value: 10, age: 25, score: 85, time: '10:30' },
                            { group: 'B', value: 20, age: 30, score: 90, time: '11:00' },
                            { group: 'A', value: 15, age: 28, score: 88, time: '10:45' },
                            { group: 'B', value: 25, age: 32, score: 92, time: '11:15' },
                            { group: 'A', value: 12, age: 26, score: 86, time: '10:35' }
                          ]

                          const columns = Object.keys(sampleData[0])
                          // 2024 Modern Pattern: Flex-based Full Viewport
                          const htmlContent = \`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>샘플 데이터 - 디자인 시스템</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 24px;
      gap: 16px;
    }
    .header {
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 6px;
      letter-spacing: -0.02em;
    }
    .info {
      color: #64748b;
      font-size: 14px;
      font-weight: 500;
    }
    .info strong {
      color: #6366f1;
    }
    .table-container {
      flex: 1;
      min-height: 0;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .table-wrapper {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
    .table-wrapper::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .table-wrapper::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    .table-wrapper::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    .table-wrapper::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    th {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      color: #334155;
      font-weight: 600;
      padding: 14px 12px;
      text-align: left;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #475569;
      transition: background-color 0.15s ease;
    }
    tr:hover td {
      background-color: #f8fafc;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .row-number {
      background: #f8fafc;
      font-weight: 600;
      color: #94a3b8;
      text-align: center;
      width: 60px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    tr:hover .row-number {
      background: #f1f5f9;
      color: #6366f1;
    }
    @media print {
      html, body {
        height: auto;
        overflow: visible;
        background: white;
      }
      .container {
        height: auto;
        padding: 0;
      }
      .header, .table-container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>샘플 데이터 (디자인 시스템)</h1>
      <div class="info">
        총 <strong>5</strong>행 × <strong>5</strong>개 변수
      </div>
    </div>
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="row-number">#</th>
              \${columns.map(col => \`<th>\${col}</th>\`).join('')}
            </tr>
          </thead>
          <tbody>
            \${sampleData.map((row, idx) => \`
              <tr>
                <td class="row-number">\${idx + 1}</td>
                \${columns.map(col => \`<td>\${row[col as keyof typeof row] ?? ''}</td>\`).join('')}
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
                          \`

                          // scrollbars=yes removed for single scrollbar
                          const newWindow = window.open('', '_blank', 'width=1200,height=800,resizable=yes')`;

const newSampleSection = `                          // 30 rows of sample data for scroll demonstration
                          const sampleData = Array.from({ length: 30 }, (_, i) => ({
                            group: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
                            value: Math.round(10 + Math.random() * 90),
                            age: Math.round(20 + Math.random() * 40),
                            score: Math.round(60 + Math.random() * 40),
                            time: \`\${String(9 + Math.floor(i / 6)).padStart(2, '0')}:\${String((i * 10) % 60).padStart(2, '0')}\`
                          }))

                          const columns = Object.keys(sampleData[0])
                          // 2024 Modern Pattern: Monochrome Design System
                          const htmlContent = \`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>샘플 데이터 - 디자인 시스템</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
      background: hsl(0 0% 96%);
    }
    .container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 24px;
      gap: 16px;
    }
    .header {
      flex-shrink: 0;
      background: hsl(0 0% 100%);
      border: 1px solid hsl(0 0% 90%);
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      color: hsl(0 0% 10%);
      margin-bottom: 4px;
      letter-spacing: -0.01em;
    }
    .info {
      color: hsl(0 0% 45%);
      font-size: 14px;
      font-weight: 400;
    }
    .info strong {
      color: hsl(0 0% 20%);
      font-weight: 600;
    }
    .table-container {
      flex: 1;
      min-height: 0;
      background: hsl(0 0% 100%);
      border: 1px solid hsl(0 0% 90%);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .table-wrapper {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
    .table-wrapper::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .table-wrapper::-webkit-scrollbar-track {
      background: hsl(0 0% 96%);
    }
    .table-wrapper::-webkit-scrollbar-thumb {
      background: hsl(0 0% 80%);
      border-radius: 4px;
    }
    .table-wrapper::-webkit-scrollbar-thumb:hover {
      background: hsl(0 0% 65%);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    th {
      background: hsl(0 0% 98%);
      color: hsl(0 0% 25%);
      font-weight: 600;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid hsl(0 0% 90%);
      white-space: nowrap;
    }
    td {
      padding: 10px 16px;
      border-bottom: 1px solid hsl(0 0% 95%);
      color: hsl(0 0% 30%);
      transition: background-color 0.1s ease;
    }
    tr:hover td {
      background-color: hsl(0 0% 98%);
    }
    tr:last-child td {
      border-bottom: none;
    }
    .row-number {
      background: hsl(0 0% 98%);
      font-weight: 500;
      color: hsl(0 0% 55%);
      text-align: center;
      width: 50px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    tr:hover .row-number {
      background: hsl(0 0% 95%);
      color: hsl(0 0% 25%);
    }
    @media print {
      html, body {
        height: auto;
        overflow: visible;
        background: white;
      }
      .container {
        height: auto;
        padding: 0;
      }
      .header, .table-container {
        box-shadow: none;
        border: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>샘플 데이터 (디자인 시스템)</h1>
      <div class="info">
        총 <strong>\${sampleData.length}</strong>행 × <strong>\${columns.length}</strong>개 변수
      </div>
    </div>
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="row-number">#</th>
              \${columns.map(col => \`<th>\${col}</th>\`).join('')}
            </tr>
          </thead>
          <tbody>
            \${sampleData.map((row, idx) => \`
              <tr>
                <td class="row-number">\${idx + 1}</td>
                \${columns.map(col => \`<td>\${row[col as keyof typeof row] ?? ''}</td>\`).join('')}
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
                          \`

                          // scrollbars=yes removed for single scrollbar
                          const newWindow = window.open('', '_blank', 'width=1200,height=800,resizable=yes')`;

content = content.replace(oldSampleSection, newSampleSection);

// Update the description to show 30 rows
content = content.replace(
  `<h4 className="font-medium">샘플 데이터 (5행 × 5열)</h4>`,
  `<h4 className="font-medium">샘플 데이터 (30행 × 5열)</h4>`
);

content = content.replace(
  `group, value, age, score, time 변수`,
  `group, value, age, score, time 변수 (스크롤 테스트용)`
);

// Update the Before/After section - better visual comparison without strikethrough
const oldBeforeAfter = `                  {/* Before/After 비교 */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">Before vs After (2000s vs 2024)</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <p className="font-medium text-destructive">2000s Style</p>
                        <ul className="text-muted-foreground space-y-0.5 line-through opacity-60">
                          <li>• body padding: 20px</li>
                          <li>• background: #f5f5f5</li>
                          <li>• border: 1px solid #ddd</li>
                          <li>• scrollbars=yes</li>
                          <li>• max-height: calc(...)</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-success">2024 Modern</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• html,body overflow: hidden</li>
                          <li>• linear-gradient bg</li>
                          <li>• box-shadow only</li>
                          <li>• scrollbars removed</li>
                          <li>• flex: 1; min-height: 0</li>
                        </ul>
                      </div>
                    </div>
                  </div>`;

const newBeforeAfter = `                  {/* Before/After 비교 테이블 */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-medium border-b">항목</th>
                          <th className="text-left p-3 font-medium border-b border-l bg-destructive/5">2000s</th>
                          <th className="text-left p-3 font-medium border-b border-l">2024</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-2.5 text-muted-foreground">레이아웃</td>
                          <td className="p-2.5 border-l bg-destructive/5"><code className="text-[10px]">body padding: 20px</code></td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">flex + height: 100vh</code></td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">배경</td>
                          <td className="p-2.5 border-l bg-destructive/5"><code className="text-[10px]">#f5f5f5</code></td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">hsl(0 0% 96%)</code></td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">카드</td>
                          <td className="p-2.5 border-l bg-destructive/5"><code className="text-[10px]">border: 1px solid #ddd</code></td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">border + box-shadow</code></td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">스크롤</td>
                          <td className="p-2.5 border-l bg-destructive/5"><code className="text-[10px]">scrollbars=yes (이중)</code></td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">단일 + 커스텀</code></td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-muted-foreground">높이</td>
                          <td className="p-2.5 border-l bg-destructive/5"><code className="text-[10px]">max-height: calc(...)</code></td>
                          <td className="p-2.5 border-l"><code className="text-[10px]">flex: 1; min-height: 0</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>`;

content = content.replace(oldBeforeAfter, newBeforeAfter);

// Update 2024 Modern Pattern section to match design system
const oldModernPattern = `                  {/* 2024 Modern Pattern 특징 */}
                  <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-4 space-y-3 border border-indigo-200 dark:border-indigo-800">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></span>
                      2024 Modern Pattern
                    </h4>`;

const newModernPattern = `                  {/* 2024 Modern Pattern 특징 */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-foreground"></span>
                      2024 Modern Pattern
                    </h4>`;

content = content.replace(oldModernPattern, newModernPattern);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Design system updated: monochrome colors + 30 rows + better Before/After table');
