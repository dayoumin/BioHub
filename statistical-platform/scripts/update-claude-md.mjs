import { readFileSync, writeFileSync } from 'fs';

const filePath = '../CLAUDE.md';
let content = readFileSync(filePath, 'utf8');

// 1. 개발 명령어: npm → pnpm
content = content.replace(
  `\`\`\`bash
npm run dev          # 개발 서버
npm run build        # 빌드 (Vercel 클라우드용)
npm run build:offline # 빌드 (로컬 오프라인용)
npm test             # 테스트
npx tsc --noEmit     # 타입 체크

# 오프라인 배포 사전 준비
npm run setup:pyodide    # Pyodide 다운로드 (200MB)
\`\`\``,
  `\`\`\`bash
pnpm dev             # 개발 서버
pnpm build           # 빌드 (Vercel 클라우드용)
pnpm build:offline   # 빌드 (로컬 오프라인용)
pnpm test            # 테스트
pnpm tsc --noEmit    # 타입 체크

# 오프라인 배포 사전 준비
pnpm setup:pyodide   # Pyodide 다운로드 (200MB)
\`\`\``
);

// 2. 테스트 실행 명령어: npm → pnpm
content = content.replace(
  `\`\`\`bash
npm test              # 모든 테스트 (Vitest)
npm test [파일명]     # 특정 파일
npm run test:watch    # watch 모드
npm run test:coverage # 커버리지
npm run test:jest     # Jest (성능 테스트 전용)
\`\`\``,
  `\`\`\`bash
pnpm test             # 모든 테스트 (Vitest)
pnpm test [파일명]    # 특정 파일
pnpm test:watch       # watch 모드
pnpm test:coverage    # 커버리지
pnpm test:jest        # Jest (성능 테스트 전용)
\`\`\``
);

// 3. 검증 명령어: npm/npx → pnpm
content = content.replaceAll('npx tsc --noEmit', 'pnpm tsc --noEmit');
content = content.replaceAll('npm run build', 'pnpm build');
content = content.replaceAll('npm test', 'pnpm test');
content = content.replaceAll('npm run dev', 'pnpm dev');

// 4. Python Worker 명명 규칙 보완 (섹션 7에 추가)
const oldNamingSection = `**Python Worker I/O 규칙 (CRITICAL)**:
- ✅ **함수 파라미터**: \`camelCase\` (외부 인터페이스)
- ✅ **반환값 딕셔너리 키**: \`camelCase\` (외부 인터페이스)
- ✅ **TypeScript 타입 정의**: \`camelCase\`
- ⚠️ **Python 내부 로컬 변수**: \`snake_case\` (PEP8 준수)`;

const newNamingSection = `**Python Worker I/O 규칙 (CRITICAL)**:
- ✅ **함수 파라미터**: \`camelCase\` (외부 인터페이스)
- ✅ **반환값 딕셔너리 키**: \`camelCase\` (외부 인터페이스)
- ✅ **TypeScript 타입 정의**: \`camelCase\`
- ⚠️ **Python 함수명**: \`snake_case\` 유지 (Python PEP8 컨벤션)
- ⚠️ **Python 내부 로컬 변수**: \`snake_case\` (PEP8 준수)
- ⚠️ **TypeScript에서 Python 함수 호출**: 함수명 문자열은 \`snake_case\` 유지
  - 예: \`callWorkerMethod(2, 'chi_square_test', {...})\`
- 🧪 **자동 검증**: \`__tests__/naming-convention.test.ts\`가 위반 감지`;

content = content.replace(oldNamingSection, newNamingSection);

// 5. 자주 틀리는 표기 확장
const oldTable = `**⚠️ 자주 틀리는 표기**:
| 올바른 표기 | 잘못된 표기 | 비고 |
|------------|------------|------|
| \`cohensD\` | \`cohens_d\`, \`cohen_d\` | 효과크기 |
| \`timeseries\` | \`time-series\` | 카테고리명 |
| \`pValue\` | \`pvalue\`, \`p_value\` | 유의확률 |
| \`rSquared\` | \`r_squared\`, \`rsquared\` | 결정계수 |
| \`fStatistic\` | \`f_statistic\` | F 통계량 |`;

const newTable = `**⚠️ 자주 틀리는 표기**:
| 올바른 표기 | 잘못된 표기 | 비고 |
|------------|------------|------|
| \`cohensD\` | \`cohens_d\`, \`cohen_d\` | 효과크기 |
| \`etaSquared\` | \`eta_squared\` | ANOVA 효과크기 |
| \`pValue\` | \`pvalue\`, \`p_value\` | 유의확률 |
| \`rSquared\` | \`r_squared\`, \`rsquared\` | 결정계수 |
| \`fStatistic\` | \`f_statistic\` | F 통계량 |
| \`stdError\` | \`std_error\` | 표준오차 |
| \`adjRSquared\` | \`adj_r_squared\` | 수정 결정계수 |
| \`durbinWatson\` | \`durbin_watson\` | 자기상관 검정 |
| \`timeseries\` | \`time-series\` | 카테고리명 |`;

content = content.replace(oldTable, newTable);

writeFileSync(filePath, content, 'utf8');
console.log('✅ CLAUDE.md 업데이트 완료');
