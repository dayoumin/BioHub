// Update design-system page with modern new window pattern
// Add Before/After comparison and coding guidelines

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/app/(dashboard)/design-system/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Find and replace the old CSS in the sample data new window section
const oldNewWindowSection = `                          const columns = Object.keys(sampleData[0])
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
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
    }
    .header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e5e5;
    }
    h1 {
      font-size: 24px;
      color: #333;
      margin-bottom: 8px;
    }
    .info {
      color: #666;
      font-size: 14px;
    }
    .table-wrapper {
      overflow: auto;
      max-height: calc(100vh - 140px);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      position: sticky;
      top: 0;
      background: #f8f9fa;
      color: #333;
      font-weight: 600;
      padding: 12px 8px;
      text-align: left;
      border-bottom: 2px solid #dee2e6;
      z-index: 10;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e9ecef;
      color: #495057;
    }
    tr:hover {
      background-color: #f8f9fa;
    }
    .row-number {
      background: #f1f3f5;
      font-weight: 500;
      color: #868e96;
      text-align: center;
      width: 60px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>샘플 데이터 (디자인 시스템)</h1>
      <div class="info">
        총 5행 × 5개 변수
      </div>
    </div>
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
</body>
</html>
                          \`

                          const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')`;

const newNewWindowSection = `                          const columns = Object.keys(sampleData[0])
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

content = content.replace(oldNewWindowSection, newNewWindowSection);

// 2. Update the feature list to reflect new modern features
const oldFeatureList = `                  {/* 기능 설명 */}
                  <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm">✨ 주요 기능:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• ✅ Sticky Header (스크롤 시 헤더 고정)</li>
                      <li>• ✅ 행 번호 표시 (#1, #2, #3...)</li>
                      <li>• ✅ Hover 효과 (마우스 오버 시 배경 변경)</li>
                      <li>• ✅ 인쇄 지원 (@media print)</li>
                      <li>• ✅ 반응형 디자인 (모바일/태블릿 대응)</li>
                      <li>• ✅ 대용량 데이터 최적화 (가상 스크롤 가능)</li>
                    </ul>
                  </div>`;

const newFeatureList = `                  {/* 2024 Modern Pattern 특징 */}
                  <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-4 space-y-3 border border-indigo-200 dark:border-indigo-800">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></span>
                      2024 Modern Pattern
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Layout</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Flex-based Full Viewport</li>
                          <li>• Single scrollbar (no double)</li>
                          <li>• min-height: 0 (flex bug fix)</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Visual</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Glassmorphism header</li>
                          <li>• Gradient background</li>
                          <li>• Custom scrollbar</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Typography</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Tailwind color system</li>
                          <li>• tabular-nums for numbers</li>
                          <li>• letter-spacing: -0.02em</li>
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">UX</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          <li>• Smooth hover transitions</li>
                          <li>• Sticky thead</li>
                          <li>• Print-friendly</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Before/After 비교 */}
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

content = content.replace(oldFeatureList, newFeatureList);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Design system page updated with modern new window pattern and Before/After comparison');
