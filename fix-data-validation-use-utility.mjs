// Fix DataValidationStep to use openDataWindow utility instead of inline HTML template

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'components/smart-flow/steps/DataValidationStep.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add import for openDataWindow
const oldImport = "import { logger } from '@/lib/utils/logger'";
const newImport = `import { logger } from '@/lib/utils/logger'
import { openDataWindow } from '@/lib/utils/open-data-window'`;

content = content.replace(oldImport, newImport);

// 2. Remove the escapeHtml function (no longer needed - utility has its own)
const escapeHtmlFunction = `// HTML escape 함수 - XSS 공격 방지
function escapeHtml(text: string | number | null | undefined): string {
  if (text == null) return ''
  const str = String(text)
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return str.replace(/[&<>"']/g, m => map[m])
}

`;

content = content.replace(escapeHtmlFunction, '');

// 3. Replace the entire handleOpenDataInNewWindow function
// Find the function start and end
const functionStartMarker = '  // 새 창으로 데이터 보기\n  const handleOpenDataInNewWindow = useCallback(() => {';
const functionEndMarker = '  }, [data, uploadedFile, uploadedFileName, validationResults?.totalRows, validationResults?.columnCount])';

const startIndex = content.indexOf(functionStartMarker);
const endIndex = content.indexOf(functionEndMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const beforeFunction = content.substring(0, startIndex);
  const afterFunction = content.substring(endIndex + functionEndMarker.length);

  const newFunction = `  // 새 창으로 데이터 보기 (공유 유틸리티 사용)
  const handleOpenDataInNewWindow = useCallback(() => {
    if (!data || data.length === 0) return

    const columns = Object.keys(data[0])
    openDataWindow({
      fileName: uploadedFile?.name || uploadedFileName || '업로드된 데이터',
      columns,
      data
    })
  }, [data, uploadedFile, uploadedFileName])`;

  content = beforeFunction + newFunction + afterFunction;
}

writeFileSync(filePath, content, 'utf8');
console.log('✅ DataValidationStep.tsx updated to use openDataWindow utility');
