// Discriminant Analysis 가드 수정
// Issue 1: accuracy undefined 시 practical 중립 메시지
// Issue 2: accuracy = 0 시 0.0% 표시
// Issue 3: Box's M 경고를 statistical 섹션으로 이동

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/lib/interpretation/engine.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// ===== Issue 1 & 2: practical 섹션 전체 재작성 =====
// 기존 practical 섹션 찾기 (Line 648-652)
const oldPractical = `practical: accuracyLevel === 'high'
        ? \`정확도가 높습니다 (\${accuracy ? (accuracy * 100).toFixed(1) : ''}% ≥ 70%). 판별함수를 새로운 데이터 분류에 사용할 수 있습니다. 판별계수(discriminant coefficients)가 큰 변수가 주요 판별변수입니다.\`
        : accuracyLevel === 'moderate'
          ? \`정확도가 중간 수준입니다 (\${accuracy ? (accuracy * 100).toFixed(1) : ''}%). 추가 변수를 포함하거나 변수 변환(로그, 다항식 등)을 고려하세요. 혼동행렬(confusion matrix)에서 오분류 패턴을 분석하세요.\`
          : \`정확도가 낮습니다 (\${accuracy ? (accuracy * 100).toFixed(1) : ''}% < 50%). 판별 변수를 재검토하거나, 비선형 방법(QDA, 머신러닝)을 고려하세요. \${boxM?.significant === true ? 'Box\\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었을 수 있습니다.' : ''}\``;

const newPractical = `practical: accuracy !== undefined
        ? (accuracyLevel === 'high'
          ? \`정확도가 높습니다 (\${(accuracy * 100).toFixed(1)}% ≥ 70%). 판별함수를 새로운 데이터 분류에 사용할 수 있습니다. 판별계수(discriminant coefficients)가 큰 변수가 주요 판별변수입니다.\`
          : accuracyLevel === 'moderate'
            ? \`정확도가 중간 수준입니다 (\${(accuracy * 100).toFixed(1)}%). 추가 변수를 포함하거나 변수 변환(로그, 다항식 등)을 고려하세요. 혼동행렬(confusion matrix)에서 오분류 패턴을 분석하세요.\`
            : \`정확도가 낮습니다 (\${(accuracy * 100).toFixed(1)}% < 50%). 판별 변수를 재검토하거나, 비선형 방법(QDA, 머신러닝)을 고려하세요.\`)
        : '판별계수(discriminant coefficients)가 큰 변수가 주요 판별변수입니다. 혼동행렬로 분류 성능을 평가하세요.'`;

content = content.replace(oldPractical, newPractical);

// ===== Issue 3: Box's M 경고를 statistical 섹션으로 이동 =====
// statistical 섹션 찾기 (Line 641-647)
const oldStatistical = `statistical: wilksLambda?.pValue !== undefined
        ? wilksSignificant
          ? \`Wilks' Lambda 검정 결과 그룹 간 통계적으로 유의한 차이가 있습니다 (p=\${formatPValue(wilksLambda.pValue)}). 판별함수가 그룹을 효과적으로 구분합니다.\`
          : \`Wilks' Lambda 검정 결과 그룹 간 통계적으로 유의한 차이가 없습니다 (p=\${formatPValue(wilksLambda.pValue)}). 판별함수의 유효성이 낮습니다.\`
        : accuracy !== undefined
          ? \`분류 정확도는 \${(accuracy * 100).toFixed(1)}%입니다.\`
          : '판별분석이 완료되었습니다.',`;

const newStatistical = `statistical: wilksLambda?.pValue !== undefined
        ? wilksSignificant
          ? \`Wilks' Lambda 검정 결과 그룹 간 통계적으로 유의한 차이가 있습니다 (p=\${formatPValue(wilksLambda.pValue)}). 판별함수가 그룹을 효과적으로 구분합니다.\${boxM?.significant === true ? ' 단, Box\\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었을 수 있습니다.' : ''}\`
          : \`Wilks' Lambda 검정 결과 그룹 간 통계적으로 유의한 차이가 없습니다 (p=\${formatPValue(wilksLambda.pValue)}). 판별함수의 유효성이 낮습니다.\${boxM?.significant === true ? ' 또한 Box\\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었습니다.' : ''}\`
        : accuracy !== undefined
          ? \`분류 정확도는 \${(accuracy * 100).toFixed(1)}%입니다.\${boxM?.significant === true ? ' Box\\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었을 수 있습니다.' : ''}\`
          : \`판별분석이 완료되었습니다.\${boxM?.significant === true ? ' Box\\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었습니다.' : ''}\`,`;

content = content.replace(oldStatistical, newStatistical);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ Discriminant Analysis 가드 수정 완료');
console.log('');
console.log('📍 Issue 1: accuracy undefined 시 중립 메시지');
console.log('  - practical: accuracy !== undefined 체크');
console.log('  - fallback: 판별계수가 큰 변수가 주요 판별변수입니다...');
console.log('');
console.log('📍 Issue 2: accuracy = 0 시 0.0% 표시');
console.log('  - accuracy !== undefined 체크로 변경');
console.log('  - accuracy = 0 → 0.0%');
console.log('  - accuracy = undefined → 괄호 제거');
console.log('');
console.log('📍 Issue 3: Box M 경고 모든 레벨에서 표시');
console.log('  - statistical 섹션으로 이동');
console.log('  - 모든 분기에 Box M 경고 추가');
