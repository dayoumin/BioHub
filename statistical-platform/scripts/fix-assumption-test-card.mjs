// Fix AssumptionTestCard to treat passed: null as incomplete (not failed)
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'components/statistics/common/AssumptionTestCard.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add hasIncomplete variable after hasWarnings (line 83)
const oldVars = `  // 전체 가정 충족 여부
  const allPassed = tests.every(test => test.passed === true)
  const hasViolations = tests.some(test => test.passed === false)
  const hasWarnings = tests.some(test => test.severity === 'medium')`;

const newVars = `  // 전체 가정 충족 여부
  const allPassed = tests.every(test => test.passed === true)
  const hasViolations = tests.some(test => test.passed === false)
  const hasIncomplete = tests.some(test => test.passed === null)
  const hasWarnings = tests.some(test => test.severity === 'medium')`;

if (content.includes(oldVars)) {
  content = content.replace(oldVars, newVars);
  console.log('✅ Added hasIncomplete variable');
} else {
  console.log('❌ Could not find variables block');
}

// 2. Fix the condition for showing failure message (line 154-157)
// Only show failure message when there are actual violations, not just incomplete tests
const oldMessage = `        {!allPassed && (
          <CardDescription className="mt-1 text-sm font-medium">
            일부 통계적 가정이 충족되지 않았습니다
          </CardDescription>
        )}`;

const newMessage = `        {hasViolations && (
          <CardDescription className="mt-1 text-sm font-medium">
            일부 통계적 가정이 충족되지 않았습니다
          </CardDescription>
        )}
        {!allPassed && hasIncomplete && !hasViolations && (
          <CardDescription className="mt-1 text-sm font-medium text-muted-foreground">
            일부 검정이 아직 완료되지 않았습니다
          </CardDescription>
        )}`;

if (content.includes(oldMessage)) {
  content = content.replace(oldMessage, newMessage);
  console.log('✅ Fixed failure message condition');
} else {
  console.log('❌ Could not find failure message block');
}

// 3. Fix StatusIcon logic to show different icon for incomplete state
// Current: allPassed ? CheckCircle2 : hasViolations ? XCircle : AlertCircle
// This already handles incomplete correctly (AlertCircle), so no change needed

writeFileSync(filePath, content, 'utf8');
console.log('✅ AssumptionTestCard updated successfully');