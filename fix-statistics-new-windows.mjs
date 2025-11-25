// Fix all statistics pages with 2000s style new window code
// Apply 2024 Modern Pattern (Flex-based Full Viewport + Monochrome)

import { readFileSync, writeFileSync } from 'fs';

// Modern HTML template for new window
const modernNewWindowTemplate = `
    const dataWindow = window.open('', '_blank', 'width=1200,height=800,resizable=yes')
    if (dataWindow) {
      const columns = uploadedData.columns
      const html = \`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>데이터 미리보기 - \${escapeHtml(uploadedData.fileName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
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
    }
    .info {
      color: hsl(0 0% 45%);
      font-size: 14px;
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
    .table-wrapper::-webkit-scrollbar { width: 8px; height: 8px; }
    .table-wrapper::-webkit-scrollbar-track { background: hsl(0 0% 96%); }
    .table-wrapper::-webkit-scrollbar-thumb { background: hsl(0 0% 80%); border-radius: 4px; }
    .table-wrapper::-webkit-scrollbar-thumb:hover { background: hsl(0 0% 65%); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { position: sticky; top: 0; z-index: 10; }
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
    }
    tr:hover td { background-color: hsl(0 0% 98%); }
    tr:last-child td { border-bottom: none; }
    .row-number {
      background: hsl(0 0% 98%);
      font-weight: 500;
      color: hsl(0 0% 55%);
      text-align: center;
      width: 50px;
      font-size: 12px;
    }
    tr:hover .row-number { background: hsl(0 0% 95%); color: hsl(0 0% 25%); }
    @media print {
      html, body { height: auto; overflow: visible; background: white; }
      .container { height: auto; padding: 0; }
      .header, .table-container { box-shadow: none; border: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\${escapeHtml(uploadedData.fileName)}</h1>
      <div class="info">총 <strong>\${uploadedData.data.length.toLocaleString()}</strong>행 × <strong>\${columns.length}</strong>개 변수</div>
    </div>
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="row-number">#</th>
              \\\${columns.map(col => \\\`<th>\\\${escapeHtml(col)}</th>\\\`).join('')}
            </tr>
          </thead>
          <tbody>
            \\\${uploadedData.data.map((row, idx) => \\\`
              <tr>
                <td class="row-number">\\\${idx + 1}</td>
                \\\${columns.map(col => \\\`<td>\\\${escapeHtml(String(row[col] ?? ''))}</td>\\\`).join('')}
              </tr>
            \\\`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
      \`
      dataWindow.document.write(html)
      dataWindow.document.close()
    }`;

// Old pattern to match (welch-t, stepwise)
const oldPattern = `
    const dataWindow = window.open('', '_blank', 'width=1200,height=800')
    if (dataWindow) {
      const columns = uploadedData.columns
      const html = \`
        <!DOCTYPE html>
        <html>
        <head>
          <title>데이터 미리보기 - \${escapeHtml(uploadedData.fileName)}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: 600; position: sticky; top: 0; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>\${escapeHtml(uploadedData.fileName)}</h2>
            <p>\${uploadedData.data.length.toLocaleString()}행 × \${columns.length}열</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                \${columns.map(col => \`<th>\${escapeHtml(col)}</th>\`).join('')}
              </tr>
            </thead>
            <tbody>
              \${uploadedData.data.map((row, idx) => \`
                <tr>
                  <td>\${idx + 1}</td>
                  \${columns.map(col => \`<td>\${escapeHtml(String(row[col] ?? ''))}</td>\`).join('')}
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </body>
        </html>
      \`
      dataWindow.document.write(html)
      dataWindow.document.close()
    }`;

// Files to update
const files = [
  'statistical-platform/app/(dashboard)/statistics/welch-t/page.tsx',
  'statistical-platform/app/(dashboard)/statistics/stepwise/page.tsx'
];

let updatedCount = 0;

for (const filePath of files) {
  try {
    let content = readFileSync(filePath, 'utf8');

    if (content.includes("window.open('', '_blank', 'width=1200,height=800')")) {
      content = content.replace(oldPattern, modernNewWindowTemplate);
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      updatedCount++;
    } else {
      console.log(`⏭️ Skipped (no old pattern): ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${filePath} - ${error.message}`);
  }
}

console.log(`\n📊 Total updated: ${updatedCount} files`);
