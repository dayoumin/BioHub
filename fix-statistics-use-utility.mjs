// Update statistics pages to use openDataWindow utility
import { readFileSync, writeFileSync } from 'fs';

const files = [
  {
    path: 'statistical-platform/app/(dashboard)/statistics/welch-t/page.tsx',
    oldHandler: `  // "새 창으로 보기" 핸들러
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return

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
    }
  }, [uploadedData])`,
    newHandler: `  // "새 창으로 보기" 핸들러
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return
    openDataWindow({
      fileName: uploadedData.fileName,
      columns: uploadedData.columns,
      data: uploadedData.data
    })
  }, [uploadedData])`
  },
  {
    path: 'statistical-platform/app/(dashboard)/statistics/stepwise/page.tsx',
    oldHandler: `  // "새 창으로 보기" 핸들러
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return

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
    }
  }, [uploadedData])`,
    newHandler: `  // "새 창으로 보기" 핸들러
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return
    openDataWindow({
      fileName: uploadedData.fileName,
      columns: uploadedData.columns,
      data: uploadedData.data
    })
  }, [uploadedData])`
  }
];

for (const file of files) {
  let content = readFileSync(file.path, 'utf8');

  // Add import if not exists
  if (!content.includes("import { openDataWindow }")) {
    // Find the last import line and add after it
    const importMatch = content.match(/^import .+ from ['"][^'"]+['"]\s*$/gm);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      content = content.replace(
        lastImport,
        lastImport + "\nimport { openDataWindow } from '@/lib/utils/open-data-window'"
      );
    }
  }

  // Replace handler
  if (content.includes(file.oldHandler)) {
    content = content.replace(file.oldHandler, file.newHandler);
    writeFileSync(file.path, content, 'utf8');
    console.log(`✅ Updated: ${file.path}`);
  } else {
    console.log(`⚠️ Handler not found exactly: ${file.path}`);
  }
}

console.log('\n✅ Done! Files updated to use openDataWindow utility');
