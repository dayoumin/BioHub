import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/components/smart-flow/steps/DataUploadStep.tsx';
let content = readFileSync(filePath, 'utf8');

// 도움말 섹션 수정 - 결측값 패턴 상세 표시
const oldHelpSection = `<li>• 결측값은 자동으로 인식됩니다 (빈 셀, NA, -, . 등)</li>`;

const newHelpSection = `<li>• 결측값은 자동으로 인식됩니다
              <span className="block text-xs text-muted-foreground/70 mt-0.5 ml-2">
                빈 셀, NA, N/A, -, ., NULL, NaN, #N/A, missing
              </span>
            </li>`;

content = content.replace(oldHelpSection, newHelpSection);

writeFileSync(filePath, content, 'utf8');
console.log('✅ 도움말 수정 완료');
