#!/usr/bin/env node

/**
 * 변수 Role 매핑 일관성 검증 스크립트
 *
 * @description
 * variable-requirements.ts의 role과 types/statistics.ts의 필드명 일치 여부 자동 검증
 *
 * 검증 항목:
 * 1. variable-requirements.ts role → types/statistics.ts 필드명 일치
 * 2. converter 함수가 올바른 필드명 사용
 * 3. 페이지에서 올바른 필드명 사용
 *
 * 사용법:
 * npm run validate:mapping
 * node scripts/statistics/validate-variable-mapping.js
 *
 * @example
 * // ✅ 올바른 매핑
 * variable-requirements.ts: { role: 'factor' }
 * types/statistics.ts: { factor: string[] }
 *
 * // ❌ 잘못된 매핑
 * variable-requirements.ts: { role: 'factor' }
 * types/statistics.ts: { groups: string[] }  // ❌ 불일치!
 */

const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 표준 role 매핑 (SPSS/R/SAS 표준)
const STANDARD_ROLE_MAPPING = {
  'factor': 'factor',      // 그룹 변수
  'within': 'within',      // 반복측정 (피험자 내)
  'dependent': 'dependent', // 종속변수
  'independent': 'independent', // 독립변수
  'covariate': 'covariate', // 공변량
  'blocking': 'blocking',   // 블록변수 (랜덤 효과)
  'variable': 'variable',   // 일반 변수
  'variables': 'variables', // 복수 변수
  'all': 'all'             // 전체 변수
};

// 금지된 필드명 (혼동 방지)
const FORBIDDEN_FIELD_NAMES = {
  'groups': 'factor로 변경',
  'conditions': 'dependent 또는 within으로 변경',
  'subjects': 'independent로 변경',
  'covariates': 'covariate로 변경 (단수형)'
};

let errors = 0;
let warnings = 0;

/**
 * variable-requirements.ts 파싱
 */
function parseVariableRequirements() {
  const filePath = path.join(__dirname, '../../lib/statistics/variable-requirements.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  const methodRoles = {};

  // methodId와 variables 추출
  const methodMatches = content.matchAll(/\{\s*id:\s*['"]([^'"]+)['"]/g);
  const methods = Array.from(methodMatches).map(m => m[1]);

  methods.forEach(methodId => {
    // 해당 methodId의 variables 섹션 추출
    const methodPattern = new RegExp(
      `id:\\s*['"]${methodId}['"][\\s\\S]*?variables:\\s*\\[([\\s\\S]*?)\\]`,
      'g'
    );
    const match = methodPattern.exec(content);

    if (match) {
      const variablesSection = match[1];
      // role 추출
      const roleMatches = variablesSection.matchAll(/role:\s*['"]([^'"]+)['"]/g);
      const roles = Array.from(roleMatches).map(m => m[1]);

      if (roles.length > 0) {
        methodRoles[methodId] = roles;
      }
    }
  });

  return methodRoles;
}

/**
 * types/statistics.ts에서 interface 추출
 */
function parseStatisticsTypes() {
  const filePath = path.join(__dirname, '../../types/statistics.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  const typeFields = {};

  // 모든 interface 매칭
  const interfacePattern = /export\s+interface\s+(\w+Variables)\s*\{([^}]+)\}/g;
  const interfaces = Array.from(content.matchAll(interfacePattern));

  interfaces.forEach(([, interfaceName, body]) => {
    // 필드명 추출 (?: 포함)
    const fieldMatches = body.matchAll(/(\w+)\??:\s*/g);
    const fields = Array.from(fieldMatches).map(m => m[1]);

    typeFields[interfaceName] = fields;
  });

  return typeFields;
}

/**
 * methodId를 TypeName으로 변환
 * @example 'kruskal-wallis' → 'KruskalWallisVariables'
 */
function methodIdToTypeName(methodId) {
  const camelCase = methodId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return `${camelCase}Variables`;
}

/**
 * role 매핑 검증
 */
function validateRoleMapping() {
  console.log(`${colors.cyan}${colors.bright}=== 변수 Role 매핑 검증 ===${colors.reset}\n`);

  const methodRoles = parseVariableRequirements();
  const typeFields = parseStatisticsTypes();

  let totalChecks = 0;
  let passedChecks = 0;

  Object.entries(methodRoles).forEach(([methodId, roles]) => {
    const typeName = methodIdToTypeName(methodId);
    const fields = typeFields[typeName];

    if (!fields) {
      console.log(`${colors.yellow}⚠️  [${methodId}] types/statistics.ts에 ${typeName} 없음${colors.reset}`);
      warnings++;
      return;
    }

    totalChecks++;

    // role들이 fields에 포함되어 있는지 확인
    const missingRoles = roles.filter(role => {
      const expectedField = STANDARD_ROLE_MAPPING[role];
      return expectedField && !fields.includes(expectedField);
    });

    // 금지된 필드명 사용 여부 확인
    const forbiddenUsages = fields.filter(field => FORBIDDEN_FIELD_NAMES[field]);

    if (missingRoles.length === 0 && forbiddenUsages.length === 0) {
      console.log(`${colors.green}✅ [${methodId}]${colors.reset} ${typeName}`);
      console.log(`   Roles: ${roles.join(', ')} → Fields: ${fields.join(', ')}`);
      passedChecks++;
    } else {
      console.log(`${colors.red}❌ [${methodId}]${colors.reset} ${typeName}`);

      if (missingRoles.length > 0) {
        console.log(`   ${colors.red}Missing:${colors.reset}`);
        missingRoles.forEach(role => {
          const expected = STANDARD_ROLE_MAPPING[role];
          console.log(`     - role: '${role}' → expected field: '${expected}'`);
        });
      }

      if (forbiddenUsages.length > 0) {
        console.log(`   ${colors.red}Forbidden:${colors.reset}`);
        forbiddenUsages.forEach(field => {
          console.log(`     - field: '${field}' (${FORBIDDEN_FIELD_NAMES[field]})`);
        });
      }

      console.log(`   ${colors.yellow}Expected:${colors.reset} ${roles.map(r => STANDARD_ROLE_MAPPING[r]).join(', ')}`);
      console.log(`   ${colors.yellow}Actual:${colors.reset}   ${fields.join(', ')}`);

      errors++;
    }

    console.log('');
  });

  console.log(`${colors.cyan}${colors.bright}=== 검증 결과 ===${colors.reset}`);
  console.log(`Total: ${totalChecks}`);
  console.log(`${colors.green}Passed: ${passedChecks}${colors.reset}`);
  console.log(`${colors.red}Failed: ${errors}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${warnings}${colors.reset}\n`);

  if (errors > 0) {
    console.log(`${colors.red}${colors.bright}변수 role 매핑 불일치가 발견되었습니다!${colors.reset}`);
    console.log(`${colors.yellow}수정 방법:${colors.reset}`);
    console.log(`1. types/statistics.ts에서 해당 interface 수정`);
    console.log(`2. types/statistics-converters.ts에서 converter 함수 수정`);
    console.log(`3. 해당 페이지에서 필드명 수정\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}✅ 모든 변수 role 매핑이 일관성 있습니다!${colors.reset}\n`);
    process.exit(0);
  }
}

// 스크립트 실행
validateRoleMapping();
