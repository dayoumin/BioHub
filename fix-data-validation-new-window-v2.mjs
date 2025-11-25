// Update DataValidationStep new window to match monochrome design system

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/components/smart-flow/steps/DataValidationStep.tsx';
let content = readFileSync(filePath, 'utf8');

// Replace the gradient purple style with monochrome design system
const oldStyle = `    html, body {
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
    th:first-child {
      border-radius: 0;
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
    }`;

const newStyle = `    html, body {
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
    }`;

content = content.replace(oldStyle, newStyle);

// Update HTML info section
content = content.replace(
  `총 <strong>\${validationResults.totalRows.toLocaleString()}</strong>행 × <strong>\${validationResults.columnCount}</strong>개 변수`,
  `총 <strong>\${validationResults.totalRows.toLocaleString()}</strong>행 × <strong>\${validationResults.columnCount}</strong>개 변수`
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ DataValidationStep new window updated to monochrome design system');
