// Add New Window Style Guide to DESIGN_SYSTEM_SYNC_RULES.md

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/docs/DESIGN_SYSTEM_SYNC_RULES.md';
let content = readFileSync(filePath, 'utf8');

// Add new section before the summary section
const summarySection = `---

## 📌 요약`;

const newWindowGuide = `---

## 6. 새 창/팝업 스타일 가이드 (2024 Modern Pattern)

### 6.1 문제: 이중 스크롤바

**2000년대 구식 패턴 (사용 금지)**:
\`\`\`css
body {
  padding: 20px;
  background: #f5f5f5;
}
.table-wrapper {
  overflow: auto;
  max-height: calc(100vh - 140px);  /* 이중 스크롤바 원인 */
}
\`\`\`

\`\`\`javascript
window.open('', '_blank', 'width=1200,height=800,scrollbars=yes')  // scrollbars=yes 사용 금지
\`\`\`

---

### 6.2 해결: Flex 기반 Full Viewport

**2024 Modern Pattern (권장)**:

\`\`\`css
/* 핵심 1: 브라우저 스크롤바 제거 */
html, body {
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
  background: hsl(0 0% 96%);  /* 모노크롬 디자인 시스템 */
}

/* 핵심 2: Flex 레이아웃으로 화면 분할 */
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 16px;
}

/* 핵심 3: 헤더는 고정 크기 */
.header {
  flex-shrink: 0;
  background: hsl(0 0% 100%);
  border: 1px solid hsl(0 0% 90%);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* 핵심 4: 테이블 컨테이너가 남은 공간 차지 */
.table-container {
  flex: 1;
  min-height: 0;  /* 중요! flex 버그 방지 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 핵심 5: 단일 스크롤바 */
.table-wrapper {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

/* 핵심 6: 커스텀 스크롤바 */
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
\`\`\`

\`\`\`javascript
// scrollbars=yes 제거
window.open('', '_blank', 'width=1200,height=800,resizable=yes')
\`\`\`

---

### 6.3 Before/After 비교

| 항목 | 2000s (금지) | 2024 (권장) |
|------|-------------|-------------|
| 레이아웃 | \`body padding: 20px\` | \`flex + height: 100vh\` |
| 배경 | \`#f5f5f5\` | \`hsl(0 0% 96%)\` |
| 카드 | \`border: 1px solid #ddd\` | \`border + box-shadow\` |
| 스크롤 | \`scrollbars=yes\` (이중) | 단일 + 커스텀 |
| 높이 | \`max-height: calc(...)\` | \`flex: 1; min-height: 0\` |
| 색상 | \`#333, #666, #999\` | \`hsl(0 0% xx%)\` |

---

### 6.4 참조 구현

**표준 구현 파일**:
- \`components/smart-flow/steps/DataValidationStep.tsx\` (handleOpenDataInNewWindow)
- \`app/(dashboard)/design-system/page.tsx\` (Data Utilities 섹션)

**디자인 시스템 확인**:
\`\`\`bash
npm run dev
# → http://localhost:3000/design-system → Data Utilities → "새 창으로 보기" 버튼
\`\`\`

---

## 📌 요약`;

content = content.replace(summarySection, newWindowGuide);

// Update lastUpdated
content = content.replace(
  /\*\*최종 수정\*\*: \d{4}-\d{2}-\d{2}/,
  '**최종 수정**: 2025-11-25'
);

content = content.replace(
  /\*\*Updated\*\*: \d{4}-\d{2}-\d{2}/,
  '**Updated**: 2025-11-25'
);

// Update version
content = content.replace(
  /\*\*Version\*\*: 1\.0\.0/,
  '**Version**: 1.1.0'
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ DESIGN_SYSTEM_SYNC_RULES.md updated with New Window Style Guide');
